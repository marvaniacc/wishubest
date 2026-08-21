import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { env, isProd } from "../config.js";
import { randomToken, sha256Hex } from "./crypto.js";
import type { UserRole } from "@wishubest/shared";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  locale: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
    sessionCsrfToken: string | null;
  }
}

export async function createSession(reply: FastifyReply, userId: string): Promise<void> {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash: sha256Hex(token),
    csrfToken,
    expiresAt,
  });

  reply.setCookie(env.AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  // CSRF token is readable by the client JS (double-submit pattern)
  reply.setCookie(env.CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies[env.AUTH_COOKIE];
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256Hex(token)));
  }
  reply.clearCookie(env.AUTH_COOKIE, { path: "/" });
  reply.clearCookie(env.CSRF_COOKIE, { path: "/" });
}

/** Resolve the current user from the session cookie. Returns null when unauthenticated. */
export async function resolveUser(request: FastifyRequest): Promise<{ user: AuthUser; csrfToken: string } | null> {
  const token = request.cookies[env.AUTH_COOKIE];
  if (!token) return null;

  const rows = await db
    .select({
      csrfToken: sessions.csrfToken,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      locale: users.locale,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256Hex(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isActive) return null;
  return {
    user: {
      id: row.userId,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      locale: row.locale,
    },
    csrfToken: row.csrfToken,
  };
}

/** Housekeeping: delete expired sessions. Cheap; called opportunistically on login. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/** CSRF double-submit verification for all mutating requests. */
export function verifyCsrf(request: FastifyRequest): boolean {
  const header = request.headers["x-csrf-token"];
  const cookie = request.cookies[env.CSRF_COOKIE];
  if (typeof header !== "string" || !cookie) return false;
  return header === cookie;
}
