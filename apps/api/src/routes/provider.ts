import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { providerProfileInputSchema, serviceInputSchema, uuidSchema } from "@wishubest/shared";
import { db } from "../db/client.js";
import { bookings, cities, countries, kycDocuments, providerProfiles, serviceCategories, services, users } from "../db/schema.js";
import { httpError } from "../lib/httpError.js";
import { requireProviderProfile } from "./guards.js";
import { storage, validateUpload } from "../lib/storage.js";
import { audit } from "../lib/audit.js";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `provider-${randomUUID().slice(0, 8)}`
  );
}

export async function providerRoutes(app: FastifyInstance): Promise<void> {
  // ── my profile ──
  app.get("/provider/me", async (request) => {
    const { profile } = await requireProviderProfile(request);
    const docs = await db.select().from(kycDocuments).where(eq(kycDocuments.providerProfileId, profile.id));
    const country = profile.countryId
      ? (await db.select().from(countries).where(eq(countries.id, profile.countryId)).limit(1))[0]
      : null;
    const city = profile.cityId
      ? (await db.select().from(cities).where(eq(cities.id, profile.cityId)).limit(1))[0]
      : null;
    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        providerType: profile.providerType,
        displayName: profile.displayName,
        slug: profile.slug,
        summary: profile.summary,
        description: profile.description,
        phone: profile.phone,
        website: profile.website,
        status: profile.status,
        kycStatus: profile.kycStatus,
        ratingAvg: profile.ratingAvg,
        reviewCount: profile.reviewCount,
        location: country && city
          ? {
              countryId: country.id,
              countryName: country.name,
              cityId: city.id,
              cityName: city.name,
              addressLine1: profile.addressLine1,
              addressLine2: profile.addressLine2,
              postalCode: profile.postalCode,
            }
          : null,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      kycDocuments: docs.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        uploadedAt: d.uploadedAt.toISOString(),
        note: d.note,
      })),
    };
  });

  // ── create profile (onboarding step 1) ──
  app.post("/provider/profile", async (request, reply) => {
    const user = request.user!;
    if (user.role !== "provider") {
      throw httpError(403, "FORBIDDEN", "Only provider accounts can create a provider profile");
    }
    const existing = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, user.id)).limit(1);
    if (existing.length > 0) throw httpError(409, "PROFILE_EXISTS", "Provider profile already exists");

    const input = providerProfileInputSchema.parse(request.body);

    // validate city belongs to country
    const city = (await db.select().from(cities).where(eq(cities.id, input.cityId)).limit(1))[0];
    if (!city || city.countryId !== input.countryId) {
      throw httpError(422, "INVALID_CITY", "City does not belong to the selected country");
    }

    let slug = input.slug ?? slugify(input.displayName);
    const slugTaken = await db.select({ id: providerProfiles.id }).from(providerProfiles).where(eq(providerProfiles.slug, slug)).limit(1);
    if (slugTaken.length > 0) slug = `${slug}-${randomUUID().slice(0, 6)}`;

    const [profile] = await db
      .insert(providerProfiles)
      .values({
        userId: user.id,
        providerType: input.providerType,
        displayName: input.displayName,
        slug,
        summary: input.summary ?? null,
        description: input.description ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        status: "draft",
        kycStatus: "not_started",
        countryId: input.countryId,
        cityId: input.cityId,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        postalCode: input.postalCode ?? null,
      })
      .returning();

    audit(request.user, "provider.profile_created", "provider_profile", profile!.id, { slug });
    reply.code(201).send({ profile: { id: profile!.id, slug: profile!.slug } });
  });

  // ── update profile ──
  app.patch("/provider/profile", async (request) => {
    const { profile } = await requireProviderProfile(request);
    const input = providerProfileInputSchema.partial().parse(request.body);

    if (input.cityId && input.countryId) {
      const city = (await db.select().from(cities).where(eq(cities.id, input.cityId)).limit(1))[0];
      if (!city || city.countryId !== input.countryId) {
        throw httpError(422, "INVALID_CITY", "City does not belong to the selected country");
      }
    }

    // identity changes (type/displayName/slug) re-trigger review when already public
    const identityChanged =
      (input.providerType && input.providerType !== profile.providerType) ||
      (input.displayName && input.displayName !== profile.displayName);

    await db
      .update(providerProfiles)
      .set({
        providerType: input.providerType ?? profile.providerType,
        displayName: input.displayName ?? profile.displayName,
        summary: input.summary ?? profile.summary,
        description: input.description ?? profile.description,
        phone: input.phone ?? profile.phone,
        website: input.website ?? profile.website,
        countryId: input.countryId ?? profile.countryId,
        cityId: input.cityId ?? profile.cityId,
        addressLine1: input.addressLine1 ?? profile.addressLine1,
        addressLine2: input.addressLine2 ?? profile.addressLine2,
        postalCode: input.postalCode ?? profile.postalCode,
        status: identityChanged && profile.status === "active" ? "pending_review" : profile.status,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, profile.id));

    audit(request.user, "provider.profile_updated", "provider_profile", profile.id);
    return { ok: true };
  });

  // ── submit for review (goes public only after admin approves AND kyc approved) ──
  app.post("/provider/submit-review", async (request) => {
    const { profile } = await requireProviderProfile(request);
    if (profile.status !== "draft" && profile.status !== "rejected") {
      throw httpError(409, "INVALID_STATE", `Cannot submit from status ${profile.status}`);
    }
    if (!profile.summary || !profile.description) {
      throw httpError(422, "INCOMPLETE_PROFILE", "Summary and description are required before review");
    }
    await db
      .update(providerProfiles)
      .set({ status: "pending_review", updatedAt: new Date() })
      .where(eq(providerProfiles.id, profile.id));
    audit(request.user, "provider.submitted_review", "provider_profile", profile.id);
    return { ok: true };
  });

  // ── KYC document upload (multipart) ──
  app.post(
    "/provider/kyc/documents",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const { profile } = await requireProviderProfile(request);
      if (profile.kycStatus === "approved") {
        throw httpError(409, "KYC_APPROVED", "KYC already approved — contact support to update documents");
      }

      const parts = request.parts({ limits: { files: 5, fileSize: 10 * 1024 * 1024 } });
      const uploaded: string[] = [];
      for await (const part of parts) {
        if (part.type !== "file") continue;
        const err = validateUpload(part.filename, part.mimetype, 0);
        if (err) throw httpError(422, "INVALID_FILE", err);
        const buffer = await part.toBuffer();
        const stored = await storage.put(part.filename, part.mimetype, buffer);
        await db.insert(kycDocuments).values({
          providerProfileId: profile.id,
          storageKey: stored.storageKey,
          fileName: part.filename,
          mimeType: part.mimetype,
          sizeBytes: stored.sizeBytes,
        });
        uploaded.push(part.filename);
      }
      if (uploaded.length === 0) throw httpError(422, "NO_FILES", "No document files provided");

      // (re)submission flips kyc to submitted
      await db
        .update(providerProfiles)
        .set({ kycStatus: "submitted", updatedAt: new Date() })
        .where(eq(providerProfiles.id, profile.id));
      audit(request.user, "provider.kyc_submitted", "provider_profile", profile.id, { files: uploaded });
      reply.code(201).send({ uploaded });
    },
  );

  // ── services CRUD ──
  app.get("/provider/services", async (request) => {
    const { profile } = await requireProviderProfile(request);
    if (profile.kycStatus !== "approved") {
      return { services: [], kycStatus: profile.kycStatus, message: "KYC approval required to manage services" };
    }
    const rows = await db
      .select({ s: services, categorySlug: serviceCategories.slug, categoryName: serviceCategories.name })
      .from(services)
      .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(eq(services.providerProfileId, profile.id))
      .orderBy(desc(services.createdAt));
    return {
      services: rows.map((r) => ({
        id: r.s.id,
        title: r.s.title,
        description: r.s.description,
        categoryId: r.s.categoryId,
        categorySlug: r.categorySlug,
        categoryName: r.categoryName,
        serviceMode: r.s.serviceMode,
        pricingModel: r.s.pricingModel,
        priceAmountMinor: r.s.priceAmountMinor,
        durationMinutes: r.s.durationMinutes,
        status: r.s.status,
      })),
    };
  });

  app.post("/provider/services", async (request, reply) => {
    const { profile } = await requireProviderProfile(request);
    if (profile.kycStatus !== "approved") {
      throw httpError(403, "KYC_REQUIRED", "KYC must be approved before creating services");
    }
    const input = serviceInputSchema.parse(request.body);
    if (input.priceAmount === undefined || input.priceAmount === null) {
      throw httpError(422, "PRICE_REQUIRED", "Fixed pricing requires a price");
    }
    const priceAmountMinor = Math.round(input.priceAmount * 100); // server-side conversion; integer minor units
    if (!Number.isSafeInteger(priceAmountMinor) || priceAmountMinor < 0) {
      throw httpError(422, "PRICE_INVALID", "Invalid price");
    }
    const category = (await db.select().from(serviceCategories).where(eq(serviceCategories.id, input.categoryId)).limit(1))[0];
    if (!category || !category.isActive) throw httpError(422, "INVALID_CATEGORY", "Category not found or inactive");

    const [svc] = await db
      .insert(services)
      .values({
        providerProfileId: profile.id,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        serviceMode: input.serviceMode,
        pricingModel: "fixed",
        priceAmountMinor,
        durationMinutes: input.durationMinutes ?? null,
        status: input.status,
      })
      .returning();
    audit(request.user, "provider.service_created", "service", svc!.id, { title: svc!.title });
    reply.code(201).send({ service: { id: svc!.id } });
  });

  app.patch("/provider/services/:id", async (request) => {
    const { profile } = await requireProviderProfile(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const input = serviceInputSchema.partial().parse(request.body);

    const existing = (
      await db
        .select()
        .from(services)
        .where(and(eq(services.id, id), eq(services.providerProfileId, profile.id)))
        .limit(1)
    )[0];
    if (!existing) throw httpError(404, "NOT_FOUND", "Service not found");

    let priceAmountMinor = existing.priceAmountMinor;
    if (input.priceAmount !== undefined) {
      priceAmountMinor = Math.round(input.priceAmount * 100);
      if (!Number.isSafeInteger(priceAmountMinor) || priceAmountMinor < 0) {
        throw httpError(422, "PRICE_INVALID", "Invalid price");
      }
    }
    if (input.categoryId) {
      const category = (await db.select().from(serviceCategories).where(eq(serviceCategories.id, input.categoryId)).limit(1))[0];
      if (!category || !category.isActive) throw httpError(422, "INVALID_CATEGORY", "Category not found or inactive");
    }

    await db
      .update(services)
      .set({
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        categoryId: input.categoryId ?? existing.categoryId,
        serviceMode: input.serviceMode ?? existing.serviceMode,
        priceAmountMinor,
        durationMinutes: input.durationMinutes ?? existing.durationMinutes,
        status: input.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id));
    audit(request.user, "provider.service_updated", "service", id);
    return { ok: true };
  });

  // ── provider bookings list ──
  app.get("/provider/bookings", async (request) => {
    const { profile } = await requireProviderProfile(request);
    const rows = await db
      .select({
        b: bookings,
        serviceTitle: services.title,
        serviceMode: services.serviceMode,
        patientName: users.fullName,
        patientId: users.id,
      })
      .from(bookings)
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .innerJoin(users, eq(users.id, bookings.patientId))
      .where(eq(bookings.providerId, profile.id))
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
        patientId: r.patientId,
        patientName: r.patientName,
        requestedStartAt: r.b.requestedStartAt?.toISOString() ?? null,
        meetingLink: r.b.meetingLink,
        patientNotes: r.b.patientNotes,
        providerNotes: r.b.providerNotes,
        createdAt: r.b.createdAt.toISOString(),
        updatedAt: r.b.updatedAt.toISOString(),
      })),
    };
  });
}
