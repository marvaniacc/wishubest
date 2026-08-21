import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  cities,
  countries,
  currencies,
  providerProfiles,
  reviews,
  serviceCategories,
  services,
  users,
} from "../db/schema.js";
import { paginationSchema } from "@wishubest/shared";

/** Platform settings safe for public/SSR use. */
export async function getActiveCurrency() {
  const rows = await db.select().from(currencies).where(eq(currencies.isActive, true)).limit(1);
  return rows[0] ?? null;
}

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // ── config: active currency (public — needed to render prices) ──
  app.get("/catalog/currency", async () => {
    const c = await getActiveCurrency();
    if (!c) return { currency: null };
    return { currency: { isoCode: c.isoCode, symbol: c.symbol, decimalPlaces: c.decimalPlaces } };
  });

  // ── countries & cities (active only, priority order) ──
  app.get("/catalog/countries", async () => {
    const rows = await db
      .select()
      .from(countries)
      .where(eq(countries.isActive, true))
      .orderBy(desc(countries.priority), asc(countries.name));
    return {
      countries: rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, isActive: c.isActive, priority: c.priority })),
    };
  });

  app.get("/catalog/countries/:slug/cities", async (request) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const country = await db.select().from(countries).where(eq(countries.slug, slug)).limit(1);
    if (country.length === 0) return { cities: [] };
    const rows = await db
      .select()
      .from(cities)
      .where(and(eq(cities.countryId, country[0]!.id), eq(cities.isActive, true)))
      .orderBy(desc(cities.priority), asc(cities.name));
    return {
      cities: rows.map((c) => ({ id: c.id, countryId: c.countryId, name: c.name, slug: c.slug, priority: c.priority })),
    };
  });

  app.get("/catalog/cities", async () => {
    const rows = await db
      .select({
        id: cities.id,
        countryId: cities.countryId,
        name: cities.name,
        slug: cities.slug,
        priority: cities.priority,
        countryName: countries.name,
        countrySlug: countries.slug,
      })
      .from(cities)
      .innerJoin(countries, eq(countries.id, cities.countryId))
      .where(and(eq(cities.isActive, true), eq(countries.isActive, true)))
      .orderBy(desc(cities.priority), asc(cities.name));
    return { cities: rows };
  });

  app.get("/catalog/categories", async () => {
    const rows = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.isActive, true))
      .orderBy(asc(serviceCategories.name));
    return { categories: rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, isActive: c.isActive })) };
  });

  // ── provider search (public marketplace) ──
  const providerQuerySchema = paginationSchema.extend({
    type: z.enum(["doctor", "hospital", "hotel", "translator"]).optional(),
    country: z.string().max(80).optional(), // slug
    city: z.string().max(80).optional(), // slug
    category: z.string().max(60).optional(), // category slug
    minRating: z.coerce.number().min(0).max(5).optional(),
    q: z.string().max(120).optional(),
  });

  app.get("/catalog/providers", async (request) => {
    const q = providerQuerySchema.parse(request.query);

    const conditions = [
      eq(providerProfiles.status, "active"),
      eq(providerProfiles.kycStatus, "approved"),
      eq(countries.isActive, true),
    ];
    if (q.type) conditions.push(eq(providerProfiles.providerType, q.type));
    if (q.country) conditions.push(eq(countries.slug, q.country));
    if (q.city) conditions.push(eq(cities.slug, q.city));
    if (q.minRating) {
      conditions.push(gte(providerProfiles.ratingAvg, q.minRating.toFixed(2)));
    }
    if (q.q) {
      const like = `%${q.q}%`;
      conditions.push(
        or(ilike(providerProfiles.displayName, like), ilike(providerProfiles.summary, like))!,
      );
    }
    if (q.category) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${services} s WHERE s.provider_profile_id = ${providerProfiles.id} AND s.status = 'active' AND s.category_id IN (SELECT id FROM ${serviceCategories} sc WHERE sc.slug = ${q.category}))`,
      );
    }

    const offset = (q.page - 1) * q.pageSize;
    const rows = await db
      .select({
        id: providerProfiles.id,
        providerType: providerProfiles.providerType,
        displayName: providerProfiles.displayName,
        slug: providerProfiles.slug,
        summary: providerProfiles.summary,
        ratingAvg: providerProfiles.ratingAvg,
        reviewCount: providerProfiles.reviewCount,
        cityName: cities.name,
        citySlug: cities.slug,
        countryName: countries.name,
        countrySlug: countries.slug,
      })
      .from(providerProfiles)
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .where(and(...conditions))
      .orderBy(desc(providerProfiles.ratingAvg), desc(providerProfiles.reviewCount))
      .limit(q.pageSize)
      .offset(offset);

    const countRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(providerProfiles)
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .where(and(...conditions));

    const total = countRow[0]?.count ?? 0;
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      providers: rows.map((r) => ({
        id: r.id,
        providerType: r.providerType,
        displayName: r.displayName,
        slug: r.slug,
        summary: r.summary,
        ratingAvg: r.ratingAvg,
        reviewCount: r.reviewCount,
        city: r.citySlug ? { id: r.citySlug, name: r.cityName, slug: r.citySlug } : null,
        country: r.countrySlug ? { id: r.countrySlug, name: r.countryName, slug: r.countrySlug } : null,
      })),
    };
  });

  // ── provider detail (public) ──
  app.get("/catalog/providers/:slug", async (request) => {
    const { slug } = z.object({ slug: z.string().max(80) }).parse(request.params);
    const rows = await db
      .select({
        p: providerProfiles,
        cityName: cities.name,
        citySlug: cities.slug,
        countryName: countries.name,
        countrySlug: countries.slug,
      })
      .from(providerProfiles)
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .where(eq(providerProfiles.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row || row.p.status !== "active") return { provider: null };

    const currency = await getActiveCurrency();
    const svc = await db
      .select({
        id: services.id,
        title: services.title,
        description: services.description,
        serviceMode: services.serviceMode,
        priceAmountMinor: services.priceAmountMinor,
        durationMinutes: services.durationMinutes,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(and(eq(services.providerProfileId, row.p.id), eq(services.status, "active")))
      .orderBy(asc(services.title));

    const rvw = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        patientName: users.fullName,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.patientId))
      .where(and(eq(reviews.providerId, row.p.id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt))
      .limit(50);

    return {
      provider: {
        id: row.p.id,
        providerType: row.p.providerType,
        displayName: row.p.displayName,
        slug: row.p.slug,
        summary: row.p.summary,
        description: row.p.description,
        ratingAvg: row.p.ratingAvg,
        reviewCount: row.p.reviewCount,
        city: row.citySlug ? { name: row.cityName, slug: row.citySlug } : null,
        country: row.countrySlug ? { name: row.countryName, slug: row.countrySlug } : null,
        services: svc.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          categorySlug: s.categorySlug,
          serviceMode: s.serviceMode,
          priceAmountMinor: s.priceAmountMinor,
          durationMinutes: s.durationMinutes,
          currency: currency ? { isoCode: currency.isoCode, symbol: currency.symbol, decimalPlaces: currency.decimalPlaces } : null,
        })),
        reviews: rvw.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          patientName: anonymize(r.patientName),
        })),
      },
    };
  });

  // ── service detail (public — used by booking page) ──
  app.get("/catalog/services/:id", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const rows = await db
      .select({
        s: services,
        providerId: providerProfiles.id,
        providerName: providerProfiles.displayName,
        providerSlug: providerProfiles.slug,
        providerStatus: providerProfiles.status,
        providerKyc: providerProfiles.kycStatus,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .innerJoin(providerProfiles, eq(providerProfiles.id, services.providerProfileId))
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(eq(services.id, id))
      .limit(1);

    const row = rows[0];
    if (!row || row.s.status !== "active" || row.providerStatus !== "active") return { service: null };
    const currency = await getActiveCurrency();
    return {
      service: {
        id: row.s.id,
        title: row.s.title,
        description: row.s.description,
        categorySlug: row.categorySlug,
        serviceMode: row.s.serviceMode,
        priceAmountMinor: row.s.priceAmountMinor,
        durationMinutes: row.s.durationMinutes,
        currency: currency ? { isoCode: currency.isoCode, symbol: currency.symbol, decimalPlaces: currency.decimalPlaces } : null,
        provider: { id: row.providerId, displayName: row.providerName, slug: row.providerSlug },
      },
    };
  });
}

function anonymize(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1]![0]}.` : "";
  return `${first} ${lastInitial}`.trim();
}

export { anonymize };

