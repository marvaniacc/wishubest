import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import { LOCALES, DEFAULT_LOCALE, getDictionary, type Locale } from "@/i18n/config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "600", "700"],
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-plex-arabic",
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const SITE = process.env.APP_URL ?? "http://localhost:3000";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const loc = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : DEFAULT_LOCALE;
  const d = getDictionary(loc);
  return {
    metadataBase: new URL(SITE),
    title: {
      default: `${d.brand} — ${d.tagline}`,
      template: `%s · ${d.brand}`,
    },
    description: d.home.heroSub,
    alternates: {
      canonical: `${SITE}/${loc}`,
      languages: { en: `${SITE}/en`, ar: `${SITE}/ar`, "x-default": `${SITE}/en` },
    },
    openGraph: {
      siteName: "WishUBest",
      locale: loc === "ar" ? "ar" : "en",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) notFound();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fraunces.variable} ${jakarta.variable} ${plexArabic.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <SiteHeader locale={locale as Locale} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale as Locale} />
      </body>
    </html>
  );
}
