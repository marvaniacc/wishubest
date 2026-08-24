import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, EmptyState } from "@/components/ui";
import CatalogManager from "@/components/admin/CatalogManager";

export const dynamic = "force-dynamic";

export default async function AdminCatalog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [cats, cur, comm] = await Promise.all([
    apiFetch<{ id: string; slug: string; nameEn: string; nameAr: string }[]>("/public/categories", { revalidate: false }),
    apiFetch<{ isoCode: string; symbol: string; decimalPlaces: number } | null>("/admin/currency", { revalidate: false }),
    apiFetch<{ providerType: string; platformFeeRateBps: number; affiliateCommissionRateBps: number }[]>(
      "/admin/commission",
      { revalidate: false },
    ),
  ]);
  if (!cats.ok || !cur.ok || !comm.ok) return <EmptyState>{d.common.error}</EmptyState>;

  return (
    <div className="max-w-4xl">
      <PageTitle sub={`${d.dash.categories} · ${d.dash.currency} · ${d.dash.commission}`}>
        {locale === "ar" ? "إعدادات الكتالوج والمالية" : "Catalog & financial settings"}
      </PageTitle>
      <CatalogManager
        locale={locale}
        categories={cats.data ?? []}
        currency={cur.data}
        commissions={comm.data ?? []}
      />
    </div>
  );
}
