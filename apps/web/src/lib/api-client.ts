"use client";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

/** Browser mutation call — same-origin /api/* proxied to Fastify. CSRF handled automatically. */
export async function apiCall<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const method = opts.method ?? "POST";
  const csrf = readCookie("wub_csrf");
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data: data as T };
}

/** Multipart upload (KYC documents). */
export async function apiUpload(
  path: string,
  form: FormData,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const csrf = readCookie("wub_csrf");
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: csrf ? { "x-csrf-token": csrf } : undefined,
    body: form,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* noop */
  }
  return { ok: res.ok, status: res.status, data };
}
