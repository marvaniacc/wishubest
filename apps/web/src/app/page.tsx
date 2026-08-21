export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
        International medical tourism
      </span>
      <h1 className="mt-5 text-4xl font-bold tracking-tight text-brand-700 sm:text-5xl">
        WishUBest
      </h1>
      <p className="mt-4 max-w-xl text-base text-slate-600">
        World-class care, without the guesswork. Compare vetted providers, book
        online, and pay securely — all in one place.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a className="btn-primary" href="/api/health">
          Check API status
        </a>
        <a className="btn-outline" href="/api/catalog/countries">
          Browse catalog
        </a>
      </div>
      <p className="mt-10 text-xs text-slate-400">
        Frontend (M8) is under construction. The API is live.
      </p>
    </main>
  );
}
