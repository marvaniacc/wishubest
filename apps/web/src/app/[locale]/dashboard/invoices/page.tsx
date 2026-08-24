import Link from "next/link";
import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PatientInvoices({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<{
    items: {
      invoice: { id: string; number: string; status: string; totalMinor: number; issuedAt: string | null; paidAt: string | null };
      bookingCode: string;
      providerName: string;
    }[];
  }>("/invoices", { revalidate: false });

  if (!res.ok) return <EmptyState>{d.common.error}</EmptyState>;
  const money = (m: number) => `$${(Number(m) / 100).toFixed(2)}`;

  return (
    <div>
      <PageTitle>{d.dash.invoices}</PageTitle>
      {res.data.items.length === 0 ? (
        <EmptyState>{d.common.empty}</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-ink-soft">
                <th className="p-3 text-start">{d.invoice.number}</th>
                <th className="p-3 text-start">{d.common.code}</th>
                <th className="p-3 text-start">{d.dash.providers}</th>
                <th className="p-3 text-start">{d.invoice.total}</th>
                <th className="p-3 text-start">{d.invoice.status}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {res.data.items.map((row) => (
                <tr key={row.invoice.id} className="border-b border-line last:border-none">
                  <td className="p-3 font-mono">{row.invoice.number}</td>
                  <td className="p-3 font-mono text-xs text-ink-soft">{row.bookingCode}</td>
                  <td className="p-3">{row.providerName}</td>
                  <td className="p-3 font-mono font-semibold">{money(row.invoice.totalMinor)}</td>
                  <td className="p-3">
                    <StatusBadge status={row.invoice.status} label={(d.status as Record<string, string>)[row.invoice.status]} />
                  </td>
                  <td className="p-3 text-end">
                    <Link href={`/${locale}/dashboard/invoices/${row.invoice.id}`} className="font-semibold text-primary hover:underline">
                      {d.invoice.view}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
