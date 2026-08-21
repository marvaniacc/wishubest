import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { invoices, payments } from "../../db/schema.js";
import { buildTestWebhook } from "./test.js";

/**
 * Dev-only sandbox checkout page for the TestGateway. Simulates the hosted
 * payment page: "Pay now"/"Simulate failure" posts a properly signed webhook
 * back to the API, exercising the exact same idempotent path Stripe uses.
 */
export async function registerTestCheckout(app: FastifyInstance): Promise<void> {
  app.get("/payments/test-checkout/:reference", async (request, reply) => {
    const { reference } = request.params as { reference: string };
    const rows = await db
      .select({
        p: payments,
        invoiceNumber: invoices.number,
        amountMinor: invoices.totalMinor,
        invoiceStatus: invoices.status,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(and(eq(payments.gateway, "test"), eq(payments.gatewayReference, reference)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      reply.code(404).send({ error: { code: "NOT_FOUND", message: "Unknown checkout reference" } });
      return;
    }

    const action = (request.query as { action?: string }).action;
    if (action === "pay" || action === "fail") {
      const { body, headers } = buildTestWebhook(
        reference,
        action === "pay" ? "payment_succeeded" : "payment_failed",
      );
      await app.inject({ method: "POST", url: "/webhooks/payments", payload: body, headers });
      const inv = await db
        .select({ status: invoices.status })
        .from(invoices)
        .where(eq(invoices.id, row.p.invoiceId))
        .limit(1);
      reply.type("text/html").send(sandboxPage(row.invoiceNumber, row.p.amountMinor, inv[0]?.status ?? row.invoiceStatus, action));
      return;
    }

    reply.type("text/html").send(sandboxPage(row.invoiceNumber, row.p.amountMinor, row.invoiceStatus, null));
  });
}

function sandboxPage(
  invoiceNumber: string,
  amountMinor: number,
  invoiceStatus: string,
  acted: string | null,
): string {
  const result =
    acted === "pay"
      ? `<p style="color:#0b6e4f;font-weight:600">Payment succeeded. Invoice status: ${invoiceStatus}. You may close this tab and return to WishUBest.</p>`
      : acted === "fail"
        ? `<p style="color:#b00020;font-weight:600">Payment failed. Retry from your WishUBest dashboard.</p>`
        : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>TestGateway Sandbox</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:60px auto;padding:24px;color:#1f2933">
<h2 style="margin:0">TestGateway Sandbox</h2>
<p style="color:#6b7280">Invoice ${invoiceNumber} — ${(amountMinor / 100).toFixed(2)}</p>
${result}
<div style="display:flex;gap:12px;margin-top:20px">
<a href="?action=pay" style="background:#0b6e4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Pay now</a>
<a href="?action=fail" style="background:#b00020;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Simulate failure</a>
</div>
<p style="color:#9ca3af;font-size:12px;margin-top:24px">Development sandbox — never exposed in production.</p>
</body></html>`;
}
