"use client";

import { useState } from "react";
import { apiCall } from "@/lib/api-client";
import type { Locale } from "@/i18n/config";

export default function PayButton({ locale, invoiceId }: { locale: Locale; invoiceId: string }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    const res = await apiCall<{ checkoutUrl?: string; error?: string }>(`/invoices/${invoiceId}/checkout`, {
      method: "POST",
    });
    if (res.ok && res.data.checkoutUrl) {
      window.location.href = res.data.checkoutUrl;
      return;
    }
    setBusy(false);
    setError(
      res.data?.error === "payments_not_configured"
        ? t("Payments are temporarily unavailable.", "الدفع غير متاح حالياً.")
        : t("Could not start payment. Please retry.", "تعذر بدء الدفع. حاول مجدداً."),
    );
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={busy}
        className="rounded-md bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {busy ? t("Redirecting…", "جارٍ التحويل…") : t("Pay now", "ادفع الآن")}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
