import Link from "next/link";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-server";
import { getDictionary, type Locale } from "@/i18n/config";
import LogoutButton from "./LogoutButton";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const jar = await cookies();
  const hasSession = !!jar.get("wub_session")?.value;
  const me = hasSession ? await apiFetch<{ user?: { role: string } }>("/auth/me") : null;
  const role = me?.data?.user?.role;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface-2/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-primary">WishUBest</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-ink md:flex">
          <Link href={`/${locale}/providers`} className="hover:text-primary">
            {d.nav.providers}
          </Link>
          <Link href={`/${locale}/countries`} className="hover:text-primary">
            {d.nav.countries}
          </Link>
          <Link href={`/${locale}/about`} className="hover:text-primary">
            {d.nav.about}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-primary">
            {d.nav.contact}
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-2 text-sm font-semibold">
          <LocaleSwitch locale={locale} />
          {role ? (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
              >
                {d.nav.dashboard}
              </Link>
              <LogoutButton label={d.nav.logout} locale={locale} />
            </>
          ) : (
            <>
              <Link href={`/${locale}/login`} className="rounded-md px-3 py-2 hover:bg-primary-tint/40">
                {d.nav.login}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-md bg-accent px-4 py-2 text-white hover:bg-accent-dark"
              >
                {d.nav.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function LocaleSwitch({ locale }: { locale: Locale }) {
  const other = locale === "en" ? "ar" : "en";
  return (
    <a
      href={`/${other}`}
      className="rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-primary-tint/40"
      lang={other}
    >
      {other === "ar" ? "العربية" : "English"}
    </a>
  );
}
