'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookCard } from '@/components/books/BookCard';
import { saveBookshelfEntry } from '@/app/actions/bookshelf';

const moods = [
  { id: 'heal', label: '治愈放松' },
  { id: 'think', label: '深度思考' },
  { id: 'story', label: '沉浸故事' },
  { id: 'grow', label: '成长突破' },
  { id: 'wander', label: '漫游世界' },
] as const;

type ApiBook = any & { reason: string };

function SkeletonGrid({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      <div className="italic text-sm" style={{ color: 'var(--color-ink-faint)' }}>{text}</div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[160px] rounded-2xl bg-brand-parchment/70 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function MoodTab({ onOpenChat }: { onOpenChat: (prefill: string) => void }) {
  const [mood, setMood] = useState<(typeof moods)[number]['id']>('heal');
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const moodLabel = useMemo(() => moods.find(m => m.id === mood)?.label || '治愈放松', [mood]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1500);
  };

  const load = useCallback(async () => {
    setBooks([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/recommend/by-mood?mood=${encodeURIComponent(mood)}&limit=4`, { cache: 'no-store' });
      const data = await res.json();
      setBooks(Array.isArray(data?.books) ? data.books : []);
    } finally {
      setLoading(false);
    }
  }, [mood]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (loading) {
    return <SkeletonGrid text="正在感受你的心情，翻找合适的书..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {moods.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMood(m.id)}
            className={
              mood === m.id
                ? 'h-10 px-3 rounded-2xl bg-brand-blue text-white font-medium whitespace-nowrap'
                : 'h-10 px-3 rounded-2xl bg-brand-parchment text-brand-navy font-medium whitespace-nowrap hover:bg-brand-parchment/70'
            }
          >
            <span className="text-sm">{m.label}</span>
          </button>
        ))}
      </div>

      {toast && <div className="text-xs text-brand-muted">{toast}</div>}

      <div className="grid grid-cols-2 gap-3">
        {books.slice(0, 4).map((b: ApiBook) => (
          <div key={b.douban_id || b.id} className="space-y-2">
            <BookCard book={b} variant="default" reason={b.reason} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const id = b.douban_id || b.id;
                  if (!id) return;
                  try {
                    await saveBookshelfEntry({ doubanId: String(id), status: 'want_read', note: '' });
                    showToast('这本书已经在等你了 📌');
                  } catch {
                    window.location.href = '/login';
                  }
                }}
                className="flex-1 h-9 rounded-xl border border-brand-parchment bg-white text-brand-navy text-sm font-medium hover:bg-brand-parchment/60"
              >
                想读
              </button>
              <a
                href={`/book/${b.douban_id || b.id}`}
                className="flex-1 h-9 rounded-xl border text-sm font-bold inline-flex items-center justify-center transition-colors"
                style={{ borderColor: '#1E3A5F', color: '#1E3A5F', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1E3A5F';
                  (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = '#1E3A5F';
                }}
              >
                详情
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => load()}
          className="h-10 px-4 rounded-xl border border-dashed border-brand-blue/40 text-brand-blue text-sm font-medium hover:bg-brand-blue/5"
        >
          换一批 · 再看看
        </button>
        <button
          type="button"
          onClick={() => onOpenChat(`我现在是「${moodLabel}」的心情，想再多找几本书。`)}
          className="text-[13px] text-[#3A7AB5] hover:underline underline-offset-2"
        >
          想更对味？去对话里说说 →
        </button>
      </div>
    </div>
  );
}
