import Fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { env } from "./config.js";
import { loadSessionUser } from "./lib/sessions.js";
import { verifyCsrf, ensureCsrfCookie } from "./lib/csrf.js";
import { registerRoutes } from "./routes/index.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export async function buildServer(opts: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: opts.logger ?? env().NODE_ENV === "production",
    trustProxy: true,
    bodyLimit: 12 * 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    keyGenerator: (req) => `${req.user?.id ?? "anon"}:${req.ip}`,
  });

  // Preserve raw body for webhook signature verification.
  app.addHook("preParsing", async (req: FastifyRequest, _reply, payload) => {
    if (req.url.startsWith("/webhooks/")) {
      const chunks: Buffer[] = [];
      for await (const chunk of payload) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks);
      req.rawBody = raw;
      const { Readable } = await import("node:stream");
      const stream = new Readable();
      stream.push(raw);
      stream.push(null);
      return stream;
    }
    return payload;
  });

  app.addHook("onRequest", async (req, reply) => {
    req.user = await loadSessionUser(req);
    if (!req.cookies["wub_csrf"]) ensureCsrfCookie(reply, undefined);
  });

  app.addHook("preHandler", async (req, reply) => {
    await verifyCsrf(req, reply);
  });

  app.setErrorHandler((err, req, reply) => {
    const e = err as Error & { statusCode?: number };
    if (e instanceof ZodError || e.name === "ZodError") {
      return reply.code(400).send({ error: "validation_failed", details: e.message });
    }
    const status = typeof e.statusCode === "number" ? e.statusCode : 500;
    if (status >= 500) req.log.error(e);
    void reply.code(status).send({
      error: status < 500 ? e.message : "internal_error",
    });
  });

  app.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));

  await registerRoutes(app);

  return app;
}

const entryArg = (process.argv[1] ?? "").replace(/\\/g, "/");
if (/\/(dist\/)?index\.(js|ts|mjs)$/.test(entryArg)) {
  const e = env();
  const port = Number(process.env.PORT ?? 4000);
  buildServer()
    .then(async (app) => {
      const { startExpirySweeper } = await import("./lib/bookings.js");
      startExpirySweeper();
      await app.listen({ port, host: "127.0.0.1" });
      console.log(`API listening on ${e.API_URL} (port ${port})`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
