import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  bookings,
  commissionSettings,
  invoices,
  payments,
  providerProfiles,
  transactions,
  users,
} from "../db/schema.js";
import { splitCommission } from "@wishubest/shared";
import { getPaymentGateway } from "../lib/payments/index.js";
import { sendInvoicePaidEmail, sendPaymentFailedEmail } from "../lib/mailer.js";
import { getActiveCurrency } from "./catalog.js";

/**
 * Webhook endpoint — the ONLY path that marks an invoice PAID and writes the
 * transaction row. Idempotency guarantees:
 *  - invoices.status transition guarded by `status = 'PENDING_PAYMENT'` predicate
 *  - transactions has UNIQUE(invoice_id) + insert-only
 *  - payments updated by unique (gateway, gateway_reference)
 * Duplicate webhooks converge to the same state with zero duplicate rows.
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/webhooks/payments", { config: { rateLimit: { max: 600, timeWindow: "1 minute" } } }, async (request, reply) => {
    const gateway = getPaymentGateway();

    let event;
    try {
      const raw = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
      event = gateway.parseWebhook(raw, request.headers);
    } catch (err) {
      request.log.warn({ err }, "webhook signature verification failed");
      reply.code(400).send({ error: { code: "BAD_SIGNATURE", message: "Webhook signature verification failed" } });
      return;
    }

    // resolve payment by gateway reference (unique anchor)
    const payRows = await db
      .select()
      .from(payments)
      .where(and(eq(payments.gateway, gateway.name), eq(payments.gatewayReference, event.gatewayReference)))
      .limit(1);
    const payment = payRows[0];

    switch (event.type) {
      case "checkout_completed":
      case "payment_succeeded": {
        if (!payment) {
          // Unknown reference: acknowledge (200) so the gateway stops retrying; nothing to do.
          reply.send({ received: true, ignored: "unknown_reference" });
          return;
        }

        // Idempotent state transition: only PENDING_PAYMENT → PAID wins.
        const paidInvoices = await db
          .update(invoices)
          .set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
          .where(and(eq(invoices.id, payment.invoiceId), eq(invoices.status, "PENDING_PAYMENT")))
          .returning();
        const invoice = paidInvoices[0];

        await db
          .update(payments)
          .set({ status: "SUCCEEDED", gatewayPaymentIntentId: event.paymentIntentId ?? payment.gatewayPaymentIntentId, updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        if (invoice) {
          // booking → CONFIRMED
          await db
            .update(bookings)
            .set({ status: "CONFIRMED", updatedAt: new Date() })
            .where(and(eq(bookings.id, invoice.bookingId), eq(bookings.status, "AWAITING_PAYMENT")));

          // commission snapshot at payment time (rates read NOW, never changed later)
          const provider = (
            await db.select().from(providerProfiles).where(eq(providerProfiles.id, invoice.providerId)).limit(1)
          )[0]!;
          const settings = (
            await db
              .select()
              .from(commissionSettings)
              .where(eq(commissionSettings.providerType, provider.providerType))
              .limit(1)
          )[0];
          const rateBps = settings?.platformFeeRateBps ?? 0;
          const split = splitCommission(invoice.totalMinor, rateBps);

          // insert-only; UNIQUE(invoice_id) makes retries harmless
          await db
            .insert(transactions)
            .values({
              invoiceId: invoice.id,
              providerId: invoice.providerId,
              grossMinor: split.grossMinor,
              platformFeeRateBps: split.platformFeeRateBps,
              platformFeeMinor: split.platformFeeMinor,
              providerNetMinor: split.providerNetMinor,
              affiliateCommissionRateBps: settings?.affiliateCommissionRateBps ?? 0,
              affiliateCommissionMinor: 0, // affiliate share ships post-MVP
              currencyIso: invoice.currencyIso,
            })
            .onConflictDoNothing({ target: transactions.invoiceId });

          // receipt email (async)
          const currency = await getActiveCurrency();
          const patient = (await db.select().from(users).where(eq(users.id, invoice.patientId)).limit(1))[0];
          if (patient && currency) {
            void sendInvoicePaidEmail(patient.email, patient.fullName, invoice.number, invoice.totalMinor, {
              isoCode: currency.isoCode,
              symbol: currency.symbol,
              decimalPlaces: currency.decimalPlaces,
            });
          }
        }
        reply.send({ received: true });
        return;
      }

      case "payment_failed": {
        if (payment) {
          await db
            .update(payments)
            .set({ status: "FAILED", failureReason: event.failureReason ?? "unknown", updatedAt: new Date() })
            .where(and(eq(payments.id, payment.id), eq(payments.status, "CREATED")));
          const invoice = (await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).limit(1))[0];
          const currency = await getActiveCurrency();
          const patient = invoice ? (await db.select().from(users).where(eq(users.id, invoice.patientId)).limit(1))[0] : undefined;
          if (invoice && patient && currency) {
            void sendPaymentFailedEmail(patient.email, patient.fullName, invoice.number, invoice.totalMinor, {
              isoCode: currency.isoCode,
              symbol: currency.symbol,
              decimalPlaces: currency.decimalPlaces,
            });
          }
        }
        reply.send({ received: true });
        return;
      }

      case "refund": {
        // MVP has no refund flow; record state only for reconciliation.
        if (payment) {
          await db.update(payments).set({ status: "REFUNDED", updatedAt: new Date() }).where(eq(payments.id, payment.id));
          await db
            .update(invoices)
            .set({ status: "REFUNDED", updatedAt: new Date() })
            .where(and(eq(invoices.id, payment.invoiceId), eq(invoices.status, "PAID")));
        }
        reply.send({ received: true });
        return;
      }
    }
  });
}
