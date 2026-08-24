import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, EmptyState } from "@/components/ui";
import KycUploader from "@/components/KycUploader";

export const dynamic = "force-dynamic";

export default async function ProviderKycPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [prof, docs] = await Promise.all([
    apiFetch<{ profile?: { kycStatus: string } | null }>("/provider/profile", { revalidate: false }),
    apiFetch<
      { id: string; kind: string; title: string; originalName: string; sizeBytes: number; status: string; reviewNote: string | null; createdAt: string }[]
    >("/provider/kyc/documents", { revalidate: false }),
  ]);
  if (!prof.ok || !docs.ok) return <EmptyState>{d.common.error}</EmptyState>;
  const kycStatus = prof.data.profile?.kycStatus ?? "not_started";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <PageTitle sub={locale === "ar" ? "ارفع وثائق هويتك للمراجعة. الملفات خاصة ولن تُنشر." : "Upload your identity documents for review. Files are private and never public."}>
          {d.dash.kyc}
        </PageTitle>
        <span className="mb-6">
          <StatusBadge status={kycStatus} label={(d.status as Record<string, string>)[kycStatus]} />
        </span>
      </div>
      <KycUploader locale={locale} />
      <h2 className="mt-8 mb-3 font-semibold">{locale === "ar" ? "الوثائق" : "Documents"}</h2>
      <div className="space-y-2">
        {docs.data.length === 0 && (
          <p className="card p-6 text-center text-sm text-ink-soft">{d.common.empty}</p>
        )}
        {docs.data.map((doc) => (
          <div key={doc.id} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="font-medium">{doc.title}</span>
            <span className="text-xs uppercase tracking-wide text-ink-soft">{doc.kind}</span>
            <span className="font-mono text-xs text-ink-soft">{Math.round(doc.sizeBytes / 1024)} KB</span>
            <StatusBadge status={doc.status} label={(d.status as Record<string, string>)[doc.status] ?? doc.status} />
            {doc.reviewNote && <span className="text-xs italic text-ink-soft">“{doc.reviewNote}”</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
