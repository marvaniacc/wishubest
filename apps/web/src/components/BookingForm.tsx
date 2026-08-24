"use client";

import { useState } from "react";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
}

export default function BookingForm({
  locale,
  isPatient,
  serviceId,
  serviceTitle,
  slots,
}: {
  locale: Locale;
  isPatient: boolean;
  serviceId: string;
  serviceTitle: string;
  slots: Slot[];
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const [open, setOpen] = useState(false);
  const [slotId, setSlotId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await apiCall<{ booking?: { code: string }; error?: string }>("/bookings", {
      method: "POST",
      body: {
        serviceId,
        slotId: slotId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        patientNote: note,
      },
    });
    if (res.ok) {
      setState("done");
    } else if (res.status === 401) {
      setState("error");
      setError(t("Please log in as a patient to request a booking.", "يرجى تسجيل الدخول كمريض لطلب الحجز."));
    } else {
      setState("error");
      setError(
        res.data?.error === "slot_unavailable"
          ? t("That slot was just taken — pick another.", "تم حجز هذا الموعد للتو — اختر موعداً آخر.")
          : t("Something went wrong. Please retry.", "حدث خطأ ما. حاول مرة أخرى."),
      );
    }
  }

  if (!open) {
    return (
      <Button variant="accent" onClick={() => setOpen(true)}>
        {t("Book now", "احجز الآن")}
      </Button>
    );
  }

  if (state === "done") {
    return (
      <p className="rounded-md bg-success-tint px-4 py-2 text-sm font-medium text-success">
        {t("Request sent! The provider will confirm shortly.", "تم إرسال الطلب! سيؤكد مقدم الخدمة قريباً.")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 w-full space-y-3 border-t border-line pt-4">
      <p className="text-sm font-semibold">{serviceTitle}</p>
      {slots.length > 0 && (
        <div>
          <label className="form-label">{t("Available slots", "المواعيد المتاحة")}</label>
          <select value={slotId} onChange={(e) => setSlotId((e.target as HTMLSelectElement).value)} className="input">
            <option value="">{t("— pick a slot —", "— اختر موعداً —")}</option>
            {slots.slice(0, 30).map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.starts_at).toLocaleString(locale === "ar" ? "ar" : "en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </option>
            ))}
          </select>
        </div>
      )}
      {slots.length === 0 && (
        <div>
          <label className="form-label">{t("Preferred date & time", "التاريخ والوقت المفضل")}</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt((e.target as HTMLInputElement).value)}
            className="input"
            required
          />
          <p className="mt-1 text-xs text-ink-soft">{t("Times shown in your local timezone.", "الأوقات بتوقيتك المحلي.")}</p>
        </div>
      )}
      <div>
        <label className="form-label">{t("Notes for the provider", "ملاحظات لمقدم الخدمة")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote((e.target as HTMLTextAreaElement).value)}
          rows={3}
          maxLength={2000}
          className="input"
          placeholder={t("Describe your condition or request…", "صف حالتك أو طلبك…")}
        />
      </div>
      {error && (
        <p className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {error.includes("log in") || error.includes("تسجيل الدخول") ? (
            <a href={`/${locale}/login`} className="underline">
              {error}
            </a>
          ) : (
            error
          )}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="accent" disabled={state === "sending"}>
          {state === "sending" ? t("Sending…", "جارٍ الإرسال…") : t("Send request", "إرسال الطلب")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("Cancel", "إلغاء")}
        </Button>
      </div>
    </form>
  );
}
