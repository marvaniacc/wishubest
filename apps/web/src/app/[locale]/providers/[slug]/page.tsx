import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, type Locale } from "@/i18n/config";
import { apiFetch } from "@/lib/api-server";
import { StatusBadge, BtnLink } from "@/components/ui";
import BookingForm from "@/components/BookingForm";
import { cookies } from "next/headers";

interface ProviderDetail {
  provider: {
    id: string;
    slug: string;
    displayName: string;
    providerType: string;
    summary: string;
    description: string;
    photoUrl: string | null;
    ratingAvg: number;
    reviewCount: number;
    addressLine: string;
    country: { slug: string; nameEn: string; nameAr: string } | null;
    city: { slug: string; nameEn: string; nameAr: string } | null;
  };
  services: {
    id: string;
    title: string;
    description: string;
    serviceMode: string;
    priceAmountMinor: number;
    durationMinutes: number;
    categoryNameEn: string | null;
    categoryNameAr: string | null;
  }[];
  slots: { id: string; starts_at: string; ends_at: string; service_id: string }[];
  reviews: { id: string; rating: number; title: string; body: string; createdAt: string }[];
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const SITE = process.env.APP_URL ?? "http://localhost:3000";
  const res = await apiFetch<ProviderDetail>(`/public/providers/${slug}`, { revalidate: false });
  if (!res.ok) return {};
  const nameOf = (x: { nameEn: string; nameAr: string }) =>
    locale === "ar" ? x.nameAr : x.nameEn;
  const loc = res.data.provider.city ?? res.data.provider.country;
  return {
    title: res.data.provider.displayName,
    description:
      res.data.provider.summary ||
      `${res.data.provider.displayName} — ${loc ? nameOf(loc) : ""}`,
    alternates: {
      canonical: `${SITE}/${locale}/providers/${slug}`,
      languages: {
        en: `${SITE}/en/providers/${slug}`,
        ar: `${SITE}/ar/providers/${slug}`,
      },
    },
  };
}

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<ProviderDetail>(`/public/providers/${slug}`, { revalidate: 30 });
  if (!res.ok) notFound();
  const { provider: p, services, slots, reviews } = res.data;

  const jar = await cookies();
  const isPatient = !!jar.get("wub_session")?.value;

  const nameOf = (x: { nameEn: string; nameAr: string }) => (locale === "ar" ? x.nameAr : x.nameEn);
  const fmtPrice = (minor: number) => `$${(minor / 100).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="card flex flex-wrap items-center gap-5 p-6">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt="" className="h-24 w-24 rounded-full border border-line object-cover" />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-tint font-display text-3xl text-primary">
            {p.displayName.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold">{p.displayName}</h1>
          <p className="mt-1 text-sm font-medium text-accent-dark">{d.types[p.providerType as keyof typeof d.types]}</p>
          {(p.city || p.country) && (
            <p className="mt-1 text-sm text-ink-soft">
              {d.provider.location}: {[p.city && nameOf(p.city), p.country && nameOf(p.country)].filter(Boolean).join(", ")}
              {p.addressLine ? ` — ${p.addressLine}` : ""}
            </p>
          )}
          {p.reviewCount > 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-mono text-base font-semibold text-primary">{Number(p.ratingAvg).toFixed(1)}</span>
              <span className="text-warning">{"★".repeat(Math.round(Number(p.ratingAvg)))}</span>
              <span className="text-ink-soft">({p.reviewCount})</span>
            </p>
          )}
        </div>
      </div>

      {p.description && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">{d.nav.about}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{p.description}</p>
        </section>
      )}

      {/* services */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">{d.provider.services}</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {services.length === 0 && <p className="text-sm text-ink-soft">{d.common.empty}</p>}
          {services.map((s) => (
            <article key={s.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {d.provider[`mode_${s.serviceMode}` as keyof typeof d.provider] ?? s.serviceMode}
                    {" · "}
                    {s.durationMinutes} {d.provider.duration}
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-md bg-primary-tint px-3 py-1 font-mono text-sm font-semibold text-primary-dark">
                  {fmtPrice(s.priceAmountMinor)}
                </span>
              </div>
              {s.description && (
                <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{s.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <BtnLink href={`#${isPatient ? "" : ""}`} variant="ghost" className="hidden" children="" />
                <BookingForm
                  locale={locale}
                  isPatient={isPatient}
                  serviceId={s.id}
                  serviceTitle={s.title}
                  slots={slots.filter((sl) => sl.service_id === s.id)}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* reviews */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">{d.provider.reviews}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {reviews.length === 0 && <p className="text-sm text-ink-soft">{d.provider.noReviews}</p>}
          {reviews.map((r) => (
            <blockquote key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-warning">{"★".repeat(r.rating)}</span>
                <StatusBadge status="approved" label={d.provider.verifiedOnly} />
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm text-ink-soft">{r.body}</p>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
