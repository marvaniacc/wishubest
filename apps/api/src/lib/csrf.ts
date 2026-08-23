import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * CSRF strategy for cookie-authenticated mutations:
 *  1. Origin / Referer must match an allowed origin (same-site browser check).
 *  2. Double-submit token: header `x-csrf-token` must equal the `wub_csrf` cookie.
 * Exemptions: webhook routes (authenticated by gateway signature instead).
 */

export function ensureCsrfCookie(reply: FastifyReply, existing: string | undefined): string {
  if (existing) return existing;
  const token = crypto.randomUUID().replace(/-/g, "");
  reply.setCookie("wub_csrf", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

function isAllowedOrigin(req: FastifyRequest): boolean {
  const origin = req.headers.origin ?? req.headers.referer ?? "";
  if (!origin) return true; // non-browser client (curl, server-to-server) — auth still required
  try {
    const o = new URL(Array.isArray(origin) ? origin[0] : origin);
    const allowed = new Set<string>([
      new URL(process.env.APP_URL ?? "http://localhost:3000").host,
      new URL(process.env.API_URL ?? "http://127.0.0.1:4000").host,
    ]);
    return allowed.has(o.host);
  } catch {
    return false;
  }
}

export async function verifyCsrf(req: FastifyRequest, reply: FastifyReply) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  // Webhook routes carry a verified signature and no cookies — skip CSRF.
  if (req.routeOptions?.url?.startsWith("/webhooks/")) return;

  if (!isAllowedOrigin(req)) {
    return reply.code(403).send({ error: "csrf_origin_rejected" });
  }

  // Register/login have no session-scoped token yet; they are protected by
  // the strict Origin check above plus aggressive rate limiting.
  if (req.routeOptions?.url === "/auth/register" || req.routeOptions?.url === "/auth/login") {
    return;
  }

  const cookieToken = req.cookies["wub_csrf"];
  const headerToken = req.headers["x-csrf-token"];
  if (
    !cookieToken ||
    typeof headerToken !== "string" ||
    cookieToken.length < 16 ||
    cookieToken !== headerToken
  ) {
    return reply.code(403).send({ error: "csrf_token_invalid" });
  }
}
