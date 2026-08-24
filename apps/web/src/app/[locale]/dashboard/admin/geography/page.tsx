import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, EmptyState } from "@/components/ui";
import GeographyManager from "@/components/admin/GeographyManager";

export const dynamic = "force-dynamic";

export default async function AdminGeography({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [cRes, cityRes] = await Promise.all([
    apiFetch<{ id: string; nameEn: string; nameAr: string; slug: string; iso2: string; active: boolean }[]>(
      "/public/countries",
      { revalidate: false },
    ),
    apiFetch<{ id: string; nameEn: string; nameAr: string; slug: string; countryId: string; active: boolean }[]>(
      "/public/cities",
      { revalidate: false },
    ),
  ]);
  if (!cRes.ok) return <EmptyState>{d.common.error}</EmptyState>;

  return (
    <div className="max-w-4xl">
      <PageTitle>{`${d.dash.countries} & ${d.dash.cities}`}</PageTitle>
      <GeographyManager
        countries={cRes.data ?? []}
        cities={cityRes.ok ? cityRes.data ?? [] : []}
        locale={locale}
      />
    </div>
  );
}
