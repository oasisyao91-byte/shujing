export default function NotFoundPage() {
  return (
    <div className="container py-16">
      <div className="max-w-xl mx-auto rounded-2xl border border-brand-parchment bg-white p-10 text-center space-y-4">
        <div className="text-5xl">📖🌾</div>
        <div className="text-2xl font-bold text-brand-navy">这里是一片知识的荒原</div>
        <div className="text-slate-800 leading-relaxed">
          你要找的书页可能被风吹走了。换一条路，也许会遇见更适合你的那本。
        </div>
        <a
          href="/"
          className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-blue text-white font-medium"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}

