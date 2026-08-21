import { buildApp } from "./app.js";
import { env } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { providerRoutes } from "./routes/provider.js";
import { bookingRoutes } from "./routes/bookings.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { reviewRoutes } from "./routes/reviews.js";
import { adminRoutes } from "./routes/admin.js";

const app = await buildApp();

// raw body capture for webhook signature verification (must precede routes)
app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
  (req as { rawBody?: Buffer }).rawBody = body as Buffer;
  try {
    done(null, JSON.parse(body.toString("utf8")));
  } catch {
    done(new Error("Invalid JSON"), undefined);
  }
});

await app.register(authRoutes, {});
await app.register(catalogRoutes, {});
await app.register(providerRoutes, {});
await app.register(bookingRoutes, {});
await app.register(invoiceRoutes, {});
await app.register(webhookRoutes, {});
await app.register(reviewRoutes, {});
await app.register(adminRoutes, {});

// health check
app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

if (env.NODE_ENV !== "production") {
  const { registerTestCheckout } = await import("./lib/payments/test-checkout.js");
  await registerTestCheckout(app);
}

try {
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  console.log(`[api] listening on ${env.API_HOST}:${env.API_PORT}`);
  if (env.NODE_ENV !== "test") {
    await runMigrations().catch((err) => {
      console.error("[api] migration failure:", err);
      process.exit(1);
    });
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
