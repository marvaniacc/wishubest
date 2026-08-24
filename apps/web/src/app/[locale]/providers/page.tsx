import { getDictionary, type Locale } from "@/i18n/config";
import { apiFetch } from "@/lib/api-server";
import { ProviderCard, PageTitle, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

interface Filters {
  type?: string;
  country?: string;
  city?: string;
  category?: string;
  minRating?: string;
}

export default async function ProvidersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const d = getDictionary(locale);
  const sp = await searchParams;

  const qs = new URLSearchParams();
  for (const k of ["type", "country", "city", "category", "minRating"] as const) {
    if (sp[k]) qs.set(k, sp[k]!);
  }
  qs.set("limit", "50");

  const [res, countries, cities, categories] = await Promise.all([
    apiFetch<{
      items: {
        slug: string;
        displayName: string;
        providerType: string;
        photoUrl: string | null;
      }[];
      total: number;
    }>(`/public/providers?${qs.toString()}`, { revalidate: 30 }),
    apiFetch<{ id: string; slug: string; nameEn: string; nameAr: string }[]>("/public/countries", { revalidate: 300 }),
    apiFetch<{ id: string; slug: string; nameEn: string; nameAr: string; countryId: string }[]>("/public/cities", { revalidate: 300 }),
    apiFetch<{ id: string; slug: string; nameEn: string; nameAr: string }[]>("/public/categories", { revalidate: 300 }),
  ]);

  const label = (item: { nameEn: string; nameAr: string }) =>
    locale === "ar" ? item.nameAr : item.nameEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageTitle sub={`${res.ok ? res.data.total : 0} ${d.filters.results}`}>
        {d.nav.providers}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form method="get" className="card h-max space-y-4 p-4">
          <p className="form-label">{d.filters.title}</p>
          <div>
            <label className="form-label" htmlFor="f-type">{d.filters.type}</label>
            <select id="f-type" name="type" defaultValue={sp.type ?? ""} className="input">
              <option value="">{d.filters.any}</option>
              {(["doctor", "hospital", "hotel", "translator"] as const).map((t) => (
                <option key={t} value={t}>{d.types[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="f-country">{d.filters.country}</label>
            <select id="f-country" name="country" defaultValue={sp.country ?? ""} className="input">
              <option value="">{d.filters.any}</option>
              {(countries.data ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{label(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="f-city">{d.filters.city}</label>
            <select id="f-city" name="city" defaultValue={sp.city ?? ""} className="input">
              <option value="">{d.filters.any}</option>
              {(cities.data ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{label(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="f-category">{d.filters.category}</label>
            <select id="f-category" name="category" defaultValue={sp.category ?? ""} className="input">
              <option value="">{d.filters.any}</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{label(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="f-rating">{d.filters.minRating}</label>
            <select id="f-rating" name="minRating" defaultValue={sp.minRating ?? ""} className="input">
              <option value="">{d.filters.any}</option>
              {[3, 4, 4.5].map((r) => (
                <option key={r} value={r}>{r}+</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
              {d.filters.apply}
            </button>
            <a href={`/${locale}/providers`} className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-primary-tint/40">
              {d.filters.reset}
            </a>
          </div>
        </form>

        <div>
          {!res.ok || res.data.items.length === 0 ? (
            <EmptyState>{d.common.empty}</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {res.data.items.map((p) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
