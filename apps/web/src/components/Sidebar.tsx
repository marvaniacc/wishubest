import Link from "next/link";
import { getDictionary, type Locale } from "@/i18n/config";

const icons = {
  overview: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10",
  bookings: "M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  invoices: "M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
  reviews: "M11.05 3.7c.3-.92 1.6-.92 1.9 0l1.9 5.86h6.16c.97 0 1.37 1.24.59 1.81l-4.99 3.62 1.91 5.87c.3.92-.75 1.69-1.54 1.12L12 18.15l-4.98 3.62c-.79.57-1.84-.2-1.54-1.12l1.9-5.87-4.98-3.62c-.8-.57-.39-1.81.58-1.81h6.16l1.91-5.86z",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zm-8 6a6 6 0 00-6 6v2h20v-2a6 6 0 00-6-6H8z",
  kyc: "M9 12l2 2 4-4m5.6 2A9 9 0 1112 3a9 9 0 019 9z",
  services: "M19.4 13a7.6 7.6 0 000-2l2.1-1.6a.5.5 0 00.1-.7l-2-3.4a.5.5 0 00-.6-.2l-2.5 1a7.7 7.7 0 00-1.7-1L14.4 2.4a.5.5 0 00-.5-.4h-4a.5.5 0 00-.5.4L9 5.1a7.7 7.7 0 00-1.7 1l-2.5-1a.5.5 0 00-.6.2l-2 3.4a.5.5 0 00.1.7L4.4 11a7.6 7.6 0 000 2l-2.1 1.6a.5.5 0 00-.1.7l2 3.4c.1.2.4.3.6.2l2.5-1a7.7 7.7 0 001.7 1l.4 2.7c0 .2.2.4.5.4h4c.2 0 .4-.2.5-.4l.4-2.7a7.7 7.7 0 001.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.4a.5.5 0 00-.1-.7L19.4 13z",
  slots: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  countries: "M3.05 13a9 9 0 0017.9 0M3.05 11a9 9 0 0117.9 0M12 3a15 15 0 010 18M12 3a15 15 0 000 18",
  cities: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m8-9h.01M12 16h.01M9 12h.01M9 16h.01M15 12h.01M15 16h.01",
  categories: "M4 6h16M4 10h16M4 14h16M4 18h16",
  currency: "M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.11 0 2.08.4 2.6 1M12 8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z",
  commission: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  providers: "M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.29-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.29.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  finance: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
};

export type DashRole = "patient" | "provider" | "admin";

export interface NavEntry {
  href: string;
  label: string;
  icon: keyof typeof icons;
}

export function Sidebar({
  locale,
  role,
  items,
  activePath,
}: {
  locale: Locale;
  role: DashRole;
  items: NavEntry[];
  activePath: string;
}) {
  void locale;
  void role;
  return (
    <aside className="sidebar-shell relative z-40 h-[calc(100vh-4rem)] w-[64px] shrink-0">
      <nav
        className="sidebar-flyout fixed top-16 bottom-0 w-[64px] bg-primary-dark text-white shadow-pop"
        style={{ insetInlineStart: 0 }}
        aria-label="Dashboard"
      >
        <ul className="flex flex-col gap-1 p-2 pt-4">
          {items.map((it) => {
            const active = activePath === it.href || (it.href !== "" && activePath.startsWith(it.href));
            return (
              <li
                key={it.href}
                className={`nav-item rounded-md border-2 border-transparent hover:bg-primary/60 ${active ? "active" : ""}`}
              >
                <Link
                  href={it.href || "#"}
                  className="flex h-10 items-center gap-3 overflow-hidden px-3 text-sm font-medium text-white/90"
                  title={it.label}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5 shrink-0"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={icons[it.icon]} />
                  </svg>
                  <span className="lbl whitespace-nowrap">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
