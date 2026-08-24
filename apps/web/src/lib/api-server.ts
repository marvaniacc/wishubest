import "server-only";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";

export interface FetchOpts {
  method?: string;
  body?: unknown;
  raw?: string;
  contentType?: string;
  revalidate?: number | false;
}

/** Server-side call into the Fastify API, forwarding the session cookie. */
export async function apiFetch<T>(
  path: string,
  opts: FetchOpts = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const jar = await cookies();
  const session = jar.get("wub_session")?.value;
  const csrf = jar.get("wub_csrf")?.value;
  const headers: Record<string, string> = {};
  if (session) headers.cookie = `wub_session=${session}`;
  if (csrf && opts.method && !["GET", "HEAD"].includes(opts.method)) {
    headers["x-csrf-token"] = csrf;
  }
  if (opts.contentType) headers["content-type"] = opts.contentType;
  else if (opts.body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    next: opts.revalidate === undefined ? { revalidate: 0 } : { revalidate: opts.revalidate },
    cache: opts.revalidate === false ? "no-store" : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data: data as T };
}
