import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { eq } from "drizzle-orm";
import { loginSchema, registerSchema, changePasswordSchema } from "@wishubest/shared";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { createSession, destroySession, pruneExpiredSessions } from "../lib/auth.js";
import { randomToken } from "../lib/crypto.js";
import { env, isProd } from "../config.js";
import { httpError } from "../lib/httpError.js";
import { requireAuth } from "./guards.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (request, reply) => {
    const input = registerSchema.parse(request.body);

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw httpError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        role: input.role, // patient or provider only (schema-enforced)
      })
      .returning();

    await createSession(reply, user!.id);
    await pruneExpiredSessions();
    reply.code(201).send({
      user: { id: user!.id, email: user!.email, fullName: user!.fullName, role: user!.role },
    });
  });

  app.post("/auth/login", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const rows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const user = rows[0];

    // Constant-ish response regardless of which factor failed.
    if (!user || !user.isActive || !(await verifyPassword(user.passwordHash, input.password))) {
      throw httpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    await createSession(reply, user.id);
    await pruneExpiredSessions();
    reply.send({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  });

  app.post("/auth/logout", async (request, reply) => {
    await destroySession(request, reply);
    reply.send({ ok: true });
  });

  app.get("/auth/csrf", async (request, reply) => {
    const token = randomToken(24);
    reply.setCookie(env.CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });
    return { csrfToken: token };
  });

  app.post("/auth/change-password", async (request, reply) => {
    const user = requireAuth(request);
    const input = changePasswordSchema.parse(request.body);
    const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const dbUser = rows[0];
    if (!dbUser || !(await verifyPassword(dbUser.passwordHash, input.currentPassword))) {
      throw httpError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
    }
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    reply.send({ ok: true });
  });
}
