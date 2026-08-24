import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import { PageTitle, EmptyState } from "@/components/ui";
import SlotManager from "@/components/SlotManager";

export const dynamic = "force-dynamic";

export default async function ProviderSlots({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const d = getDictionary(locale);
  const [slotsRes, svcRes] = await Promise.all([
    apiFetch<{ items: { id: string; serviceId: string; startsAt: string; endsAt: string; status: string }[] }>(
      "/provider/slots",
      { revalidate: false },
    ),
    apiFetch<{ items: { id: string; title: string; serviceMode: string }[] }>("/provider/services", {
      revalidate: false,
    }),
  ]);
  if (!slotsRes.ok) return <EmptyState>{d.common.error}</EmptyState>;
  const onlineServices = (svcRes.data?.items ?? []).filter((s) => s.serviceMode !== "in_person");

  return (
    <div>
      <PageTitle sub={d.booking.pickSlot}>{d.dash.slots}</PageTitle>
      <SlotManager
        locale={locale}
        slots={slotsRes.data.items}
        services={onlineServices.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  );
}
