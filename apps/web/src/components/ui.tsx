import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Buttons ---------- */
type BtnVariant = "primary" | "accent" | "ghost" | "danger";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function buttonClass(variant: BtnVariant = "primary"): string {
  switch (variant) {
    case "accent":
      return `${btnBase} bg-accent text-white hover:bg-accent-dark`;
    case "ghost":
      return `${btnBase} border border-line bg-transparent text-ink hover:bg-primary-tint/40`;
    case "danger":
      return `${btnBase} border border-danger text-danger hover:bg-danger-tint`;
    default:
      return `${btnBase} bg-primary text-white hover:bg-primary-dark`;
  }
}

export function BtnLink({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: BtnVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant)} ${className}`}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button {...rest} className={`${buttonClass(variant)} ${className}`}>
      {children}
    </button>
  );
}

/* ---------- Status badge ---------- */
const STATUS_COLOR: Record<string, { dot: string; tint: string }> = {
  // booking
  DRAFT: { dot: "bg-ink-soft", tint: "bg-surface" },
  REQUESTED: { dot: "bg-info", tint: "bg-info-tint" },
  AWAITING_PAYMENT: { dot: "bg-info", tint: "bg-info-tint" },
  CONFIRMED: { dot: "bg-success", tint: "bg-success-tint" },
  COMPLETED: { dot: "bg-success", tint: "bg-success-tint" },
  CANCELLED: { dot: "bg-danger", tint: "bg-danger-tint" },
  NO_SHOW: { dot: "bg-warning", tint: "bg-warning-tint" },
  EXPIRED: { dot: "bg-ink-soft", tint: "bg-surface" },
  // invoice / payment
  ISSUED: { dot: "bg-info", tint: "bg-info-tint" },
  PENDING_PAYMENT: { dot: "bg-info", tint: "bg-info-tint" },
  PAID: { dot: "bg-success", tint: "bg-success-tint" },
  VOID: { dot: "bg-ink-soft", tint: "bg-surface" },
  REFUNDED: { dot: "bg-warning", tint: "bg-warning-tint" },
  SUCCEEDED: { dot: "bg-success", tint: "bg-success-tint" },
  FAILED: { dot: "bg-danger", tint: "bg-danger-tint" },
  PROCESSING: { dot: "bg-info", tint: "bg-info-tint" },
  CREATED: { dot: "bg-ink-soft", tint: "bg-surface" },
  CANCELED: { dot: "bg-ink-soft", tint: "bg-surface" },
  REQUIRES_ACTION: { dot: "bg-warning", tint: "bg-warning-tint" },
  // kyc / review / provider
  pending: { dot: "bg-warning", tint: "bg-warning-tint" },
  approved: { dot: "bg-success", tint: "bg-success-tint" },
  rejected: { dot: "bg-danger", tint: "bg-danger-tint" },
  submitted: { dot: "bg-info", tint: "bg-info-tint" },
  not_started: { dot: "bg-ink-soft", tint: "bg-surface" },
  active: { dot: "bg-success", tint: "bg-success-tint" },
  inactive: { dot: "bg-ink-soft", tint: "bg-surface" },
  suspended: { dot: "bg-danger", tint: "bg-danger-tint" },
  draft: { dot: "bg-ink-soft", tint: "bg-surface" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const c = STATUS_COLOR[status] ?? { dot: "bg-ink-soft", tint: "bg-surface" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-ink ${c.tint}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden />
      {label ?? status}
    </span>
  );
}

/* ---------- Journey rule (signature element) ---------- */
export function JourneyRule({
  steps,
  current = -1,
  compact = false,
}: {
  steps: string[];
  current?: number;
  compact?: boolean;
}) {
  return (
    <ol className={`flex w-full items-center ${compact ? "" : "my-6"}`} aria-label="progress">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`h-2.5 w-2.5 rounded-full border-2 ${
                i <= current ? "border-accent bg-accent" : "border-line bg-surface-2"
              }`}
            />
            {!compact && (
              <span
                className={`whitespace-nowrap text-[11px] font-medium ${
                  i <= current ? "text-ink" : "text-ink-soft"
                }`}
              >
                {s}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              aria-hidden
              className={`mx-2 h-px flex-1 border-t-2 border-dashed ${
                i < current ? "border-accent/70" : "border-line"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Minimal provider card (photo, name, specialty ONLY) ---------- */
export function ProviderCard({
  slug,
  displayName,
  providerType,
  photoUrl,
  typeName,
}: {
  slug: string;
  displayName: string;
  providerType: string;
  photoUrl?: string | null;
  typeName: string;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  return (
    <Link
      href={`/providers/${slug}`}
      className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-pop"
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="h-16 w-16 rounded-full border border-line object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint font-display text-xl text-primary">
          {initial}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-ink group-hover:text-primary">
          {displayName}
        </p>
        <p className="text-sm text-ink-soft">{typeName}</p>
      </div>
    </Link>
  );
}

/* ---------- Section helpers ---------- */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-2xl font-semibold md:text-[28px]">{children}</h1>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card p-8 text-center text-sm text-ink-soft">{children}</div>
  );
}
