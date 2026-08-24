import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@/i18n/config";
import { apiFetch } from "@/lib/api-server";
import { ProviderCard, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CountryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<{
    country: { slug: string; nameEn: string; nameAr: string };
    providers: { slug: string; displayName: string; providerType: string; photoUrl: string | null }[];
  }>(`/public/countries/${slug}`);
  if (!res.ok) notFound();
  const { country, providers } = res.data;
  const name = locale === "ar" ? country.nameAr : country.nameEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageTitle sub={`${providers.length} ${d.filters.results}`}>{name}</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <ProviderCard
            key={p.slug}
            slug={p.slug}
            displayName={p.displayName}
            providerType={p.providerType}
            photoUrl={p.photoUrl}
            typeName={d.types[p.providerType as keyof typeof d.types] ?? p.providerType}
          />
        ))}
      </div>
    </div>
  );
}
