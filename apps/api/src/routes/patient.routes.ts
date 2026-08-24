import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  bookingCreateSchema,
  reviewCreateSchema,
} from "@wishubest/shared";
import { db } from "../db/client.js";
import {
  bookings,
  invoiceItems,
  invoices,
  payments,
  providerProfiles,
  reviews,
  serviceSlots,
  services,
  users,
} from "../db/schema.js";
import { requireRole, requireAuth } from "../lib/sessions.js";
import { newBookingCode, bookingExpiryDate, expireStaleBookings } from "../lib/bookings.js";
import { getActiveCurrency } from "../lib/invoices.js";
import { gateway } from "../lib/payments/stripe.js";
import { simulatedModeEnabled, createSimulatedCheckout } from "../lib/payments/simulate.js";
import { mails } from "../lib/mailer.js";
import { env } from "../config.js";

const ACTIVE_HOLD_STATUSES = ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"] as const;

async function emailOfUser(userId: string): Promise<string> {
  const rows = await db().db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.email ?? "";
}

export async function registerPatientRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.routeOptions?.url?.startsWith("/bookings") || req.routeOptions?.url?.startsWith("/invoices") || req.routeOptions?.url?.startsWith("/reviews")) {
      await requireAuth(req, reply);
    }
  });

  // ---------- create booking request ----------
  app.post(
    "/bookings",
    { preHandler: [requireRole("patient")] },
    async (req, reply) => {
      await expireStaleBookings();
      const input = bookingCreateSchema.parse(req.body);

      const svcRows = await db().db
        .select({
          service: services,
          providerId: providerProfiles.id,
          providerUserId: providerProfiles.userId,
          providerName: providerProfiles.displayName,
          providerStatus: providerProfiles.status,
          kyc: providerProfiles.kycStatus,
        })
        .from(services)
        .innerJoin(providerProfiles, eq(providerProfiles.id, services.providerId))
        .where(eq(services.id, input.serviceId))
        .limit(1);
      const hit = svcRows[0];
      if (!hit) return reply.code(404).send({ error: "service_not_found" });
      if (hit.service.status !== "active" || hit.providerStatus !== "active" || hit.kyc !== "approved") {
        return reply.code(409).send({ error: "service_not_bookable" });
      }

      let scheduledAt: Date | null = null;
      let slotId: string | null = null;

      const created = await db().db.transaction(async (tx) => {
        if (input.slotId) {
          const slotRows = await tx
            .select()
            .from(serviceSlots)
            .where(and(eq(serviceSlots.id, input.slotId), eq(serviceSlots.serviceId, hit.service.id)))
            .for("update")
            .limit(1);
          const slot = slotRows[0];
          if (!slot || slot.status !== "open" || slot.startsAt.getTime() < Date.now()) {
            throw Object.assign(new Error("slot_unavailable"), { statusCode: 409 });
          }
          const conflicts = await tx
            .select({ id: bookings.id })
            .from(bookings)
            .where(
              and(eq(bookings.slotId, slot.id), inArray(bookings.status, [...ACTIVE_HOLD_STATUSES])),
            )
            .limit(1);
          if (conflicts[0]) throw Object.assign(new Error("slot_unavailable"), { statusCode: 409 });
          slotId = slot.id;
          scheduledAt = slot.startsAt;
        } else {
          const ts = input.scheduledAt ? new Date(input.scheduledAt) : null;
          if (!ts || Number.isNaN(ts.getTime()) || ts.getTime() < Date.now() + 3600 * 1000) {
            throw Object.assign(new Error("invalid_scheduled_at"), { statusCode: 422 });
          }
          scheduledAt = ts;
        }

        const rows = await tx
          .insert(bookings)
          .values({
            code: newBookingCode(),
            patientId: req.user!.id,
            providerId: hit.providerId,
            serviceId: hit.service.id,
            slotId,
            status: "REQUESTED",
            scheduledAt,
            patientNote: input.patientNote,
            requestedAt: new Date(),
            expiresAt: bookingExpiryDate(),
          })
          .returning();
        return rows[0]!;
      });

      void mails.bookingRequested(await emailOfUser(req.user!.id), created.code, hit.providerName);
      void mails.bookingNewRequest(await emailOfUser(hit.providerUserId), created.code, req.user!.displayName ?? req.user!.email);

      return reply.code(201).send({ booking: created });
    },
  );

  // ---------- my bookings ----------
  app.get("/bookings", { preHandler: [requireRole("patient")] }, async (req) => {
    await expireStaleBookings();
    const rows = await db().db
      .select({
        booking: bookings,
        providerName: providerProfiles.displayName,
        providerSlug: providerProfiles.slug,
        serviceTitle: services.title,
        invoiceNumber: invoices.number,
        invoiceStatus: invoices.status,
        invoiceTotalMinor: invoices.totalMinor,
        invoiceId: invoices.id,
      })
      .from(bookings)
      .innerJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .leftJoin(invoices, eq(invoices.bookingId, bookings.id))
      .where(eq(bookings.patientId, req.user!.id))
      .orderBy(desc(bookings.createdAt))
      .limit(100);
    return { items: rows };
  });

  app.get("/bookings/:id", { preHandler: [requireRole("patient")] }, async (req, reply) => {
    await expireStaleBookings();
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const rows = await db().db
      .select({
        booking: bookings,
        providerName: providerProfiles.displayName,
        providerSlug: providerProfiles.slug,
        serviceTitle: services.title,
        serviceMode: services.serviceMode,
        durationMinutes: services.durationMinutes,
      })
      .from(bookings)
      .innerJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .where(and(eq(bookings.id, id), eq(bookings.patientId, req.user!.id)))
      .limit(1);
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: "not_found" });

    const invRows = await db().db
      .select()
      .from(invoices)
      .where(eq(invoices.bookingId, id))
      .limit(1);
    const invoice = invRows[0];
    let items: unknown[] = [];
    if (invoice) {
      items = await db().db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    }
    const revRows = await db().db
      .select({ id: reviews.id, status: reviews.status })
      .from(reviews)
      .where(eq(reviews.bookingId, id))
      .limit(1);

    return { ...row, invoice, items, review: revRows[0] ?? null };
  });

  // ---------- patient cancel ----------
  app.post("/bookings/:id/cancel", { preHandler: [requireRole("patient")] }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({ reason: z.string().trim().max(500).default("") }).parse(req.body ?? {});
    const updated = await db().db.transaction(async (tx) => {
      const bkRows = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, id), eq(bookings.patientId, req.user!.id)))
        .for("update")
        .limit(1);
      const booking = bkRows[0];
      if (!booking) throw Object.assign(new Error("not_found"), { statusCode: 404 });
      if (!["REQUESTED", "AWAITING_PAYMENT"].includes(booking.status)) {
        throw Object.assign(new Error("invalid_state"), { statusCode: 409 });
      }
      const rows = await tx
        .update(bookings)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: body.reason || "cancelled_by_patient",
          updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, booking.id), eq(bookings.status, booking.status)))
        .returning();
      await tx
        .update(invoices)
        .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
        .where(and(eq(invoices.bookingId, booking.id), eq(invoices.status, "PENDING_PAYMENT")));
      return rows[0]!;
    });
    return { booking: updated };
  });

  // ---------- invoices ----------
  app.get("/invoices", { preHandler: [requireRole("patient")] }, async (req) => {
    const cur = await getActiveCurrency();
    const rows = await db().db
      .select({
        invoice: {
          id: invoices.id,
          number: invoices.number,
          status: invoices.status,
          totalMinor: invoices.totalMinor,
          currencyIso: invoices.currencyIso,
          issuedAt: invoices.issuedAt,
          paidAt: invoices.paidAt,
        },
        bookingCode: bookings.code,
        bookingId: bookings.id,
        providerName: providerProfiles.displayName,
      })
      .from(invoices)
      .innerJoin(bookings, eq(bookings.id, invoices.bookingId))
      .innerJoin(providerProfiles, eq(providerProfiles.id, invoices.providerId))
      .where(eq(invoices.patientId, req.user!.id))
      .orderBy(desc(invoices.createdAt))
      .limit(100);
    return { items: rows, currency: cur };
  });

  app.get("/invoices/:id", { preHandler: [requireRole("patient")] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const invRows = await db().db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.patientId, req.user!.id)))
      .limit(1);
    const invoice = invRows[0];
    if (!invoice) return reply.code(404).send({ error: "not_found" });
    const items = await db().db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    const payRows = await db().db
      .select({ id: payments.id, status: payments.status, createdAt: payments.createdAt })
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.createdAt));
    return { invoice, items, payments: payRows };
  });

  // ---------- checkout ----------
  app.post(
    "/invoices/:id/checkout",
    {
      preHandler: [requireRole("patient")],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      const gw = gateway();

      // Test-only simulated checkout (env-gated; never active with real keys).
      if (!gw && simulatedModeEnabled()) {
        const url = await createSimulatedCheckout(id);
        if (!url) return reply.code(404).send({ error: "not_found" });
        return { checkoutUrl: `${env().APP_URL.replace(/\/$/, "")}${url}`, simulated: true };
      }

      if (!gw) return reply.code(503).send({ error: "payments_not_configured" });

      const invRows = await db().db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.patientId, req.user!.id)))
        .limit(1);
      const invoice = invRows[0];
      if (!invoice) return reply.code(404).send({ error: "not_found" });
      if (invoice.status !== "PENDING_PAYMENT") {
        return reply.code(409).send({ error: "invoice_not_payable" });
      }

      try {
        const checkout = await gw.createCheckout({
          invoiceNumber: invoice.number,
          amountMinor: invoice.totalMinor,
          currencyIso: invoice.currencyIso,
          description: `Booking payment — ${invoice.number}`,
          customerEmail: req.user!.email,
          successUrl: `${env().APP_URL}/en/dashboard/bookings?paid=1&invoice=${invoice.id}`,
          cancelUrl: `${env().APP_URL}/en/dashboard/invoices?canceled=1`,
          metadata: { invoice_id: invoice.id, patient_id: req.user!.id },
        });
        const inserted = await db().db
          .insert(payments)
          .values({
            invoiceId: invoice.id,
            gateway: gw.name,
            gatewayRef: checkout.gatewayRef,
            checkoutUrl: checkout.checkoutUrl,
            amountMinor: invoice.totalMinor,
            currencyIso: invoice.currencyIso,
            status: "PROCESSING",
          })
          .returning();
        return { checkoutUrl: checkout.checkoutUrl, paymentId: inserted[0]!.id };
      } catch (err) {
        req.log.error(err);
        return reply.code(502).send({ error: "gateway_error" });
      }
    },
  );

  // ---------- verified review ----------
  app.post("/reviews", { preHandler: [requireRole("patient")] }, async (req, reply) => {
    const input = reviewCreateSchema.parse(req.body);
    const bkRows = await db().db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.patientId, req.user!.id)))
      .limit(1);
    const booking = bkRows[0];
    if (!booking) return reply.code(404).send({ error: "not_found" });

    const invRows = await db().db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.bookingId, booking.id))
      .limit(1);
    if (booking.status !== "COMPLETED" || invRows[0]?.status !== "PAID") {
      return reply.code(409).send({ error: "review_not_allowed" });
    }
    const dup = await db().db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, booking.id))
      .limit(1);
    if (dup[0]) return reply.code(409).send({ error: "already_reviewed" });

    const inserted = await db().db
      .insert(reviews)
      .values({
        bookingId: booking.id,
        patientId: req.user!.id,
        providerId: booking.providerId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        status: "pending",
      })
      .returning();
    return reply.code(201).send({ review: inserted[0] });
  });
}
