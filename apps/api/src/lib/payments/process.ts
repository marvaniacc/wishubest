import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  bookings,
  invoices,
  paymentEvents,
  payments,
  providerProfiles,
  transactions,
  commissionSettings,
  serviceSlots,
  users,
} from "../../db/schema.js";
import type { NormalizedEvent, PaymentGateway } from "./types.js";
import { feeMinor, netMinor } from "@wishubest/shared";
import { mails } from "../mailer.js";

/**
 * Idempotent webhook processing:
 *  1. The event id is inserted into payment_events with a unique constraint.
 *     If the insert conflicts, the event was already processed → no-op.
 *  2. Business effects run inside one DB transaction.
 *  3. The transactions row is insert-only; its unique invoice_id makes even
 *     a hypothetical double-application harmless (second insert is a no-op).
 */

export async function processWebhookEvent(
  gw: PaymentGateway,
  evt: NormalizedEvent,
  rawPayload: unknown,
): Promise<{ duplicate: boolean }> {
  const inserted = await db()
    .db.insert(paymentEvents)
    .values({
      gateway: gw.name,
      eventId: evt.eventId,
      eventType: evt.type,
      paymentRef: evt.paymentRef,
      payload: rawPayload as never,
    })
    .onConflictDoNothing({ target: [paymentEvents.gateway, paymentEvents.eventId] })
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) return { duplicate: true };
  await applyEvent(gw.name, evt);
  return { duplicate: false };
}

async function applyEvent(gatewayName: string, evt: NormalizedEvent): Promise<void> {
  const d = db().db;
  await d.transaction(async (tx) => {
    // Lock the payment row to serialize concurrent webhook deliveries.
    const payRows = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.gateway, gatewayName), eq(payments.gatewayRef, evt.paymentRef)))
      .for("update")
      .limit(1);
    const payment = payRows[0];
    if (!payment) return; // unknown ref — recorded but nothing to apply

    if (evt.type === "payment_succeeded") {
      await applySucceeded(tx, payment.id, evt);
    } else {
      const status =
        evt.type === "payment_failed" ? ("FAILED" as const) : ("CANCELED" as const);
      if (["CREATED", "PROCESSING", "REQUIRES_ACTION"].includes(payment.status)) {
        await tx
          .update(payments)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)));
        const inv = await tx.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).limit(1);
        const booking = inv[0]
          ? await tx.select().from(bookings).where(eq(bookings.id, inv[0].bookingId)).limit(1)
          : [];
        if (inv[0] && booking[0]) {
          void mails.paymentFailed(await emailOf(inv[0].patientId), booking[0].code);
        }
      }
    }
  });
}

type DB = ReturnType<typeof db>["db"];
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type { Tx };

async function applySucceeded(tx: Tx, paymentId: string, evt: NormalizedEvent): Promise<void> {
  const payRows = await tx
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .for("update")
    .limit(1);
  const payment = payRows[0];
  if (!payment) return;

  // Amount & currency verification — never trust unverified amounts.
  if (
    evt.amountMinor !== null &&
    Number.isSafeInteger(evt.amountMinor) &&
    evt.amountMinor !== payment.amountMinor
  ) {
    await tx
      .update(payments)
      .set({ status: "FAILED", failureReason: "amount_mismatch", updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    throw new Error(`amount_mismatch: expected ${payment.amountMinor} got ${evt.amountMinor}`);
  }

  if (payment.status === "SUCCEEDED") {
    await ensureTransactionRow(tx, payment.id); // defensive re-apply
    return;
  }

  await tx
    .update(payments)
    .set({ status: "SUCCEEDED", failureReason: null, updatedAt: new Date() })
    .where(eq(payments.id, payment.id));

  const invRows = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, payment.invoiceId))
    .for("update")
    .limit(1);
  const invoice = invRows[0];
  if (!invoice) throw new Error("invoice_missing_for_payment");

  let invoiceJustPaid = false;
  if (invoice.status !== "PAID") {
    await tx
      .update(invoices)
      .set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoices.id, invoice.id), eq(invoices.status, invoice.status)));
    invoiceJustPaid = true;
  }

  await ensureTransactionRow(tx, payment.id);

  if (invoiceJustPaid && invoice.status === "PENDING_PAYMENT") {
    const bkRows = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, invoice.bookingId))
      .for("update")
      .limit(1);
    const booking = bkRows[0];
    if (booking && booking.status === "AWAITING_PAYMENT") {
      await tx
        .update(bookings)
        .set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));
      if (booking.slotId) {
        await tx
          .update(serviceSlots)
          .set({ status: "booked" })
          .where(eq(serviceSlots.id, booking.slotId));
      }
      void mails.invoicePaid(
        await emailOf(booking.patientId),
        invoice.number,
        booking.code,
      );
    }
  }
}

/** Insert-only financial record. Unique(invoice_id) + onConflictDoNothing ⇒ idempotent. */
async function ensureTransactionRow(tx: Tx, paymentId: string): Promise<void> {
  const payRows = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const payment = payRows[0];
  if (!payment || payment.status !== "SUCCEEDED") return;

  const invRows = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, payment.invoiceId))
    .limit(1);
  const invoice = invRows[0];
  if (!invoice) throw new Error("invoice_missing_for_transaction");

  const existing = await tx
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.invoiceId, invoice.id))
    .limit(1);
  if (existing[0]) return;

  const provRows = await tx
    .select({
      providerType: providerProfiles.providerType,
      platformFeeRateBps: commissionSettings.platformFeeRateBps,
      affiliateCommissionRateBps: commissionSettings.affiliateCommissionRateBps,
    })
    .from(providerProfiles)
    .leftJoin(
      commissionSettings,
      eq(commissionSettings.providerType, providerProfiles.providerType),
    )
    .where(eq(providerProfiles.id, invoice.providerId))
    .limit(1);
  const cfg = provRows[0];
  if (!cfg) throw new Error("provider_missing_for_transaction");

  const rateBps = cfg.platformFeeRateBps ?? 0;
  const gross = invoice.totalMinor;
  const fee = feeMinor(gross, rateBps);
  const net = netMinor(gross, rateBps);
  const affiliateRate = cfg.affiliateCommissionRateBps ?? 0;

  await tx
    .insert(transactions)
    .values({
      invoiceId: invoice.id,
      paymentId: payment.id,
      providerId: invoice.providerId,
      currencyIso: invoice.currencyIso,
      grossMinor: gross,
      platformFeeRateBps: rateBps,
      platformFeeMinor: fee,
      providerNetMinor: net,
      affiliateCommissionRateBps: affiliateRate,
      affiliateCommissionMinor: feeMinor(gross, affiliateRate),
    })
    .onConflictDoNothing({ target: transactions.invoiceId });
}

async function emailOf(userId: string): Promise<string> {
  const rows = await db()
    .db.select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.email ?? "";
}
