import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  cityInputSchema,
  countryInputSchema,
  currencyInputSchema,
  kycReviewSchema,
  uuidSchema,
} from "@wishubest/shared";
import { db } from "../db/client.js";
import {
  auditLogs,
  bookings,
  cities,
  commissionSettings,
  countries,
  currencies,
  invoices,
  kycDocuments,
  payments,
  providerProfiles,
  reviews,
  transactions,
  users,
} from "../db/schema.js";
import { httpError } from "../lib/httpError.js";
import { requireRole } from "./guards.js";
import { audit } from "../lib/audit.js";
import { recalcProviderRating } from "./reviews.js";
import { sendKycStatusEmail } from "../lib/mailer.js";
import type { Locale } from "@wishubest/shared";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const admin = (request: import("fastify").FastifyRequest) => requireRole(request, "admin");

  // ══ dashboard stats ══
  app.get("/admin/stats", async (request) => {
    admin(request);
    const [counts] = await db
      .select({
        users: sql<number>`(SELECT count(*) FROM ${users})::int`,
        providers: sql<number>`(SELECT count(*) FROM ${providerProfiles})::int`,
        providersPending: sql<number>`(SELECT count(*) FROM ${providerProfiles} WHERE status = 'pending_review')::int`,
        bookings: sql<number>`(SELECT count(*) FROM ${bookings})::int`,
        invoicesPaid: sql<number>`(SELECT count(*) FROM ${invoices} WHERE status = 'PAID')::int`,
        transactions: sql<number>`(SELECT count(*) FROM ${transactions})::int`,
      })
      .from(sql`(SELECT 1) AS x`);
    const [revenue] = await db
      .select({ total: sql<number>`coalesce(sum(${transactions.platformFeeMinor}), 0)::bigint` })
      .from(transactions);
    const currency = (await db.select().from(currencies).where(eq(currencies.isActive, true)).limit(1))[0];
    return {
      counts,
      platformRevenueMinor: Number(revenue?.total ?? 0),
      currencyIso: currency?.isoCode ?? null,
    };
  });

  // ══ countries ══
  app.get("/admin/countries", async (request) => {
    admin(request);
    const rows = await db.select().from(countries).orderBy(desc(countries.priority), countries.name);
    const withCounts = await db
      .select({ countryId: cities.countryId, count: sql<number>`count(*)::int` })
      .from(cities)
      .groupBy(cities.countryId);
    const countMap = new Map(withCounts.map((c) => [c.countryId, c.count]));
    return {
      countries: rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), cityCount: countMap.get(c.id) ?? 0 })),
    };
  });

  app.post("/admin/countries", async (request, reply) => {
    const user = admin(request);
    const input = countryInputSchema.parse(request.body);
    const exists = await db.select().from(countries).where(eq(countries.slug, input.slug)).limit(1);
    if (exists.length > 0) throw httpError(409, "SLUG_TAKEN", "A country with this slug exists");
    const [c] = await db.insert(countries).values(input).returning();
    audit(user, "admin.country_created", "country", c!.id, { name: input.name });
    reply.code(201).send({ country: c });
  });

  app.patch("/admin/countries/:id", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = countryInputSchema.partial().parse(request.body);
    await db.update(countries).set(input).where(eq(countries.id, id));
    audit(user, "admin.country_updated", "country", id, input as Record<string, unknown>);
    return { ok: true };
  });

  app.delete("/admin/countries/:id", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    try {
      await db.delete(countries).where(eq(countries.id, id));
    } catch {
      throw httpError(409, "COUNTRY_IN_USE", "Country is referenced by cities/providers; deactivate instead");
    }
    audit(user, "admin.country_deleted", "country", id);
    return { ok: true };
  });

  // ══ cities ══
  app.get("/admin/cities", async (request) => {
    admin(request);
    const rows = await db
      .select({ c: cities, countryName: countries.name })
      .from(cities)
      .innerJoin(countries, eq(countries.id, cities.countryId))
      .orderBy(desc(cities.priority), cities.name);
    return {
      cities: rows.map((r) => ({ ...r.c, createdAt: r.c.createdAt.toISOString(), countryName: r.countryName })),
    };
  });

  app.post("/admin/cities", async (request, reply) => {
    const user = admin(request);
    const input = cityInputSchema.parse(request.body);
    const dup = await db
      .select()
      .from(cities)
      .where(and(eq(cities.countryId, input.countryId), eq(cities.slug, input.slug)))
      .limit(1);
    if (dup.length > 0) throw httpError(409, "SLUG_TAKEN", "A city with this slug exists in this country");
    const [c] = await db.insert(cities).values(input).returning();
    audit(user, "admin.city_created", "city", c!.id, { name: input.name });
    reply.code(201).send({ city: c });
  });

  app.patch("/admin/cities/:id", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = cityInputSchema.partial().parse(request.body);
    await db.update(cities).set(input).where(eq(cities.id, id));
    audit(user, "admin.city_updated", "city", id, input as Record<string, unknown>);
    return { ok: true };
  });

  app.delete("/admin/cities/:id", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    try {
      await db.delete(cities).where(eq(cities.id, id));
    } catch {
      throw httpError(409, "CITY_IN_USE", "City is referenced by providers; deactivate instead");
    }
    audit(user, "admin.city_deleted", "city", id);
    return { ok: true };
  });

  // ══ currency (single active) ══
  app.get("/admin/currency", async (request) => {
    admin(request);
    const rows = await db.select().from(currencies);
    return { currencies: rows.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })) };
  });

  app.put("/admin/currency", async (request) => {
    const user = admin(request);
    const input = currencyInputSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const existing = await tx.select().from(currencies).where(eq(currencies.isoCode, input.isoCode)).limit(1);
      await tx.update(currencies).set({ isActive: false });
      if (existing.length > 0) {
        await tx
          .update(currencies)
          .set({ symbol: input.symbol, decimalPlaces: input.decimalPlaces, isActive: true, updatedAt: new Date() })
          .where(eq(currencies.id, existing[0]!.id));
      } else {
        await tx.insert(currencies).values({ ...input, isActive: true });
      }
    });
    audit(user, "admin.currency_changed", "currency", input.isoCode, input as Record<string, unknown>);
    return { ok: true };
  });

  // ══ commission settings ══
  app.get("/admin/commission", async (request) => {
    admin(request);
    const rows = await db.select().from(commissionSettings);
    return {
      settings: rows.map((r) => ({
        providerType: r.providerType,
        platformFeeRateBps: r.platformFeeRateBps,
        affiliateCommissionRateBps: r.affiliateCommissionRateBps,
      })),
    };
  });

  app.put("/admin/commission", async (request) => {
    const user = admin(request);
    const input = z
      .object({
        providerType: z.enum(["doctor", "hospital", "hotel", "translator"]),
        platformFeeRate: z.number().min(0).max(1),
        affiliateCommissionRate: z.number().min(0).max(1).default(0),
      })
      .parse(request.body);
    if (!Number.isInteger(Math.round(input.platformFeeRate * 10000))) {
      throw httpError(422, "INVALID_RATE", "Rate precision exceeds basis points");
    }
    const bps = Math.round(input.platformFeeRate * 10000);
    const affBps = Math.round(input.affiliateCommissionRate * 10000);
    await db
      .update(commissionSettings)
      .set({ platformFeeRateBps: bps, affiliateCommissionRateBps: affBps, updatedAt: new Date() })
      .where(eq(commissionSettings.providerType, input.providerType));
    audit(user, "admin.commission_updated", "commission_setting", input.providerType, { platformFeeRateBps: bps });
    return { ok: true };
  });

  // ══ providers: review / approve / reject / suspend ══
  app.get("/admin/providers", async (request) => {
    admin(request);
    const q = z.object({ status: z.string().optional() }).parse(request.query ?? {});
    const conditions = q.status ? [sql`${providerProfiles.status} = ${q.status}`] : [];
    const rows = await db
      .select({ p: providerProfiles, ownerEmail: users.email, countryName: countries.name, cityName: cities.name })
      .from(providerProfiles)
      .innerJoin(users, eq(users.id, providerProfiles.userId))
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(providerProfiles.createdAt))
      .limit(500);
    return {
      providers: rows.map((r) => ({
        id: r.p.id,
        displayName: r.p.displayName,
        slug: r.p.slug,
        providerType: r.p.providerType,
        status: r.p.status,
        kycStatus: r.p.kycStatus,
        ownerEmail: r.ownerEmail,
        countryName: r.countryName,
        cityName: r.cityName,
        ratingAvg: r.p.ratingAvg,
        reviewCount: r.p.reviewCount,
        createdAt: r.p.createdAt.toISOString(),
      })),
    };
  });

  app.get("/admin/providers/:id", async (request) => {
    admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const rows = await db
      .select({ p: providerProfiles, ownerEmail: users.email, ownerName: users.fullName })
      .from(providerProfiles)
      .innerJoin(users, eq(users.id, providerProfiles.userId))
      .where(eq(providerProfiles.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) throw httpError(404, "NOT_FOUND", "Provider not found");
    const docs = await db.select().from(kycDocuments).where(eq(kycDocuments.providerProfileId, id));
    return {
      provider: {
        ...row.p,
        createdAt: row.p.createdAt.toISOString(),
        updatedAt: row.p.updatedAt.toISOString(),
        ownerEmail: row.ownerEmail,
        ownerName: row.ownerName,
      },
      kycDocuments: docs.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        uploadedAt: d.uploadedAt.toISOString(),
      })),
    };
  });

  app.post("/admin/providers/:id/status", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = z
      .object({ status: z.enum(["active", "suspended", "rejected", "pending_review"]) })
      .parse(request.body);
    const provider = (await db.select().from(providerProfiles).where(eq(providerProfiles.id, id)).limit(1))[0];
    if (!provider) throw httpError(404, "NOT_FOUND", "Provider not found");
    if (input.status === "active" && provider.kycStatus !== "approved") {
      throw httpError(409, "KYC_REQUIRED", "Provider KYC must be approved before activation");
    }
    await db
      .update(providerProfiles)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(providerProfiles.id, id));
    audit(user, `admin.provider_${input.status}`, "provider_profile", id);
    return { ok: true };
  });

  // ══ KYC review ══
  app.post("/admin/providers/:id/kyc", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = kycReviewSchema.parse(request.body);
    const provider = (await db.select().from(providerProfiles).where(eq(providerProfiles.id, id)).limit(1))[0];
    if (!provider) throw httpError(404, "NOT_FOUND", "Provider not found");
    if (provider.kycStatus !== "submitted") throw httpError(409, "INVALID_STATE", `KYC is ${provider.kycStatus}`);

    await db.transaction(async (tx) => {
      await tx
        .update(providerProfiles)
        .set({ kycStatus: input.kycStatus, updatedAt: new Date() })
        .where(eq(providerProfiles.id, id));
      // rejecting profile too when rejected & was active
      if (input.kycStatus === "rejected" && provider.status === "active") {
        await tx.update(providerProfiles).set({ status: "suspended" }).where(eq(providerProfiles.id, id));
      }
    });

    const owner = (await db.select().from(users).where(eq(users.id, provider.userId)).limit(1))[0];
    if (owner) void sendKycStatusEmail(owner.email, owner.fullName, input.kycStatus, owner.locale as Locale);

    audit(user, `admin.kyc_${input.kycStatus}`, "provider_profile", id, { note: input.note });
    return { ok: true };
  });

  // ══ KYC document download (admin only, private storage) ══
  app.get("/admin/kyc-documents/:id/file", async (request, reply) => {
    admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const doc = (await db.select().from(kycDocuments).where(eq(kycDocuments.id, id)).limit(1))[0];
    if (!doc) throw httpError(404, "NOT_FOUND", "Document not found");
    const { storage } = await import("../lib/storage.js");
    const obj = await storage.get(doc.storageKey);
    reply.header("content-type", doc.mimeType);
    reply.header("content-disposition", `inline; filename="${doc.fileName}"`);
    reply.header("cache-control", "private, no-store");
    return reply.send(obj.stream);
  });

  // ══ reviews moderation ══
  app.get("/admin/reviews", async (request) => {
    admin(request);
    const rows = await db
      .select({ r: reviews, providerName: providerProfiles.displayName, patientName: users.fullName })
      .from(reviews)
      .innerJoin(providerProfiles, eq(providerProfiles.id, reviews.providerId))
      .innerJoin(users, eq(users.id, reviews.patientId))
      .orderBy(desc(reviews.createdAt))
      .limit(500);
    return {
      reviews: rows.map((r) => ({
        id: r.r.id,
        bookingId: r.r.bookingId,
        providerId: r.r.providerId,
        providerName: r.providerName,
        patientName: r.patientName,
        rating: r.r.rating,
        comment: r.r.comment,
        status: r.r.status,
        createdAt: r.r.createdAt.toISOString(),
      })),
    };
  });

  app.post("/admin/reviews/:id/moderate", async (request) => {
    const user = admin(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = z.object({ status: z.enum(["approved", "rejected"]) }).parse(request.body);
    const review = (await db.select().from(reviews).where(eq(reviews.id, id)).limit(1))[0];
    if (!review) throw httpError(404, "NOT_FOUND", "Review not found");
    if (review.status !== "pending") throw httpError(409, "INVALID_STATE", "Review already moderated");

    await db
      .update(reviews)
      .set({ status: input.status, moderatedAt: new Date(), moderatedBy: user.id })
      .where(eq(reviews.id, id));
    await recalcProviderRating(review.providerId);

    audit(user, `admin.review_${input.status}`, "review", id, { providerId: review.providerId });
    return { ok: true };
  });

  // ══ read-only financial views ══
  app.get("/admin/bookings", async (request) => {
    admin(request);
    const rows = await db
      .select({ b: bookings, patientEmail: users.email })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.patientId))
      .orderBy(desc(bookings.createdAt))
      .limit(500);
    return {
      bookings: rows.map((r) => ({
        ...r.b,
        createdAt: r.b.createdAt.toISOString(),
        updatedAt: r.b.updatedAt.toISOString(),
        requestedStartAt: r.b.requestedStartAt?.toISOString() ?? null,
        patientEmail: r.patientEmail,
      })),
    };
  });

  app.get("/admin/invoices", async (request) => {
    admin(request);
    const rows = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(500);
    return {
      invoices: rows.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        issuedAt: i.issuedAt?.toISOString() ?? null,
        paidAt: i.paidAt?.toISOString() ?? null,
      })),
    };
  });

  app.get("/admin/payments", async (request) => {
    admin(request);
    const rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(500);
    return {
      payments: rows.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  });

  app.get("/admin/transactions", async (request) => {
    admin(request);
    const rows = await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(500);
    return {
      transactions: rows.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  // ══ audit log ══
  app.get("/admin/audit-logs", async (request) => {
    admin(request);
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300);
    return {
      logs: rows.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    };
  });
}
