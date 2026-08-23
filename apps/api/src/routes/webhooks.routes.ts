import type { FastifyInstance } from "fastify";
import { gateway } from "../lib/payments/stripe.js";
import { processWebhookEvent } from "../lib/payments/process.js";

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.post(
    "/webhooks/stripe",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const gw = gateway();
      if (!gw) return reply.code(503).send({ error: "payments_not_configured" });

      const signature =
        (req.headers["stripe-signature"] as string | undefined) ?? undefined;
      let events;
      try {
        events = gw.verifyWebhook(req.rawBody ?? Buffer.alloc(0), signature);
      } catch (err) {
        req.log.warn({ err }, "webhook_signature_invalid");
        return reply.code(400).send({ error: "invalid_signature" });
      }

      let handled = 0;
      for (const evt of events) {
        const res = await processWebhookEvent(gw, evt, req.body);
        if (!res.duplicate) handled++;
      }
      return { received: true, handled };
    },
  );
}
