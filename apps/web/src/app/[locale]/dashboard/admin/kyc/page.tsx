import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, EmptyState } from "@/components/ui";
import KycDecision from "@/components/admin/KycDecision";

export const dynamic = "force-dynamic";

export default async function AdminKyc({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<
    { providerId: string; displayName: string; providerType: string; kycStatus: string }[]
  >("/admin/kyc", { revalidate: false });
  if (!res.ok) return <EmptyState>{d.common.error}</EmptyState>;

  return (
    <div>
      <PageTitle sub={locale === "ar" ? "مقدمو الخدمة الذين قدّموا وثائق التوثيق" : "Providers with submitted verification documents"}>
        {d.dash.kyc}
      </PageTitle>
      <div className="space-y-3">
        {res.data.length === 0 && <EmptyState>{d.common.empty}</EmptyState>}
        {res.data.map((p) => (
          <KycProviderCard key={p.providerId} locale={locale} provider={p} />
        ))}
      </div>
    </div>
  );
}

async function KycProviderCard({
  locale,
  provider,
}: {
  locale: Locale;
  provider: { providerId: string; displayName: string; providerType: string; kycStatus: string };
}) {
  const d = getDictionary(locale);
  const docs = await apiFetch<{ id: string; kind: string; title: string; originalName: string; sizeBytes: number }[]>(
    `/admin/kyc/${provider.providerId}/documents`,
    { revalidate: false },
  );

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">{provider.displayName}</h2>
        <span className="text-sm text-accent-dark">{(d.types as Record<string, string>)[provider.providerType]}</span>
        <StatusBadge status={provider.kycStatus} label={(d.status as Record<string, string>)[provider.kycStatus]} />
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {(docs.data ?? []).map((doc) => (
          <li key={doc.id} className="flex items-center gap-2">
            <a
              href={`/api/admin/kyc/documents/${doc.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              📄 {doc.title}
            </a>
            <span className="text-xs uppercase text-ink-soft">{doc.kind}</span>
            <span className="font-mono text-xs text-ink-soft">{Math.round(doc.sizeBytes / 1024)} KB</span>
          </li>
        ))}
      </ul>

      {provider.kycStatus === "submitted" && (
        <KycDecision locale={locale} providerId={provider.providerId} />
      )}
    </article>
  );
}
