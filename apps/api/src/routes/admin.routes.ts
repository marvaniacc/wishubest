import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  countryUpsertSchema,
  cityUpsertSchema,
  categoryUpsertSchema,
  currencyConfigSchema,
  moderationSchema,
  PROVIDER_TYPES,
} from "@wishubest/shared";
import { db } from "../db/client.js";
import {
  auditLogs,
  bookings,
  cities,
  commissionSettings,
  countries,
  currencyConfig,
  invoices,
  kycDocuments,
  payments,
  providerProfiles,
  reviews,
  serviceCategories,
  transactions,
} from "../db/schema.js";
import { requireRole } from "../lib/sessions.js";
import { audit } from "../lib/audit.js";
import { storage } from "../lib/storage.js";
import { mails } from "../lib/mailer.js";
import { revalidatePublic } from "../lib/revalidate.js";

async function logAdmin(
  req: FastifyRequest,
  action: string,
  entityType: string,
  entityId: string | null,
  changes?: unknown,
) {
  await audit({
    actorId: req.user?.id ?? null,
    actorRole: "admin",
    action,
    entityType,
    entityId,
    changes,
    ip: req.ip,
  });
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/admin")) await requireRole("admin")(req, reply);
  });

  // ---------- geography ----------
  app.post("/admin/countries", async (req, reply) => {
    const input = countryUpsertSchema.parse(req.body);
    const inserted = await db().db.insert(countries).values(input).returning();
    await logAdmin(req, "country.create", "country", inserted[0]!.id, input);
    return reply.code(201).send({ country: inserted[0] });
  });

  app.put("/admin/countries/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const input = countryUpsertSchema.partial().parse(req.body);
    const updated = await db().db.update(countries).set({ ...input, updatedAt: new Date() }).where(eq(countries.id, id)).returning();
    if (!updated[0]) return reply.code(404).send({ error: "not_found" });
    await logAdmin(req, "country.update", "country", id, input);
    void revalidatePublic([`/en`, `/ar`]);
    return { country: updated[0] };
  });

  app.post("/admin/cities", async (req, reply) => {
    const input = cityUpsertSchema.parse(req.body);
    const inserted = await db().db.insert(cities).values(input).returning();
    await logAdmin(req, "city.create", "city", inserted[0]!.id, input);
    return reply.code(201).send({ city: inserted[0] });
  });

  app.put("/admin/cities/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const input = cityUpsertSchema.partial().parse(req.body);
    const updated = await db().db.update(cities).set({ ...input, updatedAt: new Date() }).where(eq(cities.id, id)).returning();
    if (!updated[0]) return reply.code(404).send({ error: "not_found" });
    await logAdmin(req, "city.update", "city", id, input);
    return { city: updated[0] };
  });

  // ---------- categories ----------
  app.get("/admin/categories", async () => {
    return db().db.select().from(serviceCategories).orderBy(serviceCategories.priority);
  });

  app.post("/admin/categories", async (req, reply) => {
    const input = categoryUpsertSchema.parse(req.body);
    const inserted = await db().db.insert(serviceCategories).values(input).returning();
    await logAdmin(req, "category.create", "service_category", inserted[0]!.id, input);
    return reply.code(201).send({ category: inserted[0] });
  });

  app.put("/admin/categories/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const input = categoryUpsertSchema.partial().parse(req.body);
    const updated = await db().db
      .update(serviceCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(serviceCategories.id, id))
      .returning();
    if (!updated[0]) return reply.code(404).send({ error: "not_found" });
    await logAdmin(req, "category.update", "service_category", id, input);
    return { category: updated[0] };
  });

  // ---------- currency ----------
  app.get("/admin/currency", async () => {
    const rows = await db().db.select().from(currencyConfig).where(eq(currencyConfig.id, 1)).limit(1);
    return rows[0] ?? null;
  });

  app.put("/admin/currency", async (req) => {
    const input = currencyConfigSchema.parse(req.body);
    const existing = await db().db.select().from(currencyConfig).where(eq(currencyConfig.id, 1)).limit(1);
    let row;
    if (existing[0]) {
      row = (
        await db().db
          .update(currencyConfig)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(currencyConfig.id, 1))
          .returning()
      )[0];
    } else {
      row = (await db().db.insert(currencyConfig).values({ id: 1, ...input }).returning())[0];
    }
    await logAdmin(req, "currency.set", "currency_config", "1", input);
    return { currency: row };
  });

  // ---------- commission ----------
  app.get("/admin/commission", async () => {
    return db().db.select().from(commissionSettings);
  });

  app.put("/admin/commission/:providerType", async (req) => {
    const { providerType } = z.object({ providerType: z.enum(PROVIDER_TYPES) }).parse(req.params);
    const body = z.object({
      platformFeeRateBps: z.number().int().min(0).max(5000),
      affiliateCommissionRateBps: z.number().int().min(0).max(5000).default(0),
    }).parse(req.body);
    const existing = await db().db
      .select()
      .from(commissionSettings)
      .where(eq(commissionSettings.providerType, providerType))
      .limit(1);
    let row;
    if (existing[0]) {
      row = (
        await db().db
          .update(commissionSettings)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(commissionSettings.providerType, providerType))
          .returning()
      )[0];
    } else {
      row = (
        await db().db
          .insert(commissionSettings)
          .values({ providerType, ...body })
          .returning()
      )[0];
    }
    await logAdmin(req, "commission.update", "commission_settings", providerType, body);
    return { setting: row };
  });

  // ---------- providers ----------
  app.get("/admin/providers", async (req) => {
    const q = z
      .object({ status: z.string().trim().max(20).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) })
      .parse(req.query);
    const conds = q.status && ["draft","pending_review","active","suspended","rejected"].includes(q.status)
      ? [eq(providerProfiles.status, q.status as never)]
      : [];
    return db().db
      .select()
      .from(providerProfiles)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(providerProfiles.submittedAt), desc(providerProfiles.createdAt))
      .limit(q.limit);
  });

  app.post("/admin/providers/:id/decision", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        decision: z.enum(["approve", "reject", "suspend", "reactivate"]),
        note: z.string().trim().max(500).default(""),
      })
      .parse(req.body);

    const rows = await db().db.select().from(providerProfiles).where(eq(providerProfiles.id, id)).limit(1);
    const p = rows[0];
    if (!p) return reply.code(404).send({ error: "not_found" });

    const transitions: Record<string, { from: string[]; to: "active" | "rejected" | "suspended" }> = {
      approve: { from: ["pending_review"], to: "active" },
      reject: { from: ["pending_review"], to: "rejected" },
      suspend: { from: ["active"], to: "suspended" },
      reactivate: { from: ["suspended"], to: "active" },
    };
    const t = transitions[body.decision];
    if (!t) return reply.code(400).send({ error: "unknown_decision" });
    if (!t.from.includes(p.status)) return reply.code(409).send({ error: `invalid_state:${p.status}` });
    if (t.to === "active" && p.kycStatus !== "approved") {
      return reply.code(409).send({ error: "kyc_not_approved" });
    }

    const updated = await db().db
      .update(providerProfiles)
      .set({
        status: t.to,
        reviewedAt: new Date(),
        reviewNote: body.note || p.reviewNote,
        updatedAt: new Date(),
      })
      .where(and(eq(providerProfiles.id, id), eq(providerProfiles.status, p.status)))
      .returning();
    await logAdmin(req, `provider.${body.decision}`, "provider_profile", id, body);
    void revalidatePublic([`/en/providers`, `/ar/providers`, `/en/providers/${p.slug}`, `/ar/providers/${p.slug}`]);
    return { provider: updated[0] };
  });

  // ---------- KYC ----------
  app.get("/admin/kyc", async (req) => {
    const q = z.object({ status: z.enum(["not_started", "submitted", "approved", "rejected"]).optional() }).parse(req.query);
    const conds = [eq(providerProfiles.kycStatus, q.status ?? "submitted")];
    return db().db
      .select({
        providerId: providerProfiles.id,
        displayName: providerProfiles.displayName,
        providerType: providerProfiles.providerType,
        kycStatus: providerProfiles.kycStatus,
        userId: providerProfiles.userId,
      })
      .from(providerProfiles)
      .where(and(...conds));
  });

  app.get("/admin/kyc/:providerId/documents", async (req) => {
    const { providerId } = z.object({ providerId: z.string().uuid() }).parse(req.params);
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
        createdAt: kycDocuments.createdAt,
      })
      .from(kycDocuments)
      .where(eq(kycDocuments.providerId, providerId))
      .orderBy(desc(kycDocuments.createdAt));
  });

  /** Streams a private KYC file to admins only. Never public. */
  app.get("/admin/kyc/documents/:docId/file", async (req, reply) => {
    const { docId } = z.object({ docId: z.string().uuid() }).parse(req.params);
    const rows = await db().db.select().from(kycDocuments).where(eq(kycDocuments.id, docId)).limit(1);
    const doc = rows[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });
    try {
      const obj = await storage.get(doc.fileKey);
      return reply
        .header("content-type", obj.contentType ?? doc.mimeType)
        .header("content-disposition", `inline; filename="${doc.originalName.replace(/[^\w.-]/g, "_")}"`)
        .header("cache-control", "no-store")
        .send(obj.body);
    } catch (err) {
      req.log.error(err);
      return reply.code(404).send({ error: "file_missing" });
    }
  });

  app.post("/admin/kyc/:providerId/decision", async (req, reply) => {
    const { providerId } = z.object({ providerId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().max(500).default("") })
      .parse(req.body);
    const rows = await db().db.select().from(providerProfiles).where(eq(providerProfiles.id, providerId)).limit(1);
    const p = rows[0];
    if (!p) return reply.code(404).send({ error: "not_found" });
    if (p.kycStatus !== "submitted") return reply.code(409).send({ error: `invalid_state:${p.kycStatus}` });

    const kycStatus = body.decision === "approve" ? ("approved" as const) : ("rejected" as const);
    await db().db.transaction(async (tx) => {
      await tx
        .update(kycDocuments)
        .set({
          status: kycStatus,
          reviewNote: body.note || null,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        })
        .where(and(eq(kycDocuments.providerId, providerId), eq(kycDocuments.status, "submitted")));
      await tx
        .update(providerProfiles)
        .set({ kycStatus, updatedAt: new Date() })
        .where(eq(providerProfiles.id, providerId));
    });
    const emailRows = await db().db.execute<{ email: string }>(
      sql`select email from users where id = ${p.userId}`,
    );
    void mails.kycStatusChanged(emailRows[0]?.email ?? "", kycStatus, body.note || null);
    await logAdmin(req, `kyc.${body.decision}`, "provider_profile", providerId, body);
    return { ok: true, kycStatus };
  });

  // ---------- read-only financial views ----------
  app.get("/admin/bookings", async () => {
    return db().db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(200);
  });

  app.get("/admin/invoices", async () => {
    return db().db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(200);
  });

  app.get("/admin/payments", async () => {
    return db().db.select(
      {
        id: payments.id,
        invoiceId: payments.invoiceId,
        gateway: payments.gateway,
        gatewayRef: payments.gatewayRef,
        amountMinor: payments.amountMinor,
        currencyIso: payments.currencyIso,
        status: payments.status,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      },
    ).from(payments).orderBy(desc(payments.createdAt)).limit(200);
  });

  app.get("/admin/transactions", async () => {
    return db().db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(200);
  });

  // ---------- review moderation ----------
  app.get("/admin/reviews", async (req) => {
    const q = z.object({ status: z.enum(["pending", "approved", "rejected"]).default("pending") }).parse(req.query);
    return db().db
      .select({
        review: reviews,
        providerName: providerProfiles.displayName,
      })
      .from(reviews)
      .innerJoin(providerProfiles, eq(providerProfiles.id, reviews.providerId))
      .where(eq(reviews.status, q.status))
      .orderBy(desc(reviews.createdAt))
      .limit(100);
  });

  app.post("/admin/reviews/:id/moderate", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = moderationSchema.parse(req.body);
    const rows = await db().db.select().from(reviews).where(eq(reviews.id, id)).for("update").limit(1).catch(() => []);
    const review =
      rows[0] ?? (await db().db.select().from(reviews).where(eq(reviews.id, id)).limit(1))[0];
    if (!review) return reply.code(404).send({ error: "not_found" });
    if (review.status === (body.decision === "approve" ? "approved" : "rejected")) {
      return reply.code(409).send({ error: "already_moderated" });
    }
    const nextStatus = body.decision === "approve" ? ("approved" as const) : ("rejected" as const);
    await db().db
      .update(reviews)
      .set({ status: nextStatus, moderatedBy: req.user!.id, moderatedAt: new Date() })
      .where(and(eq(reviews.id, id), eq(reviews.status, review.status)));

    // Recalculate aggregate rating over approved reviews.
    const agg = await db().db
      .select({
        avg: sql<string>`coalesce(avg(${reviews.rating}) filter (where ${reviews.status} = 'approved'), 0)::numeric(3,2)`,
        count: sql<number>`count(*) filter (where ${reviews.status} = 'approved')::int`,
      })
      .from(reviews)
      .where(eq(reviews.providerId, review.providerId));
    await db().db
      .update(providerProfiles)
      .set({ ratingAvg: agg[0]?.avg ?? "0", reviewCount: agg[0]?.count ?? 0, updatedAt: new Date() })
      .where(eq(providerProfiles.id, review.providerId));

    const slugRows = await db().db
      .select({ slug: providerProfiles.slug })
      .from(providerProfiles)
      .where(eq(providerProfiles.id, review.providerId))
      .limit(1);
    if (slugRows[0]) {
      void revalidatePublic([
        `/en/providers/${slugRows[0].slug}`,
        `/ar/providers/${slugRows[0].slug}`,
        `/en/providers`,
        `/ar/providers`,
      ]);
    }
    await logAdmin(req, `review.${body.decision}`, "review", id, {});
    return { ok: true, status: nextStatus };
  });

  // ---------- audit ----------
  app.get("/admin/audit-logs", async (req) => {
    const q = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).parse(req.query);
    return db().db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(q.limit);
  });
}
