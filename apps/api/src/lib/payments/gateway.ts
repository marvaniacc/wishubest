/**
 * PaymentGateway — the single abstraction over payment providers.
 * MVP ships Stripe (real gateway) + TestGateway (sandbox for local/e2e only).
 * Add a second real provider later by implementing this interface.
 */
export interface CreateCheckoutInput {
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number;
  currencyIso: string; // ISO alpha-3, lowercase for Stripe
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  gatewayReference: string; // unique per attempt; webhook idempotency anchors on this
  checkoutUrl: string;
}

export interface WebhookEvent {
  gatewayReference: string;
  type: "checkout_completed" | "payment_succeeded" | "payment_failed" | "refund";
  paymentIntentId?: string;
  failureReason?: string;
  raw: unknown;
}

export interface PaymentGateway {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /** Verify signature & parse payload. Throws on invalid signature. */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookEvent;
}
