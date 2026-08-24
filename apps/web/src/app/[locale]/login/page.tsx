import type { Metadata } from "next";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle } from "@/components/ui";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <PageTitle sub={d.auth.loginSub}>{d.auth.loginTitle}</PageTitle>
      <div className="card p-6">
        <AuthForm mode="login" locale={locale} />
        <p className="mt-4 text-center text-sm text-ink-soft">
          {d.auth.noAccount}{" "}
          <a href={`/${locale}/register`} className="font-semibold text-primary hover:underline">
            {d.nav.register}
          </a>
        </p>
      </div>
    </div>
  );
}
