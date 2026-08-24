import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "./i18n/config";

/**
 * Origin reconstruction behind proxies (Cloudflare -> Caddy -> Next):
 * prefer forwarded headers; never trust nextUrl.host, which reflects the
 * internal hop (e.g. localhost:3000) rather than the public site.
 */
function siteOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = (fwdHost ?? req.headers.get("host") ?? "").split(",")[0]!.trim();
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]!.trim() ||
    new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host || "wishubest.com"}`;
}

function pickLocale(req: NextRequest): string {
  const cookie = req.cookies.get("wub_locale")?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;
  const al = req.headers.get("accept-language") ?? "";
  if (/^ar\b|[,\s]ar\b/i.test(al)) return "ar";
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (!hasLocale) {
    const locale = pickLocale(req);
    const target = `${siteOrigin(req)}/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
