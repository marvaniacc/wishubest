"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

interface Country {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  iso2: string;
  active: boolean;
}
interface City {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  countryId: string;
  active: boolean;
}

export default function GeographyManager({
  locale,
  countries,
  cities,
}: {
  locale: Locale;
  countries: Country[];
  cities: City[];
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cityCountry, setCityCountry] = useState(countries[0]?.id ?? "");

  async function addCountry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    await apiCall<{ error?: string }>("/admin/countries", {
      method: "POST",
      body: {
        nameEn: fd.get("nameEn"),
        nameAr: fd.get("nameAr") || String(fd.get("nameEn")),
        iso2: String(fd.get("iso2")).toUpperCase(),
        slug: slugify(String(fd.get("nameEn"))),
        active: true,
        priority: 100,
      },
    });
    setBusy(false);
    router.refresh();
  }

  async function addCity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    await apiCall<{ error?: string }>("/admin/cities", {
      method: "POST",
      body: {
        countryId: String(fd.get("countryId")),
        nameEn: fd.get("nameEn"),
        nameAr: fd.get("nameAr") || String(fd.get("nameEn")),
        slug: slugify(String(fd.get("nameEn"))),
        active: true,
        priority: 100,
      },
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("Countries", "الدول")}</h2>
        <form onSubmit={addCountry} className="grid gap-3 sm:grid-cols-4">
          <input name="nameEn" placeholder="Name (EN)" className="input" required />
          <input name="nameAr" placeholder="الاسم (AR)" className="input" />
          <input name="iso2" placeholder="ISO2 (e.g. TH)" className="input font-mono" maxLength={2} required />
          <Button variant="primary" disabled={busy}>+</Button>
        </form>
        <ul className="mt-4 divide-y divide-line text-sm">
          {countries.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="font-mono text-xs text-ink-soft">{c.iso2}</span>
              <span className="font-medium">{c.nameEn}</span>
              <span className="text-ink-soft">{c.nameAr}</span>
              <span className="ms-auto font-mono text-xs">{c.slug}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("Cities", "المدن")}</h2>
        <form onSubmit={addCity} className="grid gap-3 sm:grid-cols-4">
          <select name="countryId" className="input" value={cityCountry} onChange={(e) => setCityCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.nameEn}</option>
            ))}
          </select>
          <input name="nameEn" placeholder="City (EN)" className="input" required />
          <input name="nameAr" placeholder="المدينة (AR)" className="input" />
          <Button variant="primary" disabled={busy}>+</Button>
        </form>
        <ul className="mt-4 grid max-h-80 gap-1 overflow-y-auto text-sm sm:grid-cols-2">
          {cities.map((ct) => {
            const c = countries.find((x) => x.id === ct.countryId);
            return (
              <li key={ct.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface">
                <span className="text-ink">{ct.nameEn}</span>
                <span className="text-ink-soft">·</span>
                <span className="font-mono text-xs text-ink-soft">{c?.iso2 ?? "?"}</span>
                <span className="ms-auto font-mono text-[11px] text-line-dark">{ct.slug}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}
