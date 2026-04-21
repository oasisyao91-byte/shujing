'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

const topics = [
  '人工智能',
  '城市与建筑',
  '女性叙事',
  '日本文化',
  '商业思维',
  '战争与历史',
  '心理与自我',
  '自然与生态',
  '东方哲学',
  '科幻与未来',
  '设计与美学',
  '中国现代史',
] as const;

type TopicBook = any & { reason: string };

function Skeleton({ topic }: { topic: string }) {
  return (
    <div className="space-y-3">
      <div className="italic text-sm" style={{ color: 'var(--color-ink-faint)' }}>
        正在梳理{topic}话题的书单...
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[160px] rounded-2xl bg-brand-parchment/70 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function TopicTab({ onOpenChat }: { onOpenChat: (prefill: string) => void }) {
  const [topic, setTopic] = useState<(typeof topics)[number]>('人工智能');
  const [intro, setIntro] = useState('');
  const [books, setBooks] = useState<TopicBook[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setIntro('');
    setBooks([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/recommend/by-topic?topic=${encodeURIComponent(topic)}`, { cache: 'no-store' });
      const data = await res.json();
      setIntro(String(data?.intro || ''));
      setBooks(Array.isArray(data?.books) ? data.books : []);
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const safeIntro = useMemo(() => {
    const t = String(intro || '').replace(/\s+/g, ' ').trim();
    return t || `读这个话题，是为了把“知道”变成“看见”。— 书境 · 话题导读`;
  }, [intro]);

  if (loading) {
    return <Skeleton topic={topic} />;
  }

  return (
    <div className="space-y-4">
      <div ref={scrollerRef} className="flex gap-2 overflow-x-auto hide-scrollbar">
        {topics.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTopic(t)}
            className={
              topic === t
                ? 'h-10 px-3 rounded-2xl bg-brand-blue text-white font-medium whitespace-nowrap'
                : 'h-10 px-3 rounded-2xl bg-brand-parchment text-brand-navy font-medium whitespace-nowrap hover:bg-brand-parchment/70'
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4 border border-brand-parchment" style={{ backgroundColor: 'rgba(245,240,232,0.65)' }}>
        <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
          <div className="text-slate-800 font-songti leading-relaxed">
            {safeIntro}
          </div>
          <div className="mt-2 text-xs text-brand-muted">— 书境 · 话题导读</div>
        </div>
      </div>

      <div className="space-y-2">
        {books.slice(0, 3).map((b: TopicBook) => (
          <a
            key={b.douban_id || b.id}
            href={`/book/${b.douban_id || b.id}`}
            className="flex items-start gap-3 rounded-2xl border border-brand-parchment bg-white p-3 hover:bg-brand-parchment/30 transition-colors"
          >
            <div className="relative w-[36px] h-[48px] rounded overflow-hidden bg-brand-parchment/60 flex-none">
              {b.cover_url ? (
                <Image
                  src={`/api/images/proxy?url=${encodeURIComponent(b.cover_url)}`}
                  alt={b.title}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-slate-800 font-semibold line-clamp-1 font-songti">{b.title}</div>
              <div className="text-xs text-brand-muted mt-0.5 line-clamp-1">{b.author}</div>
              <div className="text-sm text-slate-800 mt-1 line-clamp-2">
                {b.reason}
              </div>
            </div>
            <div className="text-xs text-brand-muted flex-none">
              {b.rating ? Number(b.rating).toFixed(1) : '—'}
            </div>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onOpenChat(`我对【${topic}】感兴趣，帮我推荐更多相关书籍。`)}
        className="h-10 px-4 rounded-xl border border-dashed border-brand-blue/40 text-brand-blue text-sm font-medium hover:bg-brand-blue/5"
      >
        展开话题 · 继续探索 →
      </button>
    </div>
  );
}
