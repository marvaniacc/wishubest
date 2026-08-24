"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function ReviewForm({ locale, bookingId }: { locale: Locale; bookingId: string }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await apiCall<{ error?: string }>("/reviews", {
      method: "POST",
      body: { bookingId, rating, title, body },
    });
    if (res.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
    setError(t("Could not submit review.", "تعذر إرسال التقييم."));
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
      <h3 className="font-semibold">{t("Leave a verified review", "اترك تقييماً موثقاً")}</h3>
      <div>
        <span className="form-label">{t("Rating", "التقييم")}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n}`}
              className={`text-xl ${n <= rating ? "text-warning" : "text-line"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="rv-title">{t("Title", "العنوان")}</label>
        <input id="rv-title" className="input" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="form-label" htmlFor="rv-body">{t("Your review", "تقييمك")}</label>
        <textarea id="rv-body" className="input" rows={4} minLength={10} maxLength={4000} required value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {error && <p className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="accent" disabled={busy}>
        {busy ? t("Sending…", "جارٍ الإرسال…") : t("Submit review", "إرسال التقييم")}
      </Button>
    </form>
  );
}
