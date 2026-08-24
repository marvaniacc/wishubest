import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, EmptyState } from "@/components/ui";
import ProfileForm from "@/components/ProfileForm";
import SubmitForReview from "@/components/SubmitForReview";

export const dynamic = "force-dynamic";

export default async function ProviderProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [res, countries] = await Promise.all([
    apiFetch<{ profile?: { id: string; providerType: string; displayName: string; slug: string; summary: string; description: string; status: string; countryId: string | null; cityId: string | null; addressLine: string } | null }>(
      "/provider/profile",
      { revalidate: false },
    ),
    apiFetch<{ id: string; nameEn: string; nameAr: string }[]>("/public/countries", { revalidate: false }),
  ]);
  if (!res.ok) return <EmptyState>{d.common.error}</EmptyState>;
  const p = res.data.profile;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <PageTitle>{d.dash.profile}</PageTitle>
        {p && (
          <span className="mb-6">
            <StatusBadge status={p.status} label={(d.status as Record<string, string>)[p.status]} />
          </span>
        )}
      </div>
      {p && <SubmitForReview locale={locale} status={p.status} />}
      <ProfileForm
        locale={locale}
        profile={p ?? undefined}
        countries={(countries.data ?? []).map((c) => ({ id: c.id, name: locale === "ar" ? c.nameAr : c.nameEn }))}
      />
    </div>
  );
}
