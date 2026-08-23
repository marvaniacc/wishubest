import Stripe from "stripe";
import { env } from "../../config.js";
import type {
  CheckoutInput,
  CheckoutResult,
  NormalizedEvent,
  PaymentGateway,
} from "./types.js";

export class StripeGateway implements PaymentGateway {
  readonly name = "stripe";
  private client: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.client = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  static configured(): StripeGateway | null {
    const e = env();
    if (e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET) {
      return new StripeGateway(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET);
    }
    return null;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: input.customerEmail,
      client_reference_id: input.invoiceNumber,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currencyIso.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: `WishUBest invoice ${input.invoiceNumber}`, description: input.description },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    });
    if (!session.id || !session.url) throw new Error("stripe_checkout_create_failed");
    return { gatewayRef: session.id, checkoutUrl: session.url };
  }

  verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): NormalizedEvent[] {
    if (!signatureHeader) throw new Error("missing_signature");
    const event = this.client.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    const out: NormalizedEvent[] = [];
    const mapSession = (
      session: Stripe.Checkout.Session,
      type: NormalizedEvent["type"],
    ): NormalizedEvent => ({
      eventId: event.id,
      type,
      paymentRef: session.id,
      amountMinor: session.amount_total ?? null,
      currencyIso: session.currency ? session.currency.toUpperCase() : null,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        out.push(mapSession(s, "payment_succeeded"));
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        out.push(mapSession(s, "payment_succeeded"));
        break;
      }
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        out.push(mapSession(s, "payment_failed"));
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        out.push(mapSession(s, "payment_canceled"));
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.["checkout_sid"]) {
          out.push({
            eventId: event.id,
            type: "payment_failed",
            paymentRef: pi.metadata["checkout_sid"]!,
            amountMinor: pi.amount ?? null,
            currencyIso: pi.currency ? pi.currency.toUpperCase() : null,
          });
        }
        break;
      }
      default:
        // Unrecognized types are acknowledged but ignored.
        break;
    }
    return out;
  }
}

let instance: PaymentGateway | null | undefined;

export function gateway(): PaymentGateway | null {
  if (instance === undefined) instance = StripeGateway.configured();
  return instance;
}
