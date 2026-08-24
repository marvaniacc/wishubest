"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button, StatusBadge } from "@/components/ui";
import type { Locale } from "@/i18n/config";

interface ServiceRow {
  id: string;
  title: string;
  description: string;
  serviceMode: string;
  priceAmountMinor: number;
  durationMinutes: number;
  status: string;
}

const MODES = ["online", "in_person", "hybrid"] as const;

function minorToMajorInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

export default function ServiceManager({
  locale,
  items,
  currency,
  categories,
}: {
  locale: Locale;
  items: ServiceRow[];
  currency: { isoCode: string; symbol: string; decimalPlaces: number };
  categories: { id: string; name: string }[];
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [creating, setCreating] = useState(false);

  const open = creating || editing !== null;

  async function save(form: FormData) {
    const payload = {
      categoryId: form.get("categoryId") || null,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      serviceMode: String(form.get("serviceMode")),
      pricingModel: "fixed",
      priceMajor: String(form.get("priceMajor")),
      durationMinutes: Number(form.get("durationMinutes")),
      status: String(form.get("status")),
    };
    const res = editing
      ? await apiCall<{ error?: string }>(`/provider/services/${editing.id}`, { method: "PUT", body: payload })
      : await apiCall<{ error?: string }>("/provider/services", { method: "POST", body: payload });
    if (res.ok) {
      setEditing(null);
      setCreating(false);
      router.refresh();
    }
    return res.ok;
  }

  return (
    <div className="space-y-4">
      {!open && (
        <Button variant="primary" onClick={() => setCreating(true)}>
          + {t("New service", "خدمة جديدة")}
        </Button>
      )}
      {open && (
        <form
          action={async (fd: FormData) => {
            if (await save(fd)) router.refresh();
          }}
          className="card space-y-4 p-5"
        >
          <div>
            <label className="form-label" htmlFor="sv-title">{t("Title", "العنوان")}</label>
            <input id="sv-title" name="title" className="input" defaultValue={editing?.title} required maxLength={200} />
          </div>
          <div>
            <label className="form-label" htmlFor="sv-desc">{t("Description", "الوصف")}</label>
            <textarea id="sv-desc" name="description" className="input" rows={3} defaultValue={editing?.description} maxLength={8000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="form-label" htmlFor="sv-mode">{t("Mode", "النمط")}</label>
              <select id="sv-mode" name="serviceMode" className="input" defaultValue={editing?.serviceMode ?? "online"}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "online" ? t("Online", "عن بُعد") : m === "in_person" ? t("In person", "حضوري") : t("Hybrid", "مختلط")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="sv-price">{`${t("Price", "السعر")} (${currency.isoCode})`}</label>
              <input
                id="sv-price"
                name="priceMajor"
                type="number"
                step="0.01"
                min="0.01"
                className="input font-mono"
                defaultValue={editing ? minorToMajorInput(editing.priceAmountMinor) : ""}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="sv-duration">{t("Duration (min)", "المدة (دقيقة)")}</label>
              <input id="sv-duration" name="durationMinutes" type="number" min={5} max={20160} className="input font-mono" defaultValue={editing?.durationMinutes ?? 30} required />
            </div>
            <div>
              <label className="form-label" htmlFor="sv-status">{t("Status", "الحالة")}</label>
              <select id="sv-status" name="status" className="input" defaultValue={editing?.status ?? "draft"}>
                <option value="draft">{t("Draft", "مسودة")}</option>
                <option value="active">{t("Active", "نشطة")}</option>
                <option value="inactive">{t("Inactive", "غير نشطة")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="sv-cat">{t("Category", "التصنيف")}</label>
            <select id="sv-cat" name="categoryId" className="input" defaultValue="">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">{t("Save", "حفظ")}</Button>
            <Button type="button" variant="ghost" onClick={() => { setEditing(null); setCreating(false); }}>
              {t("Cancel", "إلغاء")}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="card p-6 text-center text-sm text-ink-soft">{t("No services yet.", "لا خدمات بعد.")}</p>
        )}
        {items.map((s) => (
          <article key={s.id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{s.title}</h3>
                <StatusBadge status={s.status} label={(s.status === "active" ? t("Active", "نشطة") : s.status === "inactive" ? t("Inactive", "غير نشطة") : t("Draft", "مسودة"))} />
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">
                {(s.serviceMode === "online" ? t("Online", "عن بُعد") : s.serviceMode === "in_person" ? t("In person", "حضوري") : t("Hybrid", "مختلط"))}
                {" · "}
                {s.durationMinutes} min
              </p>
            </div>
            <span className="font-mono font-semibold text-primary-dark">
              {currency.symbol}
              {(s.priceAmountMinor / 100).toFixed(2)}
            </span>
            <Button variant="ghost" onClick={() => { setEditing(s); setCreating(false); }}>
              {t("Edit", "تعديل")}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
