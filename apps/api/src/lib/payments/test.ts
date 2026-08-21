import { randomUUID } from "node:crypto";
import { env } from "../../config.js";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentGateway,
  WebhookEvent,
} from "./gateway.js";

/**
 * TestGateway — a sandbox gateway used ONLY for development, tests and e2e.
 * Creates fake checkout sessions and exposes a helper to synthesize signed
 * webhook events, so the full invoice→PAID→transaction flow can be tested
 * without Stripe credentials. MUST NOT be used in production.
 */
export const testGateway: PaymentGateway = {
  name: "test",

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const gatewayReference = `test_cs_${randomUUID()}`;
    const checkoutUrl = `${env.API_URL}/payments/test-checkout/${gatewayReference}?invoice=${input.invoiceId}`;
    return { gatewayReference, checkoutUrl };
  },

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookEvent {
    const sig = headers["x-test-signature"];
    if (sig !== "test-signature") throw new Error("Invalid test gateway signature");
    const parsed = JSON.parse(rawBody.toString("utf8")) as { gatewayReference: string; type: WebhookEvent["type"]; paymentIntentId?: string; failureReason?: string };
    if (!parsed.gatewayReference) throw new Error("Missing gatewayReference in test webhook");
    return { ...parsed, raw: parsed };
  },
};

/** Helper for dev/e2e: build a webhook payload the TestGateway accepts. */
export function buildTestWebhook(
  gatewayReference: string,
  type: WebhookEvent["type"],
): { body: Buffer; headers: Record<string, string> } {
  return {
    body: Buffer.from(JSON.stringify({ gatewayReference, type, paymentIntentId: `test_pi_${gatewayReference}` })),
    headers: { "content-type": "application/json", "x-test-signature": "test-signature" },
  };
}
