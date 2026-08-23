import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import {
  providerProfileUpsertSchema,
  serviceUpsertSchema,
  slotBaseSchema,
  meetingLinkSchema,
  bookingProviderActionSchema,
} from "@wishubest/shared";
import { db } from "../db/client.js";
import {
  bookings,
  invoices,
  kycDocuments,
  providerProfiles,
  serviceSlots,
  services,
} from "../db/schema.js";
import { requireRole } from "../lib/sessions.js";
import { audit } from "../lib/audit.js";
import { storage, validateKycUpload, sniffMime, newKycKey } from "../lib/storage.js";
import { issueInvoiceForBooking, getActiveCurrency } from "../lib/invoices.js";
import { expireStaleBookings } from "../lib/bookings.js";

async function myProvider(userId: string) {
  const rows = await db().db
    .select()
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 100) || "provider";
}

export async function registerProviderRoutes(app: FastifyInstance) {
  // ---------- profile ----------
  app.get("/provider/profile", { preHandler: [requireRole("provider")] }, async (req) => {
    return { profile: await myProvider(req.user!.id) };
  });

  app.put("/provider/profile", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const input = providerProfileUpsertSchema.parse(req.body);
    const existing = await myProvider(req.user!.id);
    if (!existing) {
      // First save — create the profile in draft.
      let slug = input.slug ?? slugify(input.displayName);
      for (let i = 0; i < 5; i++) {
        const clash = await db().db
          .select({ id: providerProfiles.id })
          .from(providerProfiles)
          .where(eq(providerProfiles.slug, slug))
          .limit(1);
        if (!clash[0]) break;
        slug = `${slugify(input.displayName)}-${Math.random().toString(36).slice(2, 6)}`;
      }
      if (input.cityId && !input.countryId) {
        return reply.code(422).send({ error: "city_requires_country" });
      }
      const inserted = await db().db
        .insert(providerProfiles)
        .values({
          userId: req.user!.id,
          providerType: input.providerType,
          displayName: input.displayName,
          slug,
          summary: input.summary,
          description: input.description,
          countryId: input.countryId ?? null,
          cityId: input.cityId ?? null,
          addressLine: input.addressLine,
          photoUrl: input.photoUrl ?? null,
        })
        .returning();
      await audit({
        actorId: req.user!.id,
        actorRole: "provider",
        action: "provider.profile.create",
        entityType: "provider_profile",
        entityId: inserted[0]!.id,
        ip: req.ip,
      });
      return reply.code(201).send({ profile: inserted[0] });
    }

    // Edits after approval keep status; going back to pending_review is explicit.
    const updated = await db().db
      .update(providerProfiles)
      .set({
        providerType: input.providerType,
        displayName: input.displayName,
        summary: input.summary,
        description: input.description,
        countryId: input.countryId ?? existing.countryId,
        cityId: input.cityId ?? null,
        addressLine: input.addressLine,
        photoUrl: input.photoUrl ?? existing.photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, existing.id))
      .returning();
    await audit({
      actorId: req.user!.id,
      actorRole: "provider",
      action: "provider.profile.update",
      entityType: "provider_profile",
      entityId: existing.id,
      ip: req.ip,
    });
    return { profile: updated[0] };
  });

  app.post("/provider/submit-for-review", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(409).send({ error: "profile_incomplete" });
    if (!["draft", "rejected"].includes(p.status)) {
      return reply.code(409).send({ error: "invalid_state" });
    }
    const complete =
      p.displayName.length >= 2 && p.addressLine.length > 0 && p.countryId !== null;
    if (!complete) return reply.code(422).send({ error: "profile_incomplete" });
    const updated = await db().db
      .update(providerProfiles)
      .set({ status: "pending_review", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(providerProfiles.id, p.id))
      .returning();
    await audit({
      actorId: req.user!.id,
      actorRole: "provider",
      action: "provider.submit_for_review",
      entityType: "provider_profile",
      entityId: p.id,
      ip: req.ip,
    });
    return { profile: updated[0] };
  });

  // ---------- KYC ----------
  app.post(
    "/provider/kyc/documents",
    { preHandler: [requireRole("provider")], config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const p = await myProvider(req.user!.id);
      if (!p) return reply.code(409).send({ error: "create_profile_first" });

      const file = await req.file();
      if (!file) return reply.code(422).send({ error: "file_required" });
      const buf = await file.toBuffer();
      const declared = file.mimetype;
      const sniffed = sniffMime(buf);
      if (!sniffed || sniffed !== declared) {
        return reply.code(422).send({ error: `invalid_file_type:${declared}` });
      }
      const sizeErr = validateKycUpload(declared, buf.length);
      if (sizeErr) return reply.code(422).send({ error: sizeErr });

      const fieldVal = (name: string): string => {
        const f = file.fields[name];
        if (!f) return "";
        const v = Array.isArray(f) ? f[0] : f;
        if (!v || !("value" in v)) return "";
        return String(v.value ?? "");
      };
      const kind = fieldVal("kind") || "other";
      const title = fieldVal("title").trim().slice(0, 160);
      if (title.length < 2) return reply.code(422).send({ error: "title_required" });
      if (!["passport", "id_card", "license", "diploma", "other"].includes(kind)) {
        return reply.code(422).send({ error: "invalid_kind" });
      }

      const key = newKycKey(p.id, file.filename);
      await storage.put(key, buf, declared);
      const inserted = await db().db
        .insert(kycDocuments)
        .values({
          providerId: p.id,
          kind,
          title,
          fileKey: key,
          originalName: file.filename.slice(0, 255),
          mimeType: declared,
          sizeBytes: buf.length,
          status: "submitted",
        })
        .returning();

      if (p.kycStatus === "not_started" || p.kycStatus === "rejected") {
        await db().db
          .update(providerProfiles)
          .set({ kycStatus: "submitted", updatedAt: new Date() })
          .where(eq(providerProfiles.id, p.id));
      }
      await audit({
        actorId: req.user!.id,
        actorRole: "provider",
        action: "kyc.upload",
        entityType: "kyc_document",
        entityId: inserted[0]!.id,
        ip: req.ip,
      });
      return reply.code(201).send({ document: { ...inserted[0], fileKey: undefined } });
    },
  );

  app.get("/provider/kyc/documents", { preHandler: [requireRole("provider")] }, async (req) => {
    const p = await myProvider(req.user!.id);
    if (!p) return { items: [] };
    return db().db
      .select({
        id: kycDocuments.id,
        kind: kycDocuments.kind,
        title: kycDocuments.title,
        originalName: kycDocuments.originalName,
        mimeType: kycDocuments.mimeType,
        sizeBytes: kycDocuments.sizeBytes,
        status: kycDocuments.status,
        reviewNote: kycDocuments.reviewNote,
        reviewedAt: kycDocuments.reviewedAt,
        createdAt: kycDocuments.createdAt,
      })
      .from(kycDocuments)
      .where(eq(kycDocuments.providerId, p.id))
      .orderBy(desc(kycDocuments.createdAt));
  });

  // ---------- services ----------
  app.get("/provider/services", { preHandler: [requireRole("provider")] }, async (req) => {
    const p = await myProvider(req.user!.id);
    if (!p) return { items: [], currency: await getActiveCurrency() };
    const rows = await db().db
      .select()
      .from(services)
      .where(eq(services.providerId, p.id))
      .orderBy(desc(services.createdAt));
    return { items: rows, currency: await getActiveCurrency() };
  });

  app.post("/provider/services", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(409).send({ error: "create_profile_first" });
    const input = serviceUpsertSchema.parse(req.body);
    const cur = await getActiveCurrency();
    const { toMinor } = await import("@wishubest/shared");
    let priceMinor: number;
    try {
      priceMinor = toMinor(input.priceMajor, cur.decimalPlaces);
    } catch {
      return reply.code(422).send({ error: "invalid_price" });
    }
    if (priceMinor <= 0) return reply.code(422).send({ error: "invalid_price" });
    const inserted = await db().db
      .insert(services)
      .values({
        providerId: p.id,
        categoryId: input.categoryId ?? null,
        title: input.title,
        description: input.description,
        serviceMode: input.serviceMode,
        pricingModel: "fixed",
        priceAmountMinor: priceMinor,
        durationMinutes: input.durationMinutes,
        status: input.status,
      })
      .returning();
    return reply.code(201).send({ service: inserted[0] });
  });

  app.put("/provider/services/:id", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    const input = serviceUpsertSchema.parse(req.body);
    const cur = await getActiveCurrency();
    const { toMinor } = await import("@wishubest/shared");
    let priceMinor: number;
    try {
      priceMinor = toMinor(input.priceMajor, cur.decimalPlaces);
    } catch {
      return reply.code(422).send({ error: "invalid_price" });
    }
    const updated = await db().db
      .update(services)
      .set({
        categoryId: input.categoryId ?? null,
        title: input.title,
        description: input.description,
        serviceMode: input.serviceMode,
        priceAmountMinor: priceMinor,
        durationMinutes: input.durationMinutes,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(and(eq(services.id, id), eq(services.providerId, p.id)))
      .returning();
    if (!updated[0]) return reply.code(404).send({ error: "not_found" });
    return { service: updated[0] };
  });

  // ---------- slots (online services) ----------
  app.get("/provider/slots", { preHandler: [requireRole("provider")] }, async (req) => {
    const q = z.object({ serviceId: z.string().uuid().optional() }).parse(req.query);
    const p = await myProvider(req.user!.id);
    if (!p) return { items: [] };
    const conds = [eq(serviceSlots.providerId, p.id)];
    if (q.serviceId) conds.push(eq(serviceSlots.serviceId, q.serviceId));
    return {
      items: await db().db
        .select()
        .from(serviceSlots)
        .where(and(...conds))
        .orderBy(desc(serviceSlots.startsAt))
        .limit(200),
    };
  });

  app.post("/provider/slots", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const bodySchema = slotBaseSchema.extend({ serviceId: z.string().uuid() });
    const input = bodySchema.parse(req.body);
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(409).send({ error: "create_profile_first" });
    const svcRows = await db().db
      .select()
      .from(services)
      .where(and(eq(services.id, input.serviceId), eq(services.providerId, p.id)))
      .limit(1);
    const svc = svcRows[0];
    if (!svc || svc.serviceMode === "in_person") {
      return reply.code(422).send({ error: "slots_apply_to_online_services_only" });
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const overlap = await db().db
      .select({ id: serviceSlots.id })
      .from(serviceSlots)
      .where(
        and(
          eq(serviceSlots.providerId, p.id),
          ne(serviceSlots.status, "cancelled"),
          sql`tsrange(${serviceSlots.startsAt}, ${serviceSlots.endsAt}) && tsrange(${startsAt.toISOString()}::timestamptz, ${endsAt.toISOString()}::timestamptz)`,
        ),
      )
      .limit(1);
    if (overlap[0]) return reply.code(409).send({ error: "slot_overlap" });
    const inserted = await db().db
      .insert(serviceSlots)
      .values({ providerId: p.id, serviceId: svc.id, startsAt, endsAt })
      .returning();
    return reply.code(201).send({ slot: inserted[0] });
  });

  app.delete("/provider/slots/:id", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    const updated = await db().db
      .update(serviceSlots)
      .set({ status: "cancelled" })
      .where(and(eq(serviceSlots.id, id), eq(serviceSlots.providerId, p.id), eq(serviceSlots.status, "open")))
      .returning();
    if (!updated[0]) return reply.code(409).send({ error: "slot_not_cancellable" });
    return { ok: true };
  });

  // ---------- bookings ----------
  app.get("/provider/bookings", { preHandler: [requireRole("provider")] }, async (req) => {
    await expireStaleBookings();
    const p = await myProvider(req.user!.id);
    if (!p) return { items: [] };
    const rows = await db().db
      .select({
        booking: bookings,
        patientEmail: sql<string>`(select email from users where users.id = ${bookings.patientId})`,
        patientName: sql<string>`(select coalesce(display_name, email) from users where users.id = ${bookings.patientId})`,
        serviceTitle: services.title,
        invoiceNumber: invoices.number,
        invoiceStatus: invoices.status,
        invoiceTotalMinor: invoices.totalMinor,
      })
      .from(bookings)
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .leftJoin(invoices, eq(invoices.bookingId, bookings.id))
      .where(eq(bookings.providerId, p.id))
      .orderBy(desc(bookings.createdAt))
      .limit(100);
    return { items: rows };
  });

  app.post("/provider/bookings/:id/action", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const input = bookingProviderActionSchema.parse(req.body);
    await expireStaleBookings();
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(403).send({ error: "forbidden" });

    try {
      const result = await db().db.transaction(async (tx) => {
        const bkRows = await tx
          .select()
          .from(bookings)
          .where(and(eq(bookings.id, id), eq(bookings.providerId, p.id)))
          .for("update")
          .limit(1);
        const booking = bkRows[0];
        if (!booking) throw Object.assign(new Error("not_found"), { statusCode: 404 });

        if (input.action === "confirm") {
          if (booking.status !== "REQUESTED") {
            throw Object.assign(new Error("invalid_state"), { statusCode: 409 });
          }
          await tx
            .update(bookings)
            .set({
              status: "AWAITING_PAYMENT",
              confirmedAt: new Date(),
              meetingLink: input.meetingLink ?? null,
              updatedAt: new Date(),
            })
            .where(and(eq(bookings.id, booking.id), eq(bookings.status, "REQUESTED")));
          // Invoice issued at confirmation with a full price snapshot (same tx).
          const inv = await issueInvoiceForBooking(booking.id, tx);
          return { action: input.action, bookingCode: booking.code, invoice: inv };
        }
        if (input.action === "decline") {
          if (booking.status !== "REQUESTED") {
            throw Object.assign(new Error("invalid_state"), { statusCode: 409 });
          }
          await tx
            .update(bookings)
            .set({
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancellationReason: input.reason.slice(0, 500),
              updatedAt: new Date(),
            })
            .where(and(eq(bookings.id, booking.id), eq(bookings.status, "REQUESTED")));
          return { action: input.action, bookingCode: booking.code };
        }
        if (input.action === "complete") {
          if (booking.status !== "CONFIRMED") {
            throw Object.assign(new Error("invalid_state"), { statusCode: 409 });
          }
          await tx
            .update(bookings)
            .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(bookings.id, booking.id), eq(bookings.status, "CONFIRMED")));
          return { action: input.action, bookingCode: booking.code };
        }
        // no_show
        if (booking.status !== "CONFIRMED") {
          throw Object.assign(new Error("invalid_state"), { statusCode: 409 });
        }
        await tx
          .update(bookings)
          .set({ status: "NO_SHOW", completedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(bookings.id, booking.id), eq(bookings.status, "CONFIRMED")));
        return { action: input.action, bookingCode: booking.code };
      });

      await audit({
        actorId: req.user!.id,
        actorRole: "provider",
        action: `booking.${input.action}`,
        entityType: "booking",
        entityId: id,
        changes: input.action === "decline" ? { reason: input.reason } : undefined,
        ip: req.ip,
      });
      return result;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      if (status < 500) return reply.code(status).send({ error: (err as Error).message });
      throw err;
    }
  });

  app.put("/provider/bookings/:id/meeting-link", { preHandler: [requireRole("provider")] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const input = meetingLinkSchema.parse(req.body);
    const p = await myProvider(req.user!.id);
    if (!p) return reply.code(403).send({ error: "forbidden" });
    const updated = await db().db
      .update(bookings)
      .set({ meetingLink: input.meetingLink, updatedAt: new Date() })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.providerId, p.id),
          inArray(bookings.status, ["AWAITING_PAYMENT", "CONFIRMED"]),
        ),
      )
      .returning({ id: bookings.id, meetingLink: bookings.meetingLink });
    if (!updated[0]) return reply.code(409).send({ error: "meeting_link_not_allowed" });
    return { booking: updated[0] };
  });
}
