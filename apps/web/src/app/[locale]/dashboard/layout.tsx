import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-server";
import { Sidebar, type NavEntry } from "@/components/Sidebar";
import { getDictionary, LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/config";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const jar = await cookies();
  const session = jar.get("wub_session")?.value;
  if (!session) {
    redirect(`/${raw}/login`);
  }
  const me = await apiFetch<{ user?: { id: string; email: string; role: string; displayName: string | null } }>(
    "/auth/me",
    { revalidate: false },
  );
  if (!me.ok || !me.data.user) redirect(`/${raw}/login`);

  const locale = ((LOCALES as readonly string[]).includes(raw) ? raw : DEFAULT_LOCALE) as Locale;
  const d = getDictionary(locale);
  const role = me.data.user.role;

  const navs: Record<string, NavEntry[]> = {
    patient: [
      { href: `/${locale}/dashboard`, label: d.dash.overview, icon: "overview" },
      { href: `/${locale}/dashboard/bookings`, label: d.dash.bookings, icon: "bookings" },
      { href: `/${locale}/dashboard/invoices`, label: d.dash.invoices, icon: "invoices" },
    ],
    provider: [
      { href: `/${locale}/dashboard`, label: d.dash.overview, icon: "overview" },
      { href: `/${locale}/dashboard/bookings`, label: d.dash.bookings, icon: "bookings" },
      { href: `/${locale}/dashboard/services`, label: d.dash.services, icon: "services" },
      { href: `/${locale}/dashboard/slots`, label: d.dash.slots, icon: "slots" },
      { href: `/${locale}/dashboard/profile`, label: d.dash.profile, icon: "profile" },
      { href: `/${locale}/dashboard/kyc`, label: d.dash.kyc, icon: "kyc" },
    ],
    admin: [
      { href: `/${locale}/dashboard`, label: d.dash.overview, icon: "overview" },
      { href: `/${locale}/dashboard/admin/providers`, label: d.dash.providers, icon: "providers" },
      { href: `/${locale}/dashboard/admin/kyc`, label: d.dash.kyc, icon: "kyc" },
      { href: `/${locale}/dashboard/admin/geography`, label: `${d.dash.countries} & ${d.dash.cities}`, icon: "countries" },
      { href: `/${locale}/dashboard/admin/catalog`, label: `${d.dash.categories} · ${d.dash.currency} · ${d.dash.commission}`, icon: "categories" },
      { href: `/${locale}/dashboard/admin/finance`, label: d.dash.finance, icon: "finance" },
      { href: `/${locale}/dashboard/admin/reviews`, label: d.dash.reviews, icon: "reviews" },
      { href: `/${locale}/dashboard/admin/audit`, label: d.dash.audit, icon: "bookings" },
    ],
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar locale={locale} role={role as never} items={navs[role] ?? navs.patient!} activePath="" />
      <div className="min-w-0 flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
