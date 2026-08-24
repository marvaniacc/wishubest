"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function BookingActions({
  locale,
  bookingId,
  status,
  meetingLink,
}: {
  locale: Locale;
  bookingId: string;
  status: string;
  meetingLink: string | null;
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState(meetingLink ?? "");
  const [error, setError] = useState("");

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await apiCall<{ error?: string }>(`/provider/bookings/${bookingId}/action`, {
      method: "POST",
      body: { action, ...extra },
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("Action failed.", "فشل الإجراء."));
      return;
    }
    router.refresh();
  }

  async function saveLink() {
    setBusy(true);
    const res = await apiCall<{ error?: string }>(`/provider/bookings/${bookingId}/meeting-link`, {
      method: "PUT",
      body: { meetingLink: link },
    });
    setBusy(false);
    if (res.ok) {
      setLinkOpen(false);
      router.refresh();
    } else {
      setError(t("Invalid link.", "رابط غير صالح."));
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      {status === "REQUESTED" && (
        <>
          <Button variant="primary" disabled={busy} onClick={() => act("confirm")}>
            {t("Confirm", "تأكيد")}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => act("decline", { reason: t("Declined by provider", "مرفوض من مقدم الخدمة") })}>
            {t("Decline", "رفض")}
          </Button>
        </>
      )}
      {(status === "AWAITING_PAYMENT" || status === "CONFIRMED") && (
        <>
          {linkOpen ? (
            <div className="flex w-full max-w-md items-center gap-2">
              <input
                className="input"
                placeholder="https://meet.example.com/room"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <Button variant="primary" disabled={busy} onClick={saveLink}>
                {t("Save", "حفظ")}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setLinkOpen(true)}>
              {meetingLink ? t("Edit meeting link", "تعديل رابط الاجتماع") : t("Add meeting link", "إضافة رابط الاجتماع")}
            </Button>
          )}
        </>
      )}
      {status === "CONFIRMED" && (
        <>
          <Button variant="ghost" disabled={busy} onClick={() => act("complete")}>
            {t("Mark completed", "إكمال")}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => act("no_show")}>
            {t("No-show", "لم يحضر")}
          </Button>
        </>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
