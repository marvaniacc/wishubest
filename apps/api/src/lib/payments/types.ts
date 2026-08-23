/**
 * PaymentGateway abstraction — a second provider can be added later without
 * touching business logic (Section 5 multi-gateway future).
 */
export interface CheckoutInput {
  invoiceNumber: string;
  amountMinor: number;
  currencyIso: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface CheckoutResult {
  /** Provider-side reference (e.g. Stripe checkout session / payment intent id). */
  gatewayRef: string;
  checkoutUrl: string;
}

export type GatewayEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "payment_canceled"
  | "requires_action";

export interface NormalizedEvent {
  eventId: string;
  type: GatewayEventType;
  /** Reference that links back to our payments.gateway_ref */
  paymentRef: string;
  amountMinor: number | null;
  currencyIso: string | null;
}

export interface PaymentGateway {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Verify signature over the RAW body; throw on tampering. Returns normalized events. */
  verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): NormalizedEvent[];
}
