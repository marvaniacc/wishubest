import type { FastifyInstance } from "fastify";
import { and, eq, desc, sql, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  cities,
  countries,
  providerProfiles,
  reviews,
  serviceCategories,
  services,
} from "../db/schema.js";

const listSchema = z.object({
  type: z.enum(["doctor", "hospital", "hotel", "translator"]).optional(),
  country: z.string().trim().min(1).max(140).optional(),
  city: z.string().trim().min(1).max(140).optional(),
  category: z.string().trim().min(1).max(140).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const PUBLIC_PROVIDER_COLUMNS = {
  id: providerProfiles.id,
  slug: providerProfiles.slug,
  displayName: providerProfiles.displayName,
  providerType: providerProfiles.providerType,
  summary: providerProfiles.summary,
  description: providerProfiles.description,
  photoUrl: providerProfiles.photoUrl,
  ratingAvg: providerProfiles.ratingAvg,
  reviewCount: providerProfiles.reviewCount,
  addressLine: providerProfiles.addressLine,
  countryNameEn: countries.nameEn,
  countryNameAr: countries.nameAr,
  countrySlug: countries.slug,
  cityNameEn: cities.nameEn,
  cityNameAr: cities.nameAr,
  citySlug: cities.slug,
};

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get("/public/currency", async () => {
    const rows = await db()
      .db.execute<{ iso_code: string; symbol: string; decimal_places: number }>(
        sql`select iso_code, symbol, decimal_places from currency_config where id = 1`,
      );
    const r = rows[0];
    return r
      ? { isoCode: r.iso_code, symbol: r.symbol, decimalPlaces: r.decimal_places }
      : { isoCodeFallback: true };
  });

  app.get("/public/countries", async (_req, _reply) => {
    return db().db
      .select({
        id: countries.id,
        nameEn: countries.nameEn,
        nameAr: countries.nameAr,
        slug: countries.slug,
        iso2: countries.iso2,
      })
      .from(countries)
      .where(eq(countries.active, true))
      .orderBy(countries.priority, countries.nameEn);
  });

  app.get("/public/cities", async (req) => {
    const q = z.object({ countrySlug: z.string().trim().max(140).optional() }).parse(req.query);
    if (q.countrySlug) {
      return db().db
        .select({
          id: cities.id,
          nameEn: cities.nameEn,
          nameAr: cities.nameAr,
          slug: cities.slug,
          countryId: cities.countryId,
        })
        .from(cities)
        .innerJoin(countries, eq(countries.id, cities.countryId))
        .where(and(eq(cities.active, true), eq(countries.slug, q.countrySlug)))
        .orderBy(cities.priority, cities.nameEn);
    }
    return db().db
      .select({
        id: cities.id,
        nameEn: cities.nameEn,
        nameAr: cities.nameAr,
        slug: cities.slug,
        countryId: cities.countryId,
      })
      .from(cities)
      .where(eq(cities.active, true))
      .orderBy(cities.priority, cities.nameEn);
  });

  app.get("/public/categories", async () => {
    return db().db
      .select({
        id: serviceCategories.id,
        slug: serviceCategories.slug,
        nameEn: serviceCategories.nameEn,
        nameAr: serviceCategories.nameAr,
      })
      .from(serviceCategories)
      .where(eq(serviceCategories.active, true))
      .orderBy(serviceCategories.priority, serviceCategories.nameEn);
  });

  app.get("/public/providers", async (req) => {
    const q = listSchema.parse(req.query);
    // Public = active profile AND approved KYC.
    const conds = [eq(providerProfiles.status, "active"), eq(providerProfiles.kycStatus, "approved")];
    if (q.type) conds.push(eq(providerProfiles.providerType, q.type));
    if (q.country) conds.push(eq(countries.slug, q.country));
    if (q.city) conds.push(eq(cities.slug, q.city));
    if (q.minRating !== undefined && q.minRating > 0) {
      conds.push(gte(providerProfiles.ratingAvg, String(q.minRating)));
    }
    if (q.category) conds.push(eq(serviceCategories.slug, q.category));
    if (q.q) {
      conds.push(
        sql`(${providerProfiles.displayName} ILIKE ${"%" + q.q + "%"} OR ${providerProfiles.summary} ILIKE ${"%" + q.q + "%"})`,
      );
    }

    const rows = await db().db
      .select(PUBLIC_PROVIDER_COLUMNS)
      .from(providerProfiles)
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .leftJoin(services, and(eq(services.providerId, providerProfiles.id), eq(services.status, "active")))
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(and(...conds))
      .groupBy(providerProfiles.id, countries.id, cities.id)
      .orderBy(desc(providerProfiles.ratingAvg), providerProfiles.displayName)
      .limit(q.limit)
      .offset(q.offset);

    const totalRes = await db().db
      .select({ count: sql<number>`count(distinct ${providerProfiles.id})::int` })
      .from(providerProfiles)
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .leftJoin(services, and(eq(services.providerId, providerProfiles.id), eq(services.status, "active")))
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(and(...conds));

    return { items: rows.map(shapeProvider), total: totalRes[0]?.count ?? 0 };
  });

  app.get("/public/providers/:slug", async (req, reply) => {
    const { slug } = z.object({ slug: z.string().trim().min(1).max(180) }).parse(req.params);
    const rows = await db().db
      .select(PUBLIC_PROVIDER_COLUMNS)
      .from(providerProfiles)
      .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
      .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
      .where(
        and(
          eq(providerProfiles.slug, slug),
          eq(providerProfiles.status, "active"),
          eq(providerProfiles.kycStatus, "approved"),
        ),
      )
      .limit(1);
    const p = rows[0];
    if (!p) return reply.code(404).send({ error: "not_found" });

    const svcRows = await db().db
      .select({
        id: services.id,
        title: services.title,
        description: services.description,
        serviceMode: services.serviceMode,
        priceAmountMinor: services.priceAmountMinor,
        durationMinutes: services.durationMinutes,
        categoryNameEn: serviceCategories.nameEn,
        categoryNameAr: serviceCategories.nameAr,
        categorySlug: serviceCategories.slug,
      })
      .from(services)
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(and(eq(services.providerId, p.id), eq(services.status, "active")));

    const openSlots = await db().db
      .execute<{ id: string; starts_at: string; ends_at: string; service_id: string }>(
        sql`select id, starts_at, ends_at, service_id from service_slots
            where status = 'open' and starts_at > now() - interval '1 hour'
            order by starts_at asc limit 200`,
      );

    const reviewRows = await db().db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.providerId, p.id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt))
      .limit(20);

    return {
      provider: shapeProvider(p),
      services: svcRows,
      slots: openSlots ?? [],
      reviews: reviewRows,
    };
  });

  app.get("/public/countries/:slug", async (req, reply) => {
    const { slug } = z.object({ slug: z.string().trim().min(1).max(140) }).parse(req.params);
    const cRows = await db().db.select().from(countries).where(and(eq(countries.slug, slug), eq(countries.active, true))).limit(1);
    const country = cRows[0];
    if (!country) return reply.code(404).send({ error: "not_found" });
    const provs = await providersForGeo("country", country.id);
    return { country, providers: provs };
  });

  app.get("/public/cities/:slug", async (req, reply) => {
    const { slug } = z.object({ slug: z.string().trim().min(1).max(140) }).parse(req.params);
    const rows = await db().db
      .select({ city: cities, country: countries })
      .from(cities)
      .innerJoin(countries, eq(countries.id, cities.countryId))
      .where(and(eq(cities.slug, slug), eq(cities.active, true)))
      .limit(1);
    const hit = rows[0];
    if (!hit) return reply.code(404).send({ error: "not_found" });
    const provs = await providersForGeo("city", hit.city.id);
    return { city: hit.city, country: hit.country, providers: provs };
  });
}

async function providersForGeo(scope: "country" | "city", geoId: string) {
  const conds = [
    eq(providerProfiles.status, "active"),
    eq(providerProfiles.kycStatus, "approved"),
    scope === "country" ? eq(providerProfiles.countryId, geoId) : eq(providerProfiles.cityId, geoId),
  ];
  const rows = await db().db
    .select(PUBLIC_PROVIDER_COLUMNS)
    .from(providerProfiles)
    .leftJoin(countries, eq(countries.id, providerProfiles.countryId))
    .leftJoin(cities, eq(cities.id, providerProfiles.cityId))
    .where(and(...conds))
    .orderBy(desc(providerProfiles.ratingAvg))
    .limit(50);
  return rows.map(shapeProvider);
}

function shapeProvider(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    slug: r.slug as string,
    displayName: r.displayName as string,
    providerType: r.providerType as string,
    summary: r.summary as string,
    description: r.description as string,
    photoUrl: r.photoUrl as string | null,
    ratingAvg: Number(r.ratingAvg ?? 0),
    reviewCount: Number(r.reviewCount ?? 0),
    addressLine: r.addressLine as string,
    country: r.countrySlug
      ? { slug: r.countrySlug as string, nameEn: r.countryNameEn as string, nameAr: r.countryNameAr as string }
      : null,
    city: r.citySlug
      ? { slug: r.citySlug as string, nameEn: r.cityNameEn as string, nameAr: r.cityNameAr as string }
      : null,
  };
}