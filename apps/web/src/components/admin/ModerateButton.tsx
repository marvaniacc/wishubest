"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function ModerateButton({ locale, reviewId }: { locale: Locale; reviewId: string }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function moderate(decision: "approve" | "reject") {
    setBusy(true);
    await apiCall<{ error?: string }>(`/admin/reviews/${reviewId}/moderate`, { method: "POST", body: { decision } });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2 border-t border-line pt-3">
      <Button variant="primary" disabled={busy} onClick={() => void moderate("approve")}>
        {t("Approve", "موافقة")}
      </Button>
      <Button variant="danger" disabled={busy} onClick={() => void moderate("reject")}>
        {t("Reject", "رفض")}
      </Button>
    </div>
  );
}
