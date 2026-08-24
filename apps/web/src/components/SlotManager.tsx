"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button, StatusBadge } from "@/components/ui";
import type { Locale } from "@/i18n/config";

interface Slot {
  id: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export default function SlotManager({
  locale,
  slots,
  services,
}: {
  locale: Locale;
  slots: Slot[];
  services: { id: string; title: string }[];
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId || !startsAt || !endsAt) return;
    setBusy(true);
    setError("");
    // Treat entered times as UTC (platform stores UTC).
    const res = await apiCall<{ error?: string }>("/provider/slots", {
      method: "POST",
      body: {
        serviceId,
        startsAt: `${startsAt}:00Z`,
        endsAt: `${endsAt}:00Z`,
      },
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    setError(
      res.data?.error === "slot_overlap"
        ? t("Overlaps an existing slot.", "يتعارض مع موعد آخر.")
        : t("Could not create slot.", "تعذر إنشاء الموعد."),
    );
  }

  async function cancelSlot(id: string) {
    await apiCall<{ error?: string }>(`/provider/slots/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const svcTitle = (id: string) => services.find((s) => s.id === id)?.title ?? "—";

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="card grid gap-4 p-5 sm:grid-cols-4">
        <div className="sm:col-span-4">
          <label className="form-label" htmlFor="sl-svc">{t("Online service", "خدمة عن بُعد")}</label>
          <select id="sl-svc" className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="">—</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="sl-start">{t("Starts (UTC)", "البداية (UTC)")}</label>
          <input id="sl-start" type="datetime-local" className="input font-mono" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        </div>
        <div>
          <label className="form-label" htmlFor="sl-end">{t("Ends (UTC)", "النهاية (UTC)")}</label>
          <input id="sl-end" type="datetime-local" className="input font-mono" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="primary" disabled={busy}>
            + {t("Add slot", "إضافة موعد")}
          </Button>
        </div>
        {error && <p className="text-sm text-danger sm:col-span-4">{error}</p>}
      </form>

      <div className="space-y-2">
        {slots.length === 0 && <p className="card p-6 text-center text-sm text-ink-soft">{t("No slots yet.", "لا مواعيد بعد.")}</p>}
        {slots.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="font-medium">{svcTitle(s.serviceId)}</span>
            <span className="font-mono text-xs text-ink-soft">
              {new Date(s.startsAt).toISOString().replace("T", " ").slice(0, 16)} →{" "}
              {new Date(s.endsAt).toISOString().slice(11, 16)} UTC
            </span>
            <StatusBadge
              status={s.status === "open" ? "active" : s.status}
              label={s.status === "open" ? t("Open", "متاح") : s.status === "booked" ? t("Booked", "محجوز") : t("Cancelled", "ملغى")}
            />
            {s.status === "open" && (
              <button onClick={() => void cancelSlot(s.id)} className="ms-auto text-sm font-semibold text-danger hover:underline">
                {t("Cancel", "إلغاء")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
