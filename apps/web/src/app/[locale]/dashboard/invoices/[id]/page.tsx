import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge } from "@/components/ui";
import PayButton from "@/components/PayButton";

export const dynamic = "force-dynamic";

export default async function InvoiceDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<{
    invoice: {
      id: string;
      number: string;
      status: string;
      totalMinor: number;
      currencyIso: string;
      issuedAt: string | null;
      paidAt: string | null;
    };
    items: { id: string; label: string; descriptionSnapshot: string; quantity: number; unitAmountMinor: number; amountMinor: number }[];
    payments: { id: string; status: string }[];
  }>(`/invoices/${id}`, { revalidate: false });
  if (!res.ok) notFound();
  const { invoice, items, payments } = res.data;
  const money = (m: number) => `$${(Number(m) / 100).toFixed(2)}`;

  return (
    <div className="max-w-3xl">
      <PageTitle sub={`${d.invoice.number} ${invoice.number}`}>{d.dash.invoices}</PageTitle>

      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-ink-soft">{invoice.number}</span>
          <StatusBadge status={invoice.status} label={(d.status as Record<string, string>)[invoice.status]} />
          <span className="ms-auto font-mono text-2xl font-bold text-primary-dark">
            {money(invoice.totalMinor)}
          </span>
        </div>
        <table className="mt-5 w-full text-sm">
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-line">
                <td className="py-2">
                  <p className="font-medium">{it.label}</p>
                  {it.descriptionSnapshot && <p className="text-xs text-ink-soft line-clamp-2">{it.descriptionSnapshot}</p>}
                </td>
                <td className="py-2 text-end font-mono">{money(it.amountMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {invoice.paidAt && (
          <p className="mt-4 rounded-md bg-success-tint px-4 py-2 text-sm font-medium text-success">
            {d.invoice.paid} {new Date(invoice.paidAt).toLocaleString(locale === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}

        {invoice.status === "PENDING_PAYMENT" && (
          <div className="mt-6 flex items-center gap-3">
            <PayButton locale={locale} invoiceId={invoice.id} />
            {payments.some((p) => p.status === "FAILED" || p.status === "CANCELED") && (
              <span className="text-sm text-danger">{(d.status as Record<string, string>).FAILED}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
