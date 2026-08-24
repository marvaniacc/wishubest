import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, StatusBadge, Button } from "@/components/ui";
import ReviewForm from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

export default async function BookingDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const res = await apiFetch<{
    booking: {
      id: string;
      code: string;
      status: string;
      scheduledAt: string | null;
      meetingLink: string | null;
      patientNote: string;
    };
    providerName: string;
    serviceTitle: string;
    serviceMode: string;
    invoice: { id: string; number: string; status: string; totalMinor: number; currencyIso: string } | null;
    items: { id: string; label: string; amountMinor: number; quantity: number }[];
    review: { id: string; status: string } | null;
  }>(`/bookings/${id}`, { revalidate: false });

  if (!res.ok) notFound();
  const data = res.data;
  const money = (m: number) => `$${(Number(m) / 100).toFixed(2)}`;

  return (
    <div className="max-w-3xl">
      <PageTitle sub={data.booking.code}>{data.serviceTitle}</PageTitle>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-soft">{data.providerName}</span>
          <span className="ms-auto">
            <StatusBadge status={data.booking.status} label={(d.status as Record<string, string>)[data.booking.status]} />
          </span>
        </div>
        {data.booking.scheduledAt && (
          <p className="mt-2 text-sm">
            {d.common.when}:{" "}
            <span className="font-mono">
              {new Date(data.booking.scheduledAt).toLocaleString(locale === "ar" ? "ar" : "en", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: "UTC",
              })}{" "}
              UTC
            </span>
          </p>
        )}
        {data.booking.meetingLink && (
          <p className="mt-2 text-sm">
            {d.common.meetingLink}:{" "}
            <a className="text-info hover:underline" href={data.booking.meetingLink} target="_blank" rel="noopener noreferrer">
              {data.booking.meetingLink}
            </a>
          </p>
        )}
        {data.booking.patientNote && <p className="mt-2 text-sm text-ink-soft">“{data.booking.patientNote}”</p>}
      </div>

      {data.invoice && (
        <div className="card mt-6 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold">
              {d.invoice.number} <span className="font-mono">{data.invoice.number}</span>
            </h2>
            <StatusBadge status={data.invoice.status} label={(d.status as Record<string, string>)[data.invoice.status]} />
            <a
              href={`/${locale}/dashboard/invoices/${data.invoice.id}`}
              className="ms-auto text-sm font-semibold text-primary hover:underline"
            >
              {d.invoice.view} →
            </a>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {data.items.map((it) => (
              <li key={it.id} className="flex justify-between border-b border-line pb-1 last:border-none">
                <span>{it.label}</span>
                <span className="font-mono">{money(it.amountMinor)}</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 font-semibold">
              <span>{d.invoice.total}</span>
              <span className="font-mono">{money(data.invoice.totalMinor)}</span>
            </li>
          </ul>
        </div>
      )}

      {/* verified review */}
      {data.booking.status === "COMPLETED" &&
        data.invoice?.status === "PAID" &&
        (data.review ? (
          <div className="mt-6 rounded-md bg-info-tint px-4 py-3 text-sm text-info">
            {(d.status as Record<string, string>)[data.review.status] ?? data.review.status}
          </div>
        ) : (
          <ReviewForm locale={locale} bookingId={data.booking.id} />
        ))}
    </div>
  );
}
