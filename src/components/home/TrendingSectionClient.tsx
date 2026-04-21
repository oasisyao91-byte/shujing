'use client';

import { useRef } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';
import Image from 'next/image';

export function TrendingSectionClient({
  items,
}: {
  items: Array<{ quote: string; book: any }>;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref as any, 50);

  return (
    <section ref={ref} className="scroll-reveal space-y-4 h-full">
      <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
        <h3 className="text-xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
          今日书页
        </h3>
      </div>
      <div className="p-6 rounded-2xl shadow-sm border border-brand-parchment bg-gradient-to-br from-brand-parchment to-white h-full flex flex-col">
        <div className="flex-1 grid grid-rows-3 gap-3">
          {(items || []).slice(0, 3).map((it, idx) => {
            const b = it.book;
            const href = b?.douban_id || b?.id ? `/book/${b.douban_id || b.id}` : '#';
            const title = b?.title ? String(b.title) : '书境';
            const author = b?.author ? String(b.author) : '';
            const coverSrc = b?.cover_url ? `/api/images/proxy?url=${encodeURIComponent(b.cover_url)}` : null;
            const ratingText = typeof b?.rating === 'number' ? b.rating.toFixed(1) : (b?.rating ? String(b.rating) : '');
            const quote = String(it.quote || '').replace(/\s+/g, ' ').trim().slice(0, 80);

            return (
              <a
                key={String(b?.douban_id || b?.id || idx)}
                href={href}
                className="rounded-2xl border border-brand-parchment bg-white/70 p-4 hover:bg-white transition-colors flex flex-col"
              >
                <blockquote className="text-slate-800 leading-relaxed border-l-4 border-brand-blue/30 pl-4 font-songti line-clamp-3">
                  {quote}
                </blockquote>
                <div className="mt-auto pt-4 flex items-end justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="relative w-[28px] h-[38px] rounded overflow-hidden bg-brand-parchment/60 flex-none">
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={title}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-800 font-songti line-clamp-1">
                        <span className="text-brand-muted">——《</span>
                        <span className="font-semibold">{title}</span>
                        <span className="text-brand-muted">》</span>
                      </div>
                      <div className="text-xs text-brand-muted line-clamp-1">{author}</div>
                    </div>
                  </div>
                  <div className="text-xs text-brand-muted flex-none">
                    {ratingText ? `豆瓣 ${ratingText}` : ''}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="pt-4 text-xs text-brand-muted">书境 · 句子摘抄</div>
      </div>
    </section>
  );
}
