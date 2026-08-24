"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUpload } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function KycUploader({ locale }: { locale: Locale }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setOk(false);
    const res = await apiUpload("/provider/kyc/documents", form);
    setBusy(false);
    if (res.ok) {
      setOk(true);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      const errCode = String((res.data as { error?: string })?.error ?? "");
      setError(
        errCode.startsWith("invalid_file_type")
          ? t("Only PDF, PNG, JPEG or WebP files are allowed.", "الملفات المسموحة: PDF أو PNG أو JPEG أو WebP.")
          : t("Upload failed. Check file size (max 10 MB).", "فشل الرفع. تأكد من حجم الملف (١٠ ميجابايت كحد أقصى)."),
      );
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="ky-title">{t("Document title", "عنوان الوثيقة")}</label>
          <input id="ky-title" name="title" className="input" required maxLength={160} placeholder={t("Passport scan", "صورة جواز السفر")} />
        </div>
        <div>
          <label className="form-label" htmlFor="ky-kind">{t("Kind", "النوع")}</label>
          <select id="ky-kind" name="kind" className="input" defaultValue="passport">
            <option value="passport">{t("Passport", "جواز سفر")}</option>
            <option value="id_card">{t("ID card", "بطاقة هوية")}</option>
            <option value="license">{t("License", "رخصة مهنية")}</option>
            <option value="diploma">{t("Diploma", "شهادة")}</option>
            <option value="other">{t("Other", "أخرى")}</option>
          </select>
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="ky-file">{t("File (PDF or image, max 10 MB)", "ملف (PDF أو صورة، ١٠MB كحد أقصى)")}</label>
        <input id="ky-file" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="input" required />
      </div>
      {error && <p className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      {ok && <p className="rounded-md bg-success-tint px-3 py-2 text-sm text-success">{t("Uploaded.", "تم الرفع.")}</p>}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? t("Uploading…", "جارٍ الرفع…") : t("Upload document", "رفع الوثيقة")}
      </Button>
    </form>
  );
}
