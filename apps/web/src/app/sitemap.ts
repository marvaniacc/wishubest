import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api-server";

const SITE = process.env.APP_URL ?? "http://localhost:3000";
const LOCALES = ["en", "ar"] as const;

interface Entry {
  path: string;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths: Entry[] = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/providers", changeFrequency: "hourly", priority: 0.9 },
    { path: "/countries", priority: 0.7 },
    { path: "/about", priority: 0.3 },
    { path: "/terms", priority: 0.2 },
    { path: "/contact", priority: 0.3 },
  ];

  const dynamicPaths: Entry[] = [];
  try {
    const provs = await apiFetch<{ items: { slug: string }[] }>("/public/providers?limit=50", { revalidate: 3600 });
    for (const p of provs.data?.items ?? []) dynamicPaths.push({ path: `/providers/${p.slug}`, priority: 0.8 });
    const countries = await apiFetch<{ slug: string }[]>("/public/countries", { revalidate: 3600 });
    for (const c of countries.data ?? []) dynamicPaths.push({ path: `/countries/${c.slug}`, priority: 0.6 });
  } catch {
    // API unavailable — ship the static part of the sitemap anyway.
  }

  const now = new Date();
  const out: MetadataRoute.Sitemap = [];
  for (const e of [...staticPaths, ...dynamicPaths]) {
    for (const l of LOCALES) {
      out.push({
        url: `${SITE}/${l}${e.path}`,
        lastModified: now,
        changeFrequency: e.changeFrequency ?? "weekly",
        priority: e.priority ?? 0.5,
        alternates:
          LOCALES.length > 1
            ? {
                languages: Object.fromEntries(
                  LOCALES.map((al) => [al, `${SITE}/${al}${e.path}`]),
                ),
              }
            : undefined,
      });
    }
  }
  return out;
}
