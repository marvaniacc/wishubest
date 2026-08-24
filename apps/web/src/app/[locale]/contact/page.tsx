import type { Locale } from "@/i18n/config";
import { PageTitle } from "@/components/ui";

export const revalidate = 3600;

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageTitle>{t("Contact us", "اتصل بنا")}</PageTitle>
      <div className="card space-y-2 p-6 text-sm">
        <p>
          <span className="form-label mb-0">{t("Email", "البريد الإلكتروني")}</span>
          <a href="mailto:support@wishubest.com" className="font-mono text-primary">support@wishubest.com</a>
        </p>
        <p className="text-ink-soft">
          {t(
            "For provider onboarding questions, KYC support or payment issues, email us and we will reply within one business day.",
            "لأسئلة تسجيل مقدمي الخدمة أو دعم التوثيق أو مشاكل الدفع، راسلنا وسنرد خلال يوم عمل واحد.",
          )}
        </p>
      </div>
    </div>
  );
}
