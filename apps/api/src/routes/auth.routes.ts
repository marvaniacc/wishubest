import type { FastifyInstance } from "fastify";
import argon2 from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { registerSchema, loginSchema } from "@wishubest/shared";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  requireAuth,
  CSRF_COOKIE,
} from "../lib/sessions.js";
import { audit } from "../lib/audit.js";

const ARGON2_OPTS = {
  memoryCost: 19456, // 19 MiB — OWASP baseline for argon2id
  timeCost: 2,
  parallelism: 1,
};

async function hashPassword(pw: string): Promise<string> {
  return argon2.hash(pw, ARGON2_OPTS);
}

async function verifyPassword(hash: string, pw: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pw);
  } catch {
    return false;
  }
}

function publicUser(u: { id: string; email: string; role: string; displayName: string | null }) {
  return { id: u.id, email: u.email, role: u.role, displayName: u.displayName };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    "/auth/register",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const input = registerSchema.parse(req.body);
      const existing = await db().db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing[0]) {
        return reply.code(409).send({ error: "email_already_registered" });
      }
      const displayName =
        typeof req.body === "object" && req.body !== null && "displayName" in req.body
          ? String((req.body as Record<string, unknown>).displayName ?? "").slice(0, 120) || null
          : null;
      const inserted = await db().db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: await hashPassword(input.password),
          role: input.role,
          displayName,
        })
        .returning({ id: users.id, email: users.email, role: users.role, displayName: users.displayName });
      const user = inserted[0]!;

      const { token, expiresAt } = await createSession(user.id, req);
      setSessionCookie(reply, token, expiresAt);
      await audit({
        actorId: user.id,
        actorRole: user.role,
        action: "auth.register",
        entityType: "user",
        entityId: user.id,
        ip: req.ip,
      });
      return reply.code(201).send({ user: publicUser(user) });
    },
  );

  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const input = loginSchema.parse(req.body);
      const rows = await db().db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const user = rows[0];
      // Constant-shape response to avoid user enumeration.
      if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }
      const { token, expiresAt } = await createSession(user.id, req);
      setSessionCookie(reply, token, expiresAt);
      return reply.send({ user: publicUser(user) });
    },
  );

  app.post("/auth/logout", { preHandler: [requireAuth] }, async (req, reply) => {
    await destroySession(req);
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/auth/me", { preHandler: [requireAuth] }, async (req) => {
    return { user: req.user };
  });

  app.get("/auth/csrf", async (_req, reply) => {
    let token = _req.cookies[CSRF_COOKIE];
    if (!token || typeof token !== "string") {
      token = randomBytes(16).toString("hex");
      reply.setCookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return { csrfToken: token };
  });
}
