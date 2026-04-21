export default function BookDetailLoading() {
  return (
    <div className="container py-10">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="w-full aspect-[3/4] rounded-2xl border border-brand-parchment bg-brand-parchment/60 animate-pulse" />
          <div className="rounded-2xl border border-brand-parchment bg-white p-4 space-y-2">
            <div className="h-4 w-20 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-8 w-24 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-3 w-28 bg-brand-parchment/70 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-9 w-3/4 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-brand-parchment/70 rounded animate-pulse" />
          </div>
          <div className="rounded-2xl border border-brand-blue/10 bg-brand-blue/5 p-4 space-y-2">
            <div className="h-3 w-32 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-4 w-full bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-brand-parchment/70 rounded animate-pulse" />
          </div>
          <div className="rounded-2xl border border-brand-parchment bg-white p-5 space-y-3">
            <div className="h-5 w-24 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-4 w-full bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-brand-parchment/70 rounded animate-pulse" />
          </div>
          <div className="rounded-2xl border border-brand-parchment bg-white p-4 space-y-3">
            <div className="h-10 w-64 bg-brand-parchment/70 rounded animate-pulse" />
            <div className="h-24 w-full bg-brand-parchment/70 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

