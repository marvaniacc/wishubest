import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { uuidSchema } from "@wishubest/shared";
import { db } from "../db/client.js";
import { invoiceItems, invoices, payments, providerProfiles, transactions, users } from "../db/schema.js";
import { httpError } from "../lib/httpError.js";
import { requireAuth } from "./guards.js";
import { getPaymentGateway } from "../lib/payments/index.js";
import { env } from "../config.js";
import { splitCommission, lineTotalMinor, sumMinor } from "@wishubest/shared";
import { commissionSettings } from "../db/schema.js";
import { sendInvoicePaidEmail } from "../lib/mailer.js";
import { audit } from "../lib/audit.js";

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  // ── patient lists own invoices ──
  app.get("/patient/invoices", async (request) => {
    const user = requireAuth(request);
    const rows = await db
      .select({
        i: invoices,
        providerName: providerProfiles.displayName,
      })
      .from(invoices)
      .innerJoin(providerProfiles, eq(providerProfiles.id, invoices.providerId))
      .where(eq(invoices.patientId, user.id))
      .orderBy(desc(invoices.createdAt))
      .limit(200);
    return {
      invoices: rows.map((r) => ({
        id: r.i.id,
        number: r.i.number,
        status: r.i.status,
        bookingId: r.i.bookingId,
        patientId: r.i.patientId,
        providerId: r.i.providerId,
        providerName: r.providerName,
        currencyIso: r.i.currencyIso,
        totalMinor: r.i.totalMinor,
        issuedAt: r.i.issuedAt?.toISOString() ?? null,
        paidAt: r.i.paidAt?.toISOString() ?? null,
        items: [],
      })),
    };
  });

  // ── invoice detail (owner patient, owning provider, or admin) ──
  app.get("/invoices/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = z.object({ id: uuidSchema }).parse(request.params);

    const rows = await db
      .select({ i: invoices, providerUserId: providerProfiles.userId })
      .from(invoices)
      .innerJoin(providerProfiles, eq(providerProfiles.id, invoices.providerId))
      .where(eq(invoices.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) throw httpError(404, "NOT_FOUND", "Invoice not found");

    const isOwner = row.i.patientId === user.id;
    const isProvider = row.providerUserId === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isProvider && !isAdmin) throw httpError(403, "FORBIDDEN", "Not your invoice");

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const pays = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(desc(payments.createdAt));

    // invariant check: line totals sum to the invoice total
    const computedTotal = sumMinor(items.map((it) => lineTotalMinor(it.unitPriceMinor, it.quantity)));

    return {
      invoice: {
        id: row.i.id,
        number: row.i.number,
        status: row.i.status,
        bookingId: row.i.bookingId,
        patientId: row.i.patientId,
        providerId: row.i.providerId,
        currencyIso: row.i.currencyIso,
        totalMinor: row.i.totalMinor,
        issuedAt: row.i.issuedAt?.toISOString() ?? null,
        paidAt: row.i.paidAt?.toISOString() ?? null,
        items: items.map((it) => ({
          id: it.id,
          description: it.description,
          serviceId: it.serviceId,
          quantity: it.quantity,
          unitPriceMinor: it.unitPriceMinor,
          totalMinor: it.totalMinor,
        })),
      },
      invariantOk: computedTotal === row.i.totalMinor,
      payments: pays.map((p) => ({
        id: p.id,
        status: p.status,
        gateway: p.gateway,
        gatewayReference: p.gatewayReference,
        amountMinor: p.amountMinor,
        currencyIso: p.currencyIso,
        checkoutUrl: p.checkoutUrl,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  });

  // ── patient starts checkout: create payment + gateway session ──
  app.post(
    "/invoices/:id/pay",
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (request) => {
      const user = requireAuth(request);
      const { id } = z.object({ id: uuidSchema }).parse(request.params);

      const rows = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
      const invoice = rows[0];
      if (!invoice) throw httpError(404, "NOT_FOUND", "Invoice not found");
      if (invoice.patientId !== user.id) throw httpError(403, "FORBIDDEN", "Not your invoice");
      if (invoice.status === "PAID") throw httpError(409, "ALREADY_PAID", "Invoice already paid");
      if (invoice.status !== "PENDING_PAYMENT") throw httpError(409, "INVALID_STATE", `Invoice is ${invoice.status}`);

      const gateway = getPaymentGateway();
      const patient = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0]!;
      const checkout = await gateway.createCheckout({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        amountMinor: invoice.totalMinor,
        currencyIso: invoice.currencyIso,
        description: `WishUBest invoice ${invoice.number}`,
        customerEmail: patient.email,
        successUrl: `${env.WEB_URL}/patient/invoices/${invoice.id}?paid=1`,
        cancelUrl: `${env.WEB_URL}/patient/invoices/${invoice.id}?canceled=1`,
      });

      const [payment] = await db
        .insert(payments)
        .values({
          invoiceId: invoice.id,
          status: "CREATED",
          gateway: gateway.name,
          gatewayReference: checkout.gatewayReference,
          amountMinor: invoice.totalMinor,
          currencyIso: invoice.currencyIso,
          checkoutUrl: checkout.checkoutUrl,
        })
        .onConflictDoNothing({ target: [payments.gateway, payments.gatewayReference] })
        .returning();

      audit(user, "payment.checkout_started", "invoice", invoice.id, { gateway: gateway.name });
      return { checkoutUrl: checkout.checkoutUrl, paymentId: payment?.id ?? null };
    },
  );
}
