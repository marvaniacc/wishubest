import { createHash, randomBytes } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { env } from "../config.js";
import type { Role } from "@wishubest/shared";

export const SESSION_COOKIE = "wub_session";
export const CSRF_COOKIE = "wub_csrf";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  req: FastifyRequest,
): Promise<{ token: string; expiresAt: Date }> {
  const e = env();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + e.SESSION_TTL_HOURS * 3600 * 1000);
  await db().db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    ip: req.ip.slice(0, 64),
    userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
  });
  return { token, expiresAt };
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  const secure = env().NODE_ENV === "production";
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

export async function loadSessionUser(req: FastifyRequest): Promise<SessionUser | undefined> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return undefined;
  const rows = await db()
    .db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0];
}

export async function destroySession(req: FastifyRequest) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) {
    await db().db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
}

// ---------------- guards ----------------

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    await reply.code(401).send({ error: "unauthorized" });
  }
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };
}
