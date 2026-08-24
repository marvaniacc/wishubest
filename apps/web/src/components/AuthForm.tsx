"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/api-client";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export default function AuthForm({ mode, locale }: { mode: "login" | "register"; locale: Locale }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"patient" | "provider">("patient");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await apiCall<{ user?: { role: string }; error?: string }>(`/auth/${mode}`, {
      method: "POST",
      body: { email, password, ...(mode === "register" ? { role, displayName } : {}) },
    });
    if (res.ok) {
      router.replace(`/${locale}/dashboard`);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(
      res.data?.error === "email_already_registered"
        ? t("This email is already registered.", "هذا البريد مسجل بالفعل.")
        : res.data?.error === "invalid_credentials"
          ? t("Wrong email or password.", "بريد أو كلمة مرور غير صحيحة.")
          : t("Something went wrong. Please retry.", "حدث خطأ ما. حاول مرة أخرى."),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {mode === "register" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium ${role === "patient" ? "border-primary bg-primary-tint text-primary-dark" : "border-line"}`}>
              <input type="radio" name="role" className="sr-only" checked={role === "patient"} onChange={() => setRole("patient")} />
              {t("I'm a patient", "أنا مريض")}
            </label>
            <label className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium ${role === "provider" ? "border-primary bg-primary-tint text-primary-dark" : "border-line"}`}>
              <input type="radio" name="role" className="sr-only" checked={role === "provider"} onChange={() => setRole("provider")} />
              {t("I'm a provider", "أنا مقدم خدمة")}
            </label>
          </div>
          <div>
            <label className="form-label" htmlFor="af-name">{t("Full name", "الاسم الكامل")}</label>
            <input id="af-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={120} />
          </div>
        </>
      )}
      <div>
        <label className="form-label" htmlFor="af-email">{t("Email", "البريد الإلكتروني")}</label>
        <input id="af-email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="form-label" htmlFor="af-pass">{t("Password", "كلمة المرور")}</label>
        <input
          id="af-pass"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 10 : 1}
        />
        {mode === "register" && (
          <p className="mt-1 text-xs text-ink-soft">{t("At least 10 characters.", "١٠ أحرف على الأقل.")}</p>
        )}
      </div>
      {error && (
        <p className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <Button type="submit" variant="accent" disabled={busy} className="w-full">
        {busy
          ? t("Please wait…", "لحظة…")
          : mode === "login"
            ? t("Log in", "دخول")
            : t("Create account", "إنشاء الحساب")}
      </Button>
    </form>
  );
}
