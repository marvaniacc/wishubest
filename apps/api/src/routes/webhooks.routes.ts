import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { gateway } from "../lib/payments/stripe.js";
import { processWebhookEvent } from "../lib/payments/process.js";
import {
  simulatedModeEnabled,
  handleSimulate,
  findSimulatedPayment,
} from "../lib/payments/simulate.js";

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

  registerSimulatedPaymentRoutes(app);
}

function registerSimulatedPaymentRoutes(app: FastifyInstance) {
  const simParams = z.object({ ref: z.string().min(8).max(80) });
  const simQuery = z.object({ token: z.string().min(16).max(128), confirm: z.enum(["1", "0"]).optional() });

  app.get("/payments/simulate/:ref", async (req, reply) => {
    if (!simulatedModeEnabled()) return reply.code(404).send({ error: "not_found" });
    const { ref } = simParams.parse(req.params);
    const q = simQuery.parse(req.query);
    const res = await handleSimulate(ref, q.token, false);
    if (!res.ok) return reply.code(res.status).send({ error: "forbidden" });
    const pay = await findSimulatedPayment(ref);
    if (!pay) return reply.code(404).send({ error: "not_found" });
    const backUrl = `${process.env.APP_URL ?? ""}/en/dashboard/bookings?paid=1`;
    if (pay.status === "SUCCEEDED") {
      return reply
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .send(
          `<!doctype html><html><head><meta http-equiv="refresh" content="1.2;url=${backUrl}"><title>Paid — ${pay.number}</title></head>
<body style="display:grid;place-items:center;min-height:90vh;background:#F5F6F2;font-family:sans-serif">
<div style="text-align:center"><h1 style="color:#3F7D58">Payment succeeded ✓</h1>
<p>Invoice ${pay.number} — ${(pay.amountMinor / 100).toFixed(2)}</p>
<p style="color:#4B5A56;font-size:13px">Redirecting…</p></div></body></html>`,
        );
    }
    return reply
      .header("content-type", "text/html; charset=utf-8")
      .header("cache-control", "no-store")
      .send(
        `<!doctype html><html><head><title>Checkout — ${pay.number}</title></head>
<body style="display:grid;place-items:center;min-height:90vh;background:#F5F6F2;font-family:sans-serif;margin:0">
<div style="background:#fff;border:1px solid #DEDCD1;border-radius:12px;padding:32px;text-align:center;min-width:280px">
<p style="color:#4B5A56;font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin-top:0">TEST MODE — simulated gateway</p>
<h2 style="color:#0E4F4A">Invoice ${pay.number}</h2>
<p style="font-size:28px;font-weight:700;color:#16211E">${(pay.amountMinor / 100).toFixed(2)}</p>
<button id="pay" type="button" style="background:#C98A3E;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:15px;font-weight:700;cursor:pointer">Pay now</button>
<script>
document.getElementById("pay").addEventListener("click", function () {
  var m = document.cookie.match(/(?:^|; )wub_csrf=([^;]*)/);
  var btn = document.getElementById("pay");
  btn.disabled = true;
  fetch(window.location.pathname + window.location.search, {
    method: "POST",
    headers: { "x-csrf-token": m ? decodeURIComponent(m[1]) : "" }
  }).then(function (r) {
    if (r.ok) { location.reload(); }
    else { r.text().then(function (t) { btn.textContent = "Error " + t.slice(0, 120); btn.disabled = false; }); }
  });
});
</script>
</div></body></html>`,
      );
  });

  app.post("/payments/simulate/:ref", async (req, reply) => {
    if (!simulatedModeEnabled()) return reply.code(404).send({ error: "not_found" });
    const { ref } = simParams.parse(req.params);
    const q = simQuery.parse(req.query);
    const res = await handleSimulate(ref, q.token, true);
    if (!res.ok) return reply.code(res.status).send({ error: "forbidden" });
    const pay = await findSimulatedPayment(ref);
    const url = `${process.env.APP_URL ?? ""}/en/dashboard/bookings?paid=1`;
    return reply
      .header("content-type", "text/html; charset=utf-8")
      .header("cache-control", "no-store")
      .send(
        `<!doctype html><html><head><meta http-equiv="refresh" content="1.5;url=${url}"></head>
<body style="display:grid;place-items:center;min-height:90vh;background:#F5F6F2;font-family:sans-serif">
<div style="text-align:center"><h1 style="color:#3F7D58">Payment succeeded ✓</h1>
${pay ? `<p>Invoice ${pay.number}</p>` : ""}
<p style="color:#4B5A56;font-size:13px">Redirecting…</p></div></body></html>`,
      );
  });
}
