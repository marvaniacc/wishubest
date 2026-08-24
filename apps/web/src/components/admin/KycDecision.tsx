"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function KycDecision({ locale, providerId }: { locale: Locale; providerId: string }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    await apiCall<{ error?: string }>(`/admin/kyc/${providerId}/decision`, { method: "POST", body: { decision, note } });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <input
        className="input max-w-xs"
        placeholder={t("Reviewer note (optional)", "ملاحظة المراجع (اختياري)")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
      />
      <Button variant="primary" disabled={busy} onClick={() => decide("approve")}>
        {t("Approve KYC", "موافقة التوثيق")}
      </Button>
      <Button variant="danger" disabled={busy} onClick={() => decide("reject")}>
        {t("Reject KYC", "رفض التوثيق")}
      </Button>
    </div>
  );
}
