import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, EmptyState } from "@/components/ui";
import ServiceManager from "@/components/ServiceManager";

export const dynamic = "force-dynamic";

interface ServiceRow {
  id: string;
  title: string;
  description: string;
  serviceMode: string;
  priceAmountMinor: number;
  durationMinutes: number;
  status: string;
}

export default async function ProviderServices({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [res, cats] = await Promise.all([
    apiFetch<{ items: ServiceRow[]; currency: { isoCode: string; symbol: string; decimalPlaces: number } }>(
      "/provider/services",
      { revalidate: false },
    ),
    apiFetch<{ id: string; nameEn: string; nameAr: string }[]>("/public/categories", { revalidate: false }),
  ]);
  if (!res.ok) return <EmptyState>{d.common.error}</EmptyState>;
  const cur = res.data.currency;

  return (
    <div>
      <PageTitle sub={`${cur.isoCode} · ${cur.symbol}`}>{d.dash.services}</PageTitle>
      <ServiceManager
        locale={locale}
        items={res.data.items}
        currency={cur}
        categories={(cats.data ?? []).map((c) => ({ id: c.id, name: locale === "ar" ? c.nameAr : c.nameEn }))}
      />
    </div>
  );
}
