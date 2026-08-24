"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

interface Profile {
  id: string;
  providerType: string;
  displayName: string;
  slug?: string;
  summary: string;
  description: string;
  status: string;
  countryId: string | null;
  cityId: string | null;
  addressLine: string;
}

const TYPES = ["doctor", "hospital", "hotel", "translator"] as const;

export default function ProfileForm({
  locale,
  profile,
  countries,
}: {
  locale: Locale;
  profile?: Profile;
  countries: { id: string; name: string }[];
}) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [countryId, setCountryId] = useState(profile?.countryId ?? "");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setMsg("");
    const body = {
      providerType: String(fd.get("providerType")),
      displayName: String(fd.get("displayName")),
      summary: String(fd.get("summary") ?? ""),
      description: String(fd.get("description") ?? ""),
      countryId: String(fd.get("countryId")) || null,
      cityId: String(fd.get("cityId")) || null,
      addressLine: String(fd.get("addressLine") ?? ""),
    };
    const res = profile
      ? await apiCall<{ error?: string }>("/provider/profile", { method: "PUT", body })
      : await apiCall<{ error?: string }>("/provider/profile", { method: "PUT", body });
    setBusy(false);
    if (res.ok) {
      setMsg(t("Saved.", "تم الحفظ."));
      router.refresh();
    } else {
      setMsg(t("Could not save.", "تعذر الحفظ."));
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="pf-type">{t("Provider type", "نوع مقدم الخدمة")}</label>
          <select id="pf-type" name="providerType" className="input" defaultValue={profile?.providerType ?? "doctor"} required>
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tp === "doctor" ? t("Doctor", "طبيب") : tp === "hospital" ? t("Hospital", "مستشفى") : tp === "hotel" ? t("Hotel", "فندق") : t("Translator", "مترجم")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="pf-name">{t("Display name", "الاسم الظاهر")}</label>
          <input id="pf-name" name="displayName" className="input" defaultValue={profile?.displayName} required maxLength={160} />
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="pf-summary">{t("Short summary", "نبذة مختصرة")}</label>
        <input id="pf-summary" name="summary" className="input" maxLength={280} defaultValue={profile?.summary} />
      </div>
      <div>
        <label className="form-label" htmlFor="pf-desc">{t("Description", "الوصف")}</label>
        <textarea id="pf-desc" name="description" rows={5} className="input" maxLength={8000} defaultValue={profile?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="form-label" htmlFor="pf-country">{t("Country", "الدولة")}</label>
          <select id="pf-country" name="countryId" className="input" value={countryId ?? ""} onChange={(e) => setCountryId(e.target.value)}>
            <option value="">—</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="pf-city">{t("City (slug)", "المدينة")}</label>
          <input id="pf-city" name="cityId" className="input font-mono" placeholder="city uuid" defaultValue={profile?.cityId ?? ""} />
        </div>
        <div>
          <label className="form-label" htmlFor="pf-addr">{t("Address line", "العنوان")}</label>
          <input id="pf-addr" name="addressLine" className="input" maxLength={300} defaultValue={profile?.addressLine} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t("Saving…", "جارٍ الحفظ…") : t("Save", "حفظ")}
        </Button>
        {!profile && <span className="text-sm text-ink-soft">{t("Saving creates your draft profile.", "سيتم إنشاء مسودة ملفك عند الحفظ.")}</span>}
        {msg && <span className="text-sm text-success">{msg}</span>}
      </div>
    </form>
  );
}
