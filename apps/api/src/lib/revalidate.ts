import { env } from "../config.js";

/**
 * On-demand cache invalidation: asks the Next.js server to revalidate public
 * pages when provider/review data changes (approve/suspend/paid events).
 * Best-effort — failures are logged, never thrown.
 */
export async function revalidatePublic(paths: string[]): Promise<void> {
  const base = env().APP_URL.replace(/\/$/, "");
  await Promise.allSettled(
    paths.map(async (p) => {
      const res = await fetch(`${base}/api/revalidate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidate-token": process.env.REVALIDATE_TOKEN ?? "",
        },
        body: JSON.stringify({ paths: [p] }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);
      if (!res || !res.ok) console.warn(`[revalidate] failed for ${p}`);
    }),
  );
}
