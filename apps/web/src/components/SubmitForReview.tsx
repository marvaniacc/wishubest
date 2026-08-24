"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function SubmitForReview({
  locale,
  status,
}: {
  locale: Locale;
  status: string;
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!["draft", "rejected"].includes(status)) return null;

  async function submit() {
    setBusy(true);
    setError("");
    const res = await apiCall("/provider/submit-for-review", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(
        String((res.data as { error?: string })?.error ?? "") === "profile_incomplete"
          ? t("Complete your profile first (name, address, country).", "أكمل ملفك أولاً (الاسم والعنوان والدولة).")
          : t("Could not submit.", "تعذر الإرسال."),
      );
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button variant="accent" disabled={busy} onClick={submit}>
        {t("Submit for review", "إرسال للمراجعة")}
      </Button>
      <span className="text-sm text-ink-soft">
        {t("An admin reviews your profile before it goes public.", "يراجع المشرف ملفك قبل ظهوره للعامة.")}
      </span>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
