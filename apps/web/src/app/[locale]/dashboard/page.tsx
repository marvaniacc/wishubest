import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function DashboardHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  void getDictionary;
  const jar = await cookies();
  if (!jar.get("wub_session")?.value) redirect(`/${locale}/login`);
  const me = await apiFetch<{ user?: { role: string; displayName: string | null } }>("/auth/me", {
    revalidate: false,
  });
  const role = me.data?.user?.role ?? "patient";
  const dest: Record<string, string> = {
    patient: `/${locale}/dashboard/bookings`,
    provider: `/${locale}/dashboard/bookings`,
    admin: `/${locale}/dashboard/admin/providers`,
  };
  redirect(dest[role] ?? dest.patient!);
}
