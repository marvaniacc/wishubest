import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, EmptyState } from "@/components/ui";
import ModerateButton from "@/components/admin/ModerateButton";

export const dynamic = "force-dynamic";

export default async function AdminReviews({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<
    {
      review: { id: string; rating: number; title: string; body: string; createdAt: string };
      providerName: string;
    }[]
  >("/admin/reviews?status=pending", { revalidate: false });
  if (!res.ok) return <EmptyState>{d.common.error}</EmptyState>;

  return (
    <div className="max-w-3xl">
      <PageTitle sub={locale === "ar" ? "تقييمات بانتظار الموافقة" : "Reviews awaiting moderation"}>
        {d.dash.reviews}
      </PageTitle>
      <div className="space-y-4">
        {res.data.length === 0 && <EmptyState>{d.common.empty}</EmptyState>}
        {res.data.map((row) => (
          <article key={row.review.id} className="card p-5">
            <div className="flex items-center gap-2">
              <span className="text-warning">{"★".repeat(row.review.rating)}</span>
              <span className="text-sm font-medium">{row.providerName}</span>
              <span className="ms-auto text-xs text-ink-soft">
                {new Date(row.review.createdAt).toISOString().slice(0, 10)}
              </span>
            </div>
            {row.review.title && <h3 className="mt-1 font-semibold">{row.review.title}</h3>}
            <p className="mt-1 text-sm text-ink-soft">{row.review.body}</p>
            <ModerateButton locale={locale} reviewId={row.review.id} />
          </article>
        ))}
      </div>
    </div>
  );
}
