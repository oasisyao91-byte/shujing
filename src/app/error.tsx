'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container py-16">
      <div className="max-w-xl mx-auto rounded-2xl border border-brand-parchment bg-white p-10 text-center space-y-4">
        <div className="text-5xl">🪶📎</div>
        <div className="text-2xl font-bold text-brand-navy">页面翻阅遇到了阻碍</div>
        <div className="text-slate-800 leading-relaxed">
          我们暂时没能把这一页顺利翻开。你可以稍后重试，或回到首页继续探索。
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-blue text-white font-medium"
          >
            重试加载
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-parchment text-brand-navy font-medium"
          >
            返回首页
          </a>
        </div>
        <div className="text-xs text-brand-muted break-all">
          {error?.digest || error?.message}
        </div>
      </div>
    </div>
  );
}

