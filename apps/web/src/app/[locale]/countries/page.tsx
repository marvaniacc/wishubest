import { getDictionary, type Locale } from "@/i18n/config";
import { apiFetch } from "@/lib/api-server";
import { PageTitle } from "@/components/ui";

export const revalidate = 300;

export default async function CountriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  void getDictionary;
  const res = await apiFetch<{ id: string; slug: string; nameEn: string; nameAr: string }[]>(
    "/public/countries",
    { revalidate: 300 },
  );
  const label = (c: { nameEn: string; nameAr: string }) => (locale === "ar" ? c.nameAr : c.nameEn);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageTitle>Destinations</PageTitle>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(res.data ?? []).map((c) => (
          <a key={c.id} href={`/${locale}/countries/${c.slug}`} className="card p-5 font-semibold hover:border-primary">
            {label(c)}
          </a>
        ))}
      </div>
    </div>
  );
}
