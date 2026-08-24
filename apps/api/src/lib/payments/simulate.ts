import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { invoices, payments } from "../../db/schema.js";
import { env } from "../../config.js";
import { processWebhookEvent } from "./process.js";

/**
 * Test-only payment simulator, active exclusively when E2E_PAYMENT_MODE=simulated
 * is set (never in normal production). It produces the exact same DB state a
 * real gateway checkout session would (payments row + webhook-driven
 * transition) so automated e2e flows exercise the production code paths.
 * Access is gated by an HMAC token derived from E2E_WEBHOOK_SECRET.
 */

export function simulatedModeEnabled(): boolean {
  return (
    env().E2E_PAYMENT_MODE === "simulated" &&
    !!env().E2E_WEBHOOK_SECRET &&
    !process.env.STRIPE_SECRET_KEY
  );
}

function tokenFor(paymentRef: string): string {
  return createHmac("sha256", env().E2E_WEBHOOK_SECRET!)
    .update(paymentRef)
    .digest("hex");
}

export async function createSimulatedCheckout(invoiceId: string): Promise<string | null> {
  const rows = await db().db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const invoice = rows[0];
  if (!invoice) return null;
  const ref = `sim_${randomUUID()}`;
  await db().db.insert(payments).values({
    invoiceId: invoice.id,
    gateway: "simulated",
    gatewayRef: ref,
    amountMinor: invoice.totalMinor,
    currencyIso: invoice.currencyIso,
    status: "PROCESSING",
  });
  return `/api/payments/simulate/${ref}?token=${tokenFor(ref)}`;
}

export async function handleSimulate(
  ref: string,
  token: string,
  confirm: boolean,
): Promise<{ ok: boolean; status: number }> {
  const expected = tokenFor(ref);
  const a = Buffer.from(token ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 403 };
  }
  if (!confirm) {
    return { ok: true, status: 200 }; // caller renders the confirmation page
  }
  // Apply success through the same idempotent pipeline as real webhooks.
  const evt = {
    eventId: `evt_sim_${randomUUID()}`,
    type: "payment_succeeded" as const,
    paymentRef: ref,
    amountMinor: null,
    currencyIso: null,
  };
  const gw = { name: "simulated", verifyWebhook: () => [] as never[] };
  await processWebhookEvent(gw as never, evt, { simulated: true });
  return { ok: true, status: 200 };
}

export async function findSimulatedPayment(ref: string) {
  const rows = await db()
    .db.select({
      id: payments.id,
      amountMinor: payments.amountMinor,
      number: invoices.number,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(and(eq(payments.gatewayRef, ref), eq(payments.gateway, "simulated")))
    .limit(1);
  return rows[0] ?? null;
}
