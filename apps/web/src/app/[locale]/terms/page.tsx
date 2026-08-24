import type { Locale } from "@/i18n/config";
import { PageTitle } from "@/components/ui";

export const revalidate = 3600;

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageTitle>{t("Terms of Service", "شروط الخدمة")}</PageTitle>
      <div className="space-y-4 text-sm leading-relaxed text-ink">
        <h2 className="font-semibold">{t("1. Platform role", "١. دور المنصة")}</h2>
        <p>
          {t(
            "WishUBest is a marketplace. We connect patients with independent providers and process payments for bookings. We do not practice medicine or employ providers.",
            "ويشيوبيست منصة وسيطة. نربط المرضى بمقدمي خدمات مستقلين ونعالج مدفوعات الحجوزات. لا نمارس الطب ولا نوظّف مقدمي خدمات.",
          )}
        </p>
        <h2 className="font-semibold">{t("2. Bookings & cancellations", "٢. الحجوزات والإلغاء")}</h2>
        <p>
          {t(
            "All bookings are requests until confirmed by the provider. Unpaid requests expire automatically. Payment is due only after confirmation via a secure invoice.",
            "جميع الحجوزات طلبات حتى يؤكد بها مقدم الخدمة. تنتهي الطلبات غير المدفوعة تلقائياً. لا يُطلب الدفع إلا بعد التأكيد عبر فاتورة آمنة.",
          )}
        </p>
        <h2 className="font-semibold">{t("3. Prices", "٣. الأسعار")}</h2>
        <p>
          {t(
            "Invoice amounts are snapshotted at confirmation time in the platform currency and never change afterwards.",
            "تُثبَّت مبالغ الفواتير وقت التأكيد بعملة المنصة ولا تتغير بعد ذلك.",
          )}
        </p>
        <h2 className="font-semibold">{t("4. Medical disclaimer", "٤. إخلاء المسؤولية الطبية")}</h2>
        <p>
          {t(
            "Content on WishUBest is informational and not medical advice. Always consult a qualified professional about your specific situation.",
            "المحتوى في ويشيوبيست للمعلومات فقط وليس نصيحة طبية. استشر دائماً مختصاً مؤهلاً عن حالتك.",
          )}
        </p>
      </div>
    </div>
  );
}
