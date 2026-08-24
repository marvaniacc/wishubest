"use client";

export default function LogoutButton({ label, locale }: { label: string; locale: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        void (async () => {
          const csrf = document.cookie.match(/(?:^|; )wub_csrf=([^;]*)/)?.[1];
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : undefined,
          });
          window.location.href = `/${locale}`;
        })();
      }}
      className="rounded-md px-3 py-2 text-ink-soft hover:bg-danger-tint hover:text-danger"
    >
      {label}
    </button>
  );
}
