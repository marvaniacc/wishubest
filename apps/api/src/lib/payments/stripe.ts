import Stripe from "stripe";
import { env } from "../../config.js";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentGateway,
  WebhookEvent,
} from "./gateway.js";

let stripe: Stripe | null = null;

function client(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required when PAYMENT_GATEWAY=stripe");
  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
  }
  return stripe;
}

export const stripeGateway: PaymentGateway = {
  name: "stripe",

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const session = await client().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currencyIso.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: input.description.slice(0, 120) },
          },
        },
      ],
      metadata: { invoiceId: input.invoiceId },
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 24 * 3600,
    });
    if (!session.url || !session.id) throw new Error("Stripe checkout session missing url/id");
    return { gatewayReference: session.id, checkoutUrl: session.url };
  },

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookEvent {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is required");
    const sig = headers["stripe-signature"];
    if (typeof sig !== "string") throw new Error("Missing stripe-signature header");

    const event = client().webhooks.constructEvent(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    ) as Stripe.Event;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.id) throw new Error("Webhook session missing id");
        return {
          gatewayReference: session.id,
          type: "payment_succeeded",
          paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          raw: event,
        };
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          gatewayReference: session.id!,
          type: "payment_failed",
          failureReason: event.type,
          raw: event,
        };
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        return {
          gatewayReference: intent.latest_charge as string ?? intent.id,
          type: "payment_failed",
          failureReason: intent.last_payment_error?.message ?? "payment_intent.payment_failed",
          raw: event,
        };
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const refId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : typeof charge.payment_intent?.id === "string"
              ? charge.payment_intent.id
              : charge.id;
        return {
          gatewayReference: refId,
          type: "refund",
          raw: event,
        };
      }
      default:
        throw new UnhandledWebhookType(event.type);
    }
  },
};

export class UnhandledWebhookType extends Error {
  constructor(type: string) {
    super(`Unhandled Stripe webhook type: ${type}`);
  }
}
