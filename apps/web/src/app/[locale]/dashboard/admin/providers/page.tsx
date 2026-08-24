import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, EmptyState } from "@/components/ui";
import ProviderDecision from "@/components/admin/ProviderDecision";

export const dynamic = "force-dynamic";

export default async function AdminProviders({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<
    {
      id: string;
      displayName: string;
      providerType: string;
      status: string;
      kycStatus: string;
      slug: string;
      summary: string;
    }[]
  >("/admin/providers", { revalidate: false });
  if (!res.ok) return <EmptyState>{d.common.error}</EmptyState>;

  return (
    <div>
      <PageTitle sub={locale === "ar" ? "مراجعة واعتماد مقدمي الخدمة" : "Review and approve providers"}>
        {d.dash.providers}
      </PageTitle>
      <div className="space-y-3">
        {res.data.length === 0 && <EmptyState>{d.common.empty}</EmptyState>}
        {res.data.map((p) => (
          <article key={p.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold">{p.displayName}</h2>
              <span className="text-sm text-accent-dark">{(d.types as Record<string, string>)[p.providerType]}</span>
              <StatusBadge status={p.status} label={(d.status as Record<string, string>)[p.status]} />
              <span className="ms-auto flex items-center gap-2 text-xs text-ink-soft">
                KYC:
                <StatusBadge status={p.kycStatus} label={(d.status as Record<string, string>)[p.kycStatus]} />
              </span>
            </div>
            {p.summary && <p className="mt-1 text-sm text-ink-soft">{p.summary}</p>}
            <ProviderDecision locale={locale} providerId={p.id} status={p.status} kycStatus={p.kycStatus} />
          </article>
        ))}
      </div>
    </div>
  );
}
