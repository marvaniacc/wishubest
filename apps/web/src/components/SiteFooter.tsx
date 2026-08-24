import Link from "next/link";
import { getDictionary, type Locale } from "@/i18n/config";

export function SiteFooter({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-primary">WishUBest</p>
          <p className="mt-2 max-w-xs text-ink-soft">{d.tagline}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="form-label">{d.nav.providers}</p>
          <Link href={`/${locale}/providers?type=doctor`} className="text-ink-soft hover:text-primary">
            {d.types.doctor}
          </Link>
          <Link href={`/${locale}/providers?type=hospital`} className="text-ink-soft hover:text-primary">
            {d.types.hospital}
          </Link>
          <Link href={`/${locale}/providers?type=hotel`} className="text-ink-soft hover:text-primary">
            {d.types.hotel}
          </Link>
          <Link href={`/${locale}/providers?type=translator`} className="text-ink-soft hover:text-primary">
            {d.types.translator}
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="form-label">{d.brand}</p>
          <Link href={`/${locale}/about`} className="text-ink-soft hover:text-primary">
            {d.nav.about}
          </Link>
          <Link href={`/${locale}/terms`} className="text-ink-soft hover:text-primary">
            {d.nav.terms}
          </Link>
          <Link href={`/${locale}/contact`} className="text-ink-soft hover:text-primary">
            {d.nav.contact}
          </Link>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} WishUBest
      </div>
    </footer>
  );
}
