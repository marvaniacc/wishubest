import type { Locale } from "@/i18n/config";
import { PageTitle } from "@/components/ui";

export const revalidate = 3600;

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageTitle>{t("About WishUBest", "عن ويشيوبيست")}</PageTitle>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          {t(
            "WishUBest is an international medical tourism marketplace. We help patients discover verified doctors, hospitals, hotels and translators across borders — then handle booking, invoicing and secure payment in one place.",
            "ويشيوبيست منصة عالمية للسياحة العلاجية. نساعد المرضى على اكتشاف أطباء ومستشفيات وفنادق ومترجمين موثوقين عبر الحدود — ثم ندير الحجز والفوترة والدفع الآمن في مكان واحد.",
          )}
        </p>
        <p className="text-ink-soft">
          {t(
            "Every provider passes identity verification (KYC) before going public, reviews are only allowed after completed paid visits, and all prices are locked at confirmation time.",
            "يجتاز كل مقدم خدمة التحقق من الهوية قبل الظهور للعامة، ولا يُسمح بالتقييمات إلا بعد زيارات مكتملة ومدفوعة، وتُثبَّت جميع الأسعار وقت التأكيد.",
          )}
        </p>
      </div>
    </div>
  );
}
