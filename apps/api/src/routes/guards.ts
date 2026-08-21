import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { providerProfiles } from "../db/schema.js";
import { httpError } from "../lib/httpError.js";
import type { AuthUser } from "../lib/auth.js";
import { resolveUser } from "../lib/auth.js";
import type { UserRole } from "@wishubest/shared";

export function requireAuth(request: FastifyRequest): AuthUser {
  if (!request.user) throw httpError(401, "UNAUTHENTICATED", "Authentication required");
  return request.user;
}

export function requireRole(request: FastifyRequest, ...roles: UserRole[]): AuthUser {
  const user = requireAuth(request);
  if (!roles.includes(user.role)) {
    throw httpError(403, "FORBIDDEN", `Requires role: ${roles.join(" or ")}`);
  }
  return user;
}

export async function requireProviderProfile(request: FastifyRequest) {
  const user = requireRole(request, "provider");
  const rows = await db
    .select()
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, user.id))
    .limit(1);
  const profile = rows[0];
  if (!profile) throw httpError(404, "NO_PROVIDER_PROFILE", "Provider profile not found — complete onboarding first");
  return { user, profile };
}

export async function optionalUser(request: FastifyRequest): Promise<AuthUser | null> {
  return request.user ?? (await resolveUser(request))?.user ?? null;
}

export function forbidForRole(request: FastifyRequest, role: UserRole): void {
  if (request.user?.role === role) {
    throw httpError(403, "FORBIDDEN", "Not allowed for this account type");
  }
}

export function ensureCsrfOr403(request: FastifyRequest, reply: FastifyReply): void {
  // Global hook already enforced; this is defense-in-depth for sensitive routes.
  const header = request.headers["x-csrf-token"];
  const cookie = request.cookies;
  if (typeof header !== "string" || !header) {
    reply.code(403).send({ error: { code: "CSRF_INVALID", message: "Missing CSRF header" } });
  }
}
