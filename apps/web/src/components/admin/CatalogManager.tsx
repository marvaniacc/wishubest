"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

const TYPES = ["doctor", "hospital", "hotel", "translator"] as const;

export default function CatalogManager({
  locale,
  categories,
  currency,
  commissions,
}: {
  locale: Locale;
  categories: { id: string; slug: string; nameEn: string; nameAr: string }[];
  currency: { isoCode: string; symbol: string; decimalPlaces: number } | null;
  commissions: { providerType: string; platformFeeRateBps: number; affiliateCommissionRateBps: number }[];
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function addCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    await apiCall<{ error?: string }>("/admin/categories", {
      method: "POST",
      body: {
        slug: slugify(String(fd.get("nameEn"))),
        nameEn: String(fd.get("nameEn")),
        nameAr: String(fd.get("nameAr")) || String(fd.get("nameEn")),
        active: true,
        priority: 100,
      },
    });
    setBusy(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function saveCurrency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    await apiCall<{ error?: string }>("/admin/currency", {
      method: "PUT",
      body: {
        isoCode: String(fd.get("isoCode")).toUpperCase(),
        symbol: String(fd.get("symbol")),
        decimalPlaces: Number(fd.get("decimalPlaces")),
      },
    });
    setBusy(false);
    router.refresh();
  }

  async function saveCommission(providerType: string, platformFeePct: string, affiliatePct: string) {
    setBusy(true);
    await apiCall<{ error?: string }>(`/admin/commission/${providerType}`, {
      method: "PUT",
      body: {
        platformFeeRateBps: Math.round(Number(platformFeePct || "0") * 100),
        affiliateCommissionRateBps: Math.round(Number(affiliatePct || "0") * 100),
      },
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* currency */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("Platform currency (single, active)", "عملة المنصة (وحيدة ونشطة)")}</h2>
        <form onSubmit={saveCurrency} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="form-label">ISO</label>
            <input name="isoCode" className="input font-mono uppercase" defaultValue={currency?.isoCode ?? "USD"} maxLength={3} required />
          </div>
          <div>
            <label className="form-label">{t("Symbol", "الرمز")}</label>
            <input name="symbol" className="input" defaultValue={currency?.symbol ?? "$"} maxLength={8} required />
          </div>
          <div>
            <label className="form-label">{t("Decimals", "المنازل العشرية")}</label>
            <input name="decimalPlaces" type="number" min={0} max={4} className="input font-mono" defaultValue={currency?.decimalPlaces ?? 2} />
          </div>
          <div className="flex items-end">
            <Button variant="primary" disabled={busy}>{t("Save", "حفظ")}</Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-ink-soft">
          {t(
            "Changing this affects new services only. Historical invoices keep their snapshot currency.",
            "التغيير يؤثر على الخدمات الجديدة فقط. الفواتير السابقة تحتفظ بعملتها.",
          )}
        </p>
      </section>

      {/* commission */}
      <section className="card p-5">
        <h2 className="mb-1 font-semibold">{t("Commission per provider type", "العمولة حسب نوع مقدم الخدمة")}</h2>
        <p className="mb-3 text-xs text-ink-soft">
          {t(
            "Rates are snapshotted into each transaction at payment time — later changes never alter history.",
            "تُثبَّت النسب في كل معاملة وقت الدفع — التغييرات اللاحقة لا تؤثر على السجل.",
          )}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2 text-start">{t("Provider type", "النوع")}</th>
              <th className="py-2 text-start">{t("Platform fee %", "عمولة المنصة %")}</th>
              <th className="py-2 text-start">{t("Affiliate %", "عمولة المسوق %")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {TYPES.map((tp) => {
              const row = commissions.find((c) => c.providerType === tp);
              return (
                <tr key={tp} className="border-b border-line last:border-none">
                  <td className="py-2 font-medium">{(TYPES_LABEL[tp] as Record<string, string>)[locale] ?? tp}</td>
                  <td className="py-2">
                    <input
                      id={`fee-${tp}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      defaultValue={row ? (row.platformFeeRateBps / 100).toString() : "15"}
                      className="input max-w-[100px] font-mono"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      id={`aff-${tp}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      defaultValue={row ? (row.affiliateCommissionRateBps / 100).toString() : "0"}
                      className="input max-w-[100px] font-mono"
                    />
                  </td>
                  <td className="py-2 text-end">
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void saveCommission(
                          tp,
                          (document.getElementById(`fee-${tp}`) as HTMLInputElement).value,
                          (document.getElementById(`aff-${tp}`) as HTMLInputElement).value,
                        )
                      }
                    >
                      {t("Save", "حفظ")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* categories */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("Service categories", "تصنيفات الخدمات")}</h2>
        <form onSubmit={addCategory} className="grid gap-3 sm:grid-cols-4">
          <input name="nameEn" placeholder="Category (EN)" className="input" required />
          <input name="nameAr" placeholder="التصنيف (AR)" className="input" />
          <Button variant="primary" disabled={busy}>+</Button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id} className="rounded-full border border-line px-3 py-1 text-sm">
              {c.nameEn} <span className="text-ink-soft">· {c.nameAr}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const TYPES_LABEL = {
  doctor: { en: "Doctor", ar: "طبيب" },
  hospital: { en: "Hospital", ar: "مستشفى" },
  hotel: { en: "Hotel", ar: "فندق" },
  translator: { en: "Translator", ar: "مترجم" },
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}
