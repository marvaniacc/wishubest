import Link from "next/link";
import { getDictionary } from "@/i18n/config";
import { apiFetch } from "@/lib/api-server";
import { ProviderCard, BtnLink, JourneyRule } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const nameOf = (l: Locale | string) => (locale === "ar" ? l : l);

  const provs = await apiFetch<{
    items: { slug: string; displayName: string; providerType: string; photoUrl: string | null }[];
  }>(`/public/providers?limit=6`, { revalidate: 60 });
  void nameOf;

  return (
    <div>
      {/* hero */}
      <section className="border-b border-line bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="mb-3 inline-block rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-dark">
            {d.brand}
          </p>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-ink md:text-[56px]">
            {d.home.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-soft">{d.home.heroSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <BtnLink href={`/${locale}/providers`} variant="primary">
              {d.home.ctaPrimary}
            </BtnLink>
            <Link
              href="#how"
              className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-primary-tint/40"
            >
              {d.home.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* journey rule */}
      <section className="mx-auto max-w-3xl px-4 pt-12">
        <h2 className="text-center font-display text-xl font-semibold">{d.home.journey}</h2>
        <JourneyRule steps={d.home.steps} current={-1} />
      </section>

      {/* provider types */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-display text-xl font-semibold">{d.home.browseByType}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["doctor", "hospital", "hotel", "translator"] as const).map((t) => (
            <Link
              key={t}
              href={`/${locale}/providers?type=${t}`}
              className="card flex items-center justify-center p-5 text-sm font-semibold hover:border-primary"
            >
              {d.types[t]}
            </Link>
          ))}
        </div>
      </section>

      {/* featured */}
      {provs.ok && provs.data.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <h2 className="font-display text-xl font-semibold">{d.home.featured}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {provs.data.items.map((p) => (
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
        </section>
      )}

      {/* how it works */}
      <section id="how" className="border-t border-line bg-surface-2">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => {
            const key = `t${n}` as "t1";
            const dkey = `d${n}` as "d1";
            return (
              <div key={n}>
                <span className="font-mono text-sm text-accent">0{n}</span>
                <h3 className="mt-2 font-semibold">{d.home.how[key]}</h3>
                <p className="mt-1 text-sm text-ink-soft">{d.home.how[dkey]}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
