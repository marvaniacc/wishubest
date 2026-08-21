import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { reviewInputSchema } from "@wishubest/shared";
import { db } from "../db/client.js";
import { bookings, invoices, providerProfiles, reviews } from "../db/schema.js";
import { httpError } from "../lib/httpError.js";
import { requireAuth } from "./guards.js";
import { audit } from "../lib/audit.js";

export async function reviewRoutes(app: FastifyInstance): Promise<void> {
  // ── patient submits a review (verified: COMPLETED booking + PAID invoice) ──
  app.post("/reviews", async (request, reply) => {
    const user = requireAuth(request);
    if (user.role !== "patient") throw httpError(403, "FORBIDDEN", "Only patients can review");
    const input = reviewInputSchema.parse(request.body);

    const rows = await db
      .select({ b: bookings, invoiceStatus: invoices.status, invoiceId: invoices.id })
      .from(bookings)
      .leftJoin(invoices, eq(invoices.bookingId, bookings.id))
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.patientId, user.id)))
      .limit(1);
    const row = rows[0];
    if (!row || !row.b) throw httpError(404, "NOT_FOUND", "Booking not found");
    if (row.b.status !== "COMPLETED") throw httpError(409, "NOT_COMPLETED", "Only completed bookings can be reviewed");
    if (row.invoiceStatus !== "PAID") throw httpError(409, "NOT_PAID", "Verified reviews require a paid invoice");

    const existing = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.bookingId, input.bookingId)).limit(1);
    if (existing.length > 0) throw httpError(409, "ALREADY_REVIEWED", "This booking already has a review");

    const [review] = await db
      .insert(reviews)
      .values({
        bookingId: input.bookingId,
        providerId: row.b.providerId,
        patientId: user.id,
        rating: input.rating,
        comment: input.comment ?? null,
        status: "pending",
      })
      .returning();

    audit(user, "review.submitted", "review", review!.id, { providerId: row.b.providerId });
    reply.code(201).send({ review: { id: review!.id, status: review!.status } });
  });

  // ── patient sees own reviews ──
  app.get("/patient/reviews", async (request) => {
    const user = requireAuth(request);
    const rows = await db
      .select({ r: reviews, providerName: providerProfiles.displayName })
      .from(reviews)
      .innerJoin(providerProfiles, eq(providerProfiles.id, reviews.providerId))
      .where(eq(reviews.patientId, user.id))
      .orderBy(desc(reviews.createdAt));
    return {
      reviews: rows.map((r) => ({
        id: r.r.id,
        bookingId: r.r.bookingId,
        providerId: r.r.providerId,
        providerName: r.providerName,
        rating: r.r.rating,
        comment: r.r.comment,
        status: r.r.status,
        createdAt: r.r.createdAt.toISOString(),
      })),
    };
  });
}

/** Recalculate provider rating from APPROVED reviews only. Called after moderation changes. */
export async function recalcProviderRating(providerId: string): Promise<void> {
  const [agg] = await db
    .select({
      count: sql<number>`count(*)::int`,
      avg: sql<string | null>`round(avg(${reviews.rating})::numeric, 2)`,
    })
    .from(reviews)
    .where(and(eq(reviews.providerId, providerId), eq(reviews.status, "approved")));

  await db
    .update(providerProfiles)
    .set({
      reviewCount: agg?.count ?? 0,
      ratingAvg: agg?.avg ?? null,
      updatedAt: new Date(),
    })
    .where(eq(providerProfiles.id, providerId));
}

