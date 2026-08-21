import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../db/client.js";
import { eq, sql } from "drizzle-orm";
import { payments, transactions, invoices, bookings, services, providerProfiles, users, kycDocuments } from "../db/schema.js";
import { buildTestWebhook } from "../lib/payments/test.js";
import { webhookRoutes } from "../routes/webhooks.js";

describe("payment webhook idempotency", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.register(webhookRoutes, { prefix: "/api" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db.execute(sql`TRUNCATE TABLE ${transactions}, ${payments}, ${invoices}, ${bookings}, ${services}, ${providerProfiles}, ${kycDocuments}, ${users} CASCADE`);
    await pool.end();
  });

  it("duplicate webhooks never create duplicate transactions", async () => {
    // seed minimal provider + patient + service + booking + invoice + payment row
    const [user] = await db.insert(users).values({ email: "pt@example.com", passwordHash: "x", fullName: "P" }).returning();
    const [provider] = await db.insert(users).values({ email: "pr@example.com", passwordHash: "x", fullName: "D", role: "provider" }).returning();
    const [profile] = await db.insert(providerProfiles).values({ userId: provider.id, providerType: "doctor", displayName: "Dr Test", slug: "dr-test-x", status: "active", kycStatus: "approved" }).returning();
    const [svc] = await db.insert(services).values({ providerProfileId: profile.id, title: "Consult", serviceMode: "online", pricingModel: "fixed", priceAmountMinor: 5000, status: "active" }).returning();
    const [booking] = await db.insert(bookings).values({ patientId: user.id, providerId: profile.id, serviceId: svc.id, status: "AWAITING_PAYMENT" }).returning();
    const [invoice] = await db.insert(invoices).values({ number: "INV-TEST-01", bookingId: booking.id, patientId: user.id, providerId: profile.id, currencyIso: "USD", totalMinor: 5000, status: "PENDING_PAYMENT", issuedAt: new Date() }).returning();
    const ref = "test_cs_idem";
    await db.insert(payments).values({ invoiceId: invoice.id, status: "CREATED", gateway: "test", gatewayReference: ref, amountMinor: 5000, currencyIso: "USD" });

    const { body, headers } = buildTestWebhook(ref, "payment_succeeded");

    // fire it 3 times (simulating Stripe retries)
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: "POST", url: "/webhooks/payments", payload: body, headers });
      expect(res.statusCode).toBe(200);
    }

    const txns = await db.select().from(transactions);
    expect(txns).toHaveLength(1); // exactly one, despite 3 webhooks
    expect(txns[0]!.grossMinor).toBe(5000);
    expect(txns[0]!.platformFeeRateBps).toBe(1000);
    expect(txns[0]!.platformFeeMinor).toBe(500);
    expect(txns[0]!.providerNetMinor).toBe(4500);

    const inv = (await db.select().from(invoices).where(eq(invoices.id, invoice.id)))[0]!;
    expect(inv.status).toBe("PAID");
  });
});

