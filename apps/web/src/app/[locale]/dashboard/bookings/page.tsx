import Link from "next/link";
import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { StatusBadge, JourneyRule, PageTitle, EmptyState } from "@/components/ui";
import BookingActions from "@/components/BookingActions";

export const dynamic = "force-dynamic";

const JOURNEY_STEPS = {
  en: ["Discovery", "Booking", "Payment", "Review"],
  ar: ["الاكتشاف", "الحجز", "الدفع", "التقييم"],
} as const;

function journeyIndex(status: string): number {
  switch (status) {
    case "REQUESTED":
      return 1;
    case "AWAITING_PAYMENT":
      return 2;
    case "CONFIRMED":
    case "COMPLETED":
      return 3;
    default:
      return 0;
  }
}

interface CommonRow {
  booking: {
    id: string;
    code: string;
    status: string;
    scheduledAt: string | null;
    meetingLink: string | null;
    patientNote: string;
    cancellationReason: string | null;
  };
  serviceTitle: string;
  providerName?: string;
  providerSlug?: string;
  patientName?: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  invoiceTotalMinor?: number | null;
}

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const me = await apiFetch<{ user?: { role: string } }>("/auth/me", { revalidate: false });
  const role = me.data?.user?.role ?? "patient";
  const res = await apiFetch<{ items: CommonRow[] }>("/bookings", { revalidate: false });
  const provRes =
    role === "provider"
      ? await apiFetch<{ items: CommonRow[] }>("/provider/bookings", { revalidate: false })
      : null;
  const items = role === "provider" ? provRes?.data?.items ?? [] : res.ok ? res.data.items : [];

  if (!res.ok && role !== "provider") return <EmptyState>{d.common.error}</EmptyState>;
  if (role === "provider" && !provRes?.ok) return <EmptyState>{d.common.error}</EmptyState>;

  const money = (m: number) => `$${(Number(m) / 100).toFixed(2)}`;

  return (
    <div>
      <PageTitle sub={d.dash.welcome}>{d.dash.bookings}</PageTitle>
      {items.length === 0 ? (
        <EmptyState>{d.common.empty}</EmptyState>
      ) : (
        <div className="space-y-4">
          {items.map((row) => (
            <article key={row.booking.id + row.booking.code + String(row.booking.scheduledAt ?? "")} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-ink-soft">{row.booking.code}</span>
                <h2 className="text-base font-semibold">{row.serviceTitle}</h2>
                {role === "patient" && row.providerSlug ? (
                  <Link href={`/${locale}/providers/${row.providerSlug}`} className="text-sm text-primary hover:underline">
                    {row.providerName}
                  </Link>
                ) : (
                  row.patientName && <span className="text-sm text-ink-soft">— {row.patientName}</span>
                )}
                <span className="ms-auto flex items-center gap-2">
                  {role === "patient" &&
                    row.invoiceId &&
                    row.invoiceStatus !== "PAID" &&
                    row.booking.status === "AWAITING_PAYMENT" && (
                      <a
                        href={`/${locale}/dashboard/invoices/${row.invoiceId}`}
                        className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
                      >
                        {d.invoice.payNow}
                      </a>
                    )}
                  <StatusBadge
                    status={row.booking.status}
                    label={(d.status as Record<string, string>)[row.booking.status]}
                  />
                </span>
              </div>

              {role === "patient" && (
                <JourneyRule steps={[...JOURNEY_STEPS[locale]]} current={journeyIndex(row.booking.status)} compact />
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-soft">
                {row.booking.scheduledAt && (
                  <span>
                    {d.common.when}:{" "}
                    <span className="font-mono">
                      {new Date(row.booking.scheduledAt).toLocaleString(locale === "ar" ? "ar" : "en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </span>
                  </span>
                )}
                {row.invoiceTotalMinor != null && (
                  <span>
                    {d.invoice.total}: <span className="font-mono font-semibold">{money(row.invoiceTotalMinor)}</span>
                  </span>
                )}
                {row.invoiceNumber && (
                  <span className="font-mono text-xs">
                    {row.invoiceNumber} · {(d.status as Record<string, string>)[row.invoiceStatus ?? ""] ?? ""}
                  </span>
                )}
                {row.booking.meetingLink && (
                  <a href={row.booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">
                    {d.common.meetingLink}
                  </a>
                )}
                {role === "patient" && row.booking.status === "COMPLETED" && (
                  <Link
                    href={`/${locale}/dashboard/bookings/${row.booking.id}`}
                    className="font-semibold text-accent-dark hover:underline"
                  >
                    {d.provider.reviews} →
                  </Link>
                )}
              </div>

              {role === "provider" && (
                <BookingActions
                  locale={locale}
                  bookingId={row.booking.id}
                  status={row.booking.status}
                  meetingLink={row.booking.meetingLink}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
