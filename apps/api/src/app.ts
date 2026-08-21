import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { env, isProd } from "./config.js";
import { resolveUser, verifyCsrf } from "./lib/auth.js";
import { httpError, isHttpError } from "./lib/httpError.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: isProd ? "warn" : "info" },
    trustProxy: env.TRUST_PROXY, // behind Cloudflare/Caddy — honor X-Forwarded-*
    bodyLimit: 1024 * 1024, // 1MB JSON
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // API only serves JSON + multipart; CSP handled by the web app
    crossOriginResourcePolicy: { policy: "same-site" },
  });
  await app.register(cookie, {});
  await app.register(cors, {
    origin: [env.WEB_URL],
    credentials: true,
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 5 } });
  await app.register(rateLimit, {
    global: false, // applied per-route where needed
    max: 300,
    timeWindow: "1 minute",
  });

  // ── auth context on every request ──
  app.addHook("onRequest", async (request) => {
    const resolved = await resolveUser(request);
    request.user = resolved?.user ?? null;
    request.sessionCsrfToken = resolved?.csrfToken ?? null;
  });

  // ── CSRF: every mutating method requires the double-submit token ──
  // Auth bootstrap endpoints (register/login/logout) are exempt: no session/CSRF
  // token exists yet, and they are rate-limited + same-origin. They still issue a
  // CSRF cookie on success, so all subsequent authenticated mutations are protected.
  const csrfExempt = (url: string) =>
    url.startsWith("/webhooks/") ||
    url === "/auth/login" ||
    url === "/auth/register" ||
    url === "/auth/logout";

  app.addHook("onRequest", async (request, reply) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !csrfExempt(request.url)) {
      const ok = verifyCsrf(request);
      if (!ok) {
        reply.code(403).send({ error: { code: "CSRF_INVALID", message: "Missing or invalid CSRF token" } });
      }
    }
  });

  // ── central error handler ──
  app.setErrorHandler((error, request, reply) => {
    const e = error as import("fastify").FastifyError & { details?: unknown };
    if (isHttpError(e)) {
      reply.code(e.statusCode).send({ error: { code: e.code, message: e.message, details: e.details } });
      return;
    }
    if (e.validation) {
      reply.code(422).send({ error: { code: "VALIDATION_ERROR", message: e.message } });
      return;
    }
    if (e.statusCode === 429) {
      reply.code(429).send({ error: { code: "RATE_LIMITED", message: "Too many requests, slow down" } });
      return;
    }
    request.log.error(e);
    reply.code(500).send({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  return app;
}

export { httpError };
