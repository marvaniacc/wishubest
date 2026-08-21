import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { bookingRequestSchema, uuidSchema } from "@wishubest/shared";
import { db } from "../db/client.js";
import { bookings, invoices, invoiceItems, providerProfiles, services, users } from "../db/schema.js";
import { httpError } from "../lib/httpError.js";
import { requireAuth } from "./guards.js";
import { audit } from "../lib/audit.js";
import { sendBookingConfirmedEmail, sendBookingRequestedEmail } from "../lib/mailer.js";
import { getActiveCurrency } from "./catalog.js";

export async function bookingRoutes(app: FastifyInstance): Promise<void> {
  // ── patient creates a booking request ──
  app.post("/bookings", async (request, reply) => {
    const user = requireAuth(request);
    if (user.role !== "patient") throw httpError(403, "FORBIDDEN", "Only patients can request bookings");

    const input = bookingRequestSchema.parse(request.body);

    const svcRows = await db
      .select({
        s: services,
        providerId: providerProfiles.id,
        providerName: providerProfiles.displayName,
        providerUserId: providerProfiles.userId,
        providerStatus: providerProfiles.status,
      })
      .from(services)
      .innerJoin(providerProfiles, eq(providerProfiles.id, services.providerProfileId))
      .where(eq(services.id, input.serviceId))
      .limit(1);
    const row = svcRows[0];
    if (!row || row.s.status !== "active") throw httpError(404, "NOT_FOUND", "Service not found or inactive");
    if (row.providerStatus !== "active") throw httpError(409, "PROVIDER_INACTIVE", "Provider is not accepting bookings");

    const needsSlot = row.s.serviceMode !== "in_person";
    const requestedStartAt = input.requestedStartAt ? new Date(input.requestedStartAt) : null;
    if (needsSlot && !requestedStartAt) {
      throw httpError(422, "SLOT_REQUIRED", "Online/hybrid services require a start time");
    }
    if (requestedStartAt && Number.isNaN(requestedStartAt.getTime())) {
      throw httpError(422, "BAD_TIME", "Invalid start time");
    }

    const [booking] = await db
      .insert(bookings)
      .values({
        patientId: user.id,
        providerId: row.providerId,
        serviceId: row.s.id,
        status: "REQUESTED",
        requestedStartAt,
        patientNotes: input.patientNotes ?? null,
      })
      .returning();

    // notify provider (async, never blocks)
    const providerUser = (await db.select().from(users).where(eq(users.id, row.providerUserId)).limit(1))[0];
    if (providerUser) {
      void sendBookingRequestedEmail(providerUser.email, user.fullName, row.providerName, row.s.title);
    }

    audit(user, "booking.requested", "booking", booking!.id, { serviceId: row.s.id });
    reply.code(201).send({ booking: { id: booking!.id, status: booking!.status } });
  });

  // ── patient lists own bookings ──
  app.get("/patient/bookings", async (request) => {
    const user = requireAuth(request);
    const rows = await db
      .select({
        b: bookings,
        serviceTitle: services.title,
        serviceMode: services.serviceMode,
        providerName: providerProfiles.displayName,
        providerSlug: providerProfiles.slug,
        invoiceId: invoices.id,
        invoiceStatus: invoices.status,
      })
      .from(bookings)
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .innerJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
      .leftJoin(invoices, eq(invoices.bookingId, bookings.id))
      .where(eq(bookings.patientId, user.id))
      .orderBy(desc(bookings.createdAt))
      .limit(200);
    return {
      bookings: rows.map((r) => ({
        id: r.b.id,
        status: r.b.status,
        serviceId: r.b.serviceId,
        serviceTitle: r.serviceTitle,
        serviceMode: r.serviceMode,
        providerId: r.b.providerId,
        providerName: r.providerName,
        providerSlug: r.providerSlug,
        patientId: r.b.patientId,
        patientName: user.fullName,
        requestedStartAt: r.b.requestedStartAt?.toISOString() ?? null,
        meetingLink: r.b.meetingLink,
        patientNotes: r.b.patientNotes,
        providerNotes: r.b.providerNotes,
        createdAt: r.b.createdAt.toISOString(),
        updatedAt: r.b.updatedAt.toISOString(),
        invoiceId: r.invoiceId,
      })),
    };
  });

  // ── provider confirms / declines a booking ──
  const providerActionSchema = z.object({
    action: z.enum(["confirm", "decline", "cancel", "complete", "no_show", "set_meeting_link"]),
    meetingLink: z.string().url().max(500).optional(),
    providerNotes: z.string().max(2000).optional(),
  });

  app.post("/provider/bookings/:id/actions", async (request) => {
    const user = requireAuth(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = providerActionSchema.parse(request.body);

    const rows = await db
      .select({
        b: bookings,
        serviceTitle: services.title,
        serviceMode: services.serviceMode,
        providerUserId: providerProfiles.userId,
        providerName: providerProfiles.displayName,
      })
      .from(bookings)
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .innerJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
      .where(eq(bookings.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) throw httpError(404, "NOT_FOUND", "Booking not found");
    if (row.providerUserId !== user.id) throw httpError(403, "FORBIDDEN", "Not your booking");
    if (row.providerName === undefined) throw httpError(404, "NOT_FOUND", "Booking not found");

    const currency = await getActiveCurrency();
    if (!currency) throw httpError(500, "NO_CURRENCY", "Platform currency not configured");

    switch (input.action) {
      case "confirm": {
        if (row.b.status !== "REQUESTED") throw httpError(409, "INVALID_STATE", `Cannot confirm from ${row.b.status}`);
        // confirm → create invoice (PENDING_PAYMENT) with a line-item snapshot of the service price NOW
        const [invoice] = await db.transaction(async (tx) => {
          const svc = (await tx.select().from(services).where(eq(services.id, row.b.serviceId)).limit(1))[0]!;
          const number = await issueInvoiceNumber();
          const [inv] = await tx
            .insert(invoices)
            .values({
              number,
              bookingId: row.b.id,
              patientId: row.b.patientId,
              providerId: row.b.providerId,
              currencyIso: currency.isoCode,
              totalMinor: svc.priceAmountMinor, // quantity 1, fixed pricing (MVP)
              status: "PENDING_PAYMENT",
              issuedAt: new Date(),
            })
            .returning();
          await tx.insert(invoiceItems).values({
            invoiceId: inv!.id,
            serviceId: svc.id,
            description: svc.title, // snapshot
            quantity: 1,
            unitPriceMinor: svc.priceAmountMinor, // snapshot
            totalMinor: svc.priceAmountMinor,
          });
          await tx
            .update(bookings)
            .set({ status: "AWAITING_PAYMENT", updatedAt: new Date(), providerNotes: input.providerNotes ?? row.b.providerNotes })
            .where(eq(bookings.id, row.b.id));
          return [inv!];
        });

        // notify patient
        const patient = (await db.select().from(users).where(eq(users.id, row.b.patientId)).limit(1))[0];
        if (patient) {
          void sendBookingConfirmedEmail(patient.email, patient.fullName, row.providerName, row.serviceTitle, row.b.requestedStartAt?.toISOString() ?? null, invoice.id);
        }
        audit(user, "booking.confirmed", "booking", row.b.id, { invoiceId: invoice.id });
        return { ok: true, invoiceId: invoice.id, bookingStatus: "AWAITING_PAYMENT" };
      }

      case "decline":
      case "cancel": {
        const allowedFrom = input.action === "decline" ? ["REQUESTED"] : ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"];
        if (!allowedFrom.includes(row.b.status)) {
          throw httpError(409, "INVALID_STATE", `Cannot ${input.action} from ${row.b.status}`);
        }
        await db
          .update(bookings)
          .set({ status: input.action === "decline" ? "CANCELLED" : "CANCELLED", updatedAt: new Date(), providerNotes: input.providerNotes ?? row.b.providerNotes })
          .where(eq(bookings.id, row.b.id));
        // void any unpaid invoice
        await db
          .update(invoices)
          .set({ status: "VOID", updatedAt: new Date() })
          .where(and(eq(invoices.bookingId, row.b.id), eq(invoices.status, "PENDING_PAYMENT")));
        audit(user, `booking.${input.action}`, "booking", row.b.id);
        return { ok: true, bookingStatus: "CANCELLED" };
      }

      case "complete": {
        if (row.b.status !== "CONFIRMED") throw httpError(409, "INVALID_STATE", "Only CONFIRMED bookings can complete");
        await db.update(bookings).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(bookings.id, row.b.id));
        audit(user, "booking.completed", "booking", row.b.id);
        return { ok: true, bookingStatus: "COMPLETED" };
      }

      case "no_show": {
        if (row.b.status !== "CONFIRMED") throw httpError(409, "INVALID_STATE", "Only CONFIRMED bookings can be marked no-show");
        await db.update(bookings).set({ status: "NO_SHOW", updatedAt: new Date() }).where(eq(bookings.id, row.b.id));
        audit(user, "booking.no_show", "booking", row.b.id);
        return { ok: true, bookingStatus: "NO_SHOW" };
      }

      case "set_meeting_link": {
        if (!input.meetingLink) throw httpError(422, "LINK_REQUIRED", "meetingLink is required");
        if (row.b.status !== "CONFIRMED" && row.b.status !== "AWAITING_PAYMENT" && row.b.status !== "REQUESTED") {
          throw httpError(409, "INVALID_STATE", "Cannot set meeting link at this stage");
        }
        await db
          .update(bookings)
          .set({ meetingLink: input.meetingLink, updatedAt: new Date() })
          .where(eq(bookings.id, row.b.id));
        audit(user, "booking.meeting_link_set", "booking", row.b.id);
        return { ok: true };
      }
    }
  });

  // ── patient cancels own booking ──
  app.post("/patient/bookings/:id/cancel", async (request) => {
    const user = requireAuth(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const rows = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.patientId, user.id))).limit(1);
    const b = rows[0];
    if (!b) throw httpError(404, "NOT_FOUND", "Booking not found");
    if (!["REQUESTED", "AWAITING_PAYMENT"].includes(b.status)) {
      throw httpError(409, "INVALID_STATE", `Cannot cancel from ${b.status}`);
    }
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(bookings.id, b.id));
      await tx
        .update(invoices)
        .set({ status: "VOID", updatedAt: new Date() })
        .where(and(eq(invoices.bookingId, b.id), eq(invoices.status, "PENDING_PAYMENT")));
    });
    audit(user, "booking.cancelled_by_patient", "booking", b.id);
    return { ok: true };
  });
}

import { sql } from "drizzle-orm";

/** Invoice numbers come from a dedicated PG sequence — gap-free per attempt, race-free under concurrency. */
export async function issueInvoiceNumber(): Promise<string> {
  const result = await db.execute<{ number: string }>(
    sql`SELECT 'INV-' || lpad(nextval('invoice_number_seq')::text, 8, '0') AS number`,
  );
  return result.rows[0]!.number;
}
