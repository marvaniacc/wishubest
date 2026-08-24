import type { NextRequest } from "next/server";

/**
 * Runtime proxy: same-origin /api/* → Fastify.
 * Unlike next.config rewrites (baked into .next at build time), this reads
 * API_URL at request time so the same build works in any environment.
 */

const HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "accept-encoding",
]);

function target(req: NextRequest): string {
  const base = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
  return base + req.nextUrl.pathname.replace(/^\/api/, "") + req.nextUrl.search;
}

async function proxy(req: NextRequest): Promise<Response> {
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) headers.set(k, v);
  });

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target(req), init);
  } catch {
    return Response.json({ error: "api_unavailable" }, { status: 502 });
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase()) && k.toLowerCase() !== "set-cookie") outHeaders.set(k, v);
  });
  const getCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [upstream.headers.get("set-cookie")].filter(Boolean) as string[];
  for (const c of getCookies) outHeaders.append("set-cookie", c);

  const buf = await upstream.arrayBuffer();
  return new Response(buf, { status: upstream.status, headers: outHeaders });
}

export const dynamic = "force-dynamic";

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
