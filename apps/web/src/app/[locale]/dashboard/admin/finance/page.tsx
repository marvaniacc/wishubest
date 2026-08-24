import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminFinance({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [inv, pay, tx] = await Promise.all([
    apiFetch<{ id: string; number: string; status: string; totalMinor: number; currencyIso: string; createdAt: string }[]>(
      "/admin/invoices",
      { revalidate: false },
    ),
    apiFetch<{ id: string; gatewayRef: string; status: string; amountMinor: number; createdAt: string }[]>(
      "/admin/payments",
      { revalidate: false },
    ),
    apiFetch<{
      id: number;
      invoiceId: string;
      currencyIso: string;
      grossMinor: number;
      platformFeeRateBps: number;
      platformFeeMinor: number;
      providerNetMinor: number;
      affiliateCommissionRateBps: number;
      createdAt: string;
    }[]>("/admin/transactions", { revalidate: false }),
  ]);
  if (!inv.ok || !pay.ok || !tx.ok) return <EmptyState>{d.common.error}</EmptyState>;
  const money = (m: number) => `$${(Number(m) / 100).toFixed(2)}`;

  return (
    <div>
      <PageTitle sub={locale === "ar" ? "سجلات مالية للقراءة فقط" : "Read-only financial records"}>{d.dash.finance}</PageTitle>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">{locale === "ar" ? "المعاملات" : "Transactions"}</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="p-3 text-start">#</th>
                <th className="p-3 text-start">Gross</th>
                <th className="p-3 text-start">{t_rate(locale)}</th>
                <th className="p-3 text-start">{t_fee(locale)}</th>
                <th className="p-3 text-start">{t_net(locale)}</th>
                <th className="p-3 text-start">{t_date(locale)}</th>
              </tr>
            </thead>
            <tbody>
              {tx.data.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-ink-soft">{d.common.empty}</td></tr>
              )}
              {tx.data.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-none font-mono">
                  <td className="p-3">{row.id}</td>
                  <td className="p-3">{money(row.grossMinor)}</td>
                  <td className="p-3">{(row.platformFeeRateBps / 100).toFixed(2)}%</td>
                  <td className="p-3 text-warning-dark">{money(row.platformFeeMinor)}</td>
                  <td className="p-3 font-semibold">{money(row.providerNetMinor)}</td>
                  <td className="p-3 text-xs">{new Date(row.createdAt).toISOString().slice(0, 16)}Z</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">{d.dash.invoices}</h2>
          <div className="card max-h-[420px] overflow-y-auto p-0">
            <table className="w-full text-sm">
              <tbody>
                {inv.data.slice(0, 50).map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-none">
                    <td className="p-3 font-mono text-xs">{i.number}</td>
                    <td className="p-3 font-mono">{money(i.totalMinor)}</td>
                    <td className="p-3"><StatusBadge status={i.status} label={(d.status as Record<string, string>)[i.status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">{locale === "ar" ? "المدفوعات" : "Payments"}</h2>
          <div className="card max-h-[420px] overflow-y-auto p-0">
            <table className="w-full text-sm">
              <tbody>
                {pay.data.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-none">
                    <td className="p-3 font-mono text-xs">{p.gatewayRef.slice(0, 22)}…</td>
                    <td className="p-3 font-mono">{money(p.amountMinor)}</td>
                    <td className="p-3"><StatusBadge status={p.status} label={(d.status as Record<string, string>)[p.status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function t_rate(l: Locale) { return l === "ar" ? "النسبة" : "Rate"; }
function t_fee(l: Locale) { return l === "ar" ? "عمولة المنصة" : "Platform fee"; }
function t_net(l: Locale) { return l === "ar" ? "صافي المقدم" : "Provider net"; }
function t_date(l: Locale) { return l === "ar" ? "التاريخ" : "Date"; }
