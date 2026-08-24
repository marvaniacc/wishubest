import type { Metadata } from "next";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle } from "@/components/ui";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <PageTitle sub={d.auth.registerSub}>{d.auth.registerTitle}</PageTitle>
      <div className="card p-6">
        <AuthForm mode="register" locale={locale} />
        <p className="mt-4 text-center text-sm text-ink-soft">
          {d.auth.haveAccount}{" "}
          <a href={`/${locale}/login`} className="font-semibold text-primary hover:underline">
            {d.nav.login}
          </a>
        </p>
      </div>
    </div>
  );
}
