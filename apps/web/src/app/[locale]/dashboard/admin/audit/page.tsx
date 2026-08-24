import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminAudit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  void getDictionary;
  const res = await apiFetch<
    {
      id: number;
      actorId: string | null;
      actorRole: string | null;
      action: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
    }[]
  >("/admin/audit-logs?limit=100", { revalidate: false });
  if (!res.ok) return <EmptyState>{locale === "ar" ? "خطأ" : "Error"}</EmptyState>;

  return (
    <div className="max-w-4xl">
      <PageTitle sub={locale === "ar" ? "من غيّر ماذا ومتى" : "Who changed what, when"}>
        {locale === "ar" ? "سجل التغييرات" : "Audit log"}
      </PageTitle>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <th className="p-3 text-start">When</th>
              <th className="p-3 text-start">Actor</th>
              <th className="p-3 text-start">Action</th>
              <th className="p-3 text-start">Entity</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-none">
                <td className="p-3 font-mono text-xs">{row.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td className="p-3">{row.actorRole ?? "system"}</td>
                <td className="p-3 font-mono text-xs text-primary">{row.action}</td>
                <td className="p-3 font-mono text-xs text-ink-soft">
                  {row.entityType}/{(row.entityId ?? "").slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
