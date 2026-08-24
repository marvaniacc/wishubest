"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function ProviderDecision({
  locale,
  providerId,
  status,
  kycStatus,
}: {
  locale: Locale;
  providerId: string;
  status: string;
  kycStatus: string;
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: string) {
    setBusy(true);
    setError("");
    const res = await apiCall<{ error?: string }>(`/admin/providers/${providerId}/decision`, {
      method: "POST",
      body: { decision, note: "" },
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    setError(
      String((res.data as { error?: string })?.error ?? "").startsWith("kyc_not_approved")
        ? t("KYC must be approved first.", "يجب الموافقة على التوثيق أولاً.")
        : t("Action failed.", "فشل الإجراء."),
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      {status === "pending_review" && (
        <>
          <Button variant="primary" disabled={busy} onClick={() => decide("approve")}>
            {t("Approve", "موافقة")}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => decide("reject")}>
            {t("Reject", "رفض")}
          </Button>
        </>
      )}
      {status === "active" && (
        <Button variant="danger" disabled={busy} onClick={() => decide("suspend")}>
          {t("Suspend", "تعليق")}
        </Button>
      )}
      {status === "suspended" && (
        <Button variant="ghost" disabled={busy} onClick={() => decide("reactivate")}>
          {t("Reactivate", "إعادة تنشيط")}
        </Button>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
