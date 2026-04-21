'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookCard } from '@/components/books/BookCard';
import { saveBookshelfEntry } from '@/app/actions/bookshelf';

type Seed = { douban_id: string; title: string };
type ApiBook = any & { reason: string; relation_type: string };

function SkeletonGrid() {
  return (
    <div className="space-y-3">
      <div className="italic text-sm" style={{ color: 'var(--color-ink-faint)' }}>读懂你的书单，寻找下一本...</div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[160px] rounded-2xl bg-brand-parchment/70 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function badgeStyle(type: string) {
  if (type === 'same_theme' || type === 'extend') return { bg: 'rgba(34,197,94,0.12)', fg: '#166534', label: '同主题' };
  if (type === 'same_author' || type === 'series') return { bg: 'rgba(59,130,246,0.12)', fg: '#1D4ED8', label: '同作者' };
  if (type === 'similar_style') return { bg: 'rgba(147,51,234,0.12)', fg: '#6B21A8', label: '风格相似' };
  return { bg: 'rgba(147,51,234,0.12)', fg: '#6B21A8', label: '互补视角' };
}

export function SimilarTab({ onOpenChat }: { onOpenChat: (prefill: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [loadingSeeds, setLoadingSeeds] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1500);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    setLoadingSeeds(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('reading_history')
          .select('updated_at, status, books(douban_id,title)')
          .eq('user_id', userId)
          .in('status', ['finished', 'reading'])
          .order('updated_at', { ascending: false })
          .limit(5);

        const list = (data || [])
          .map((r: any) => {
            const b = Array.isArray(r.books) ? r.books[0] : r.books;
            if (!b?.douban_id) return null;
            return { douban_id: String(b.douban_id), title: String(b.title || '') } as Seed;
          })
          .filter((x: Seed | null): x is Seed => x !== null);

        setSeeds(list);
        setSelected(list.slice(0, 2).map(x => x.douban_id));
      } finally {
        setLoadingSeeds(false);
      }
    })();
  }, [supabase, userId]);

  const load = async (ids: string[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/recommend/by-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_book_ids: ids }),
      });
      const data = await res.json();
      setBooks(Array.isArray(data?.books) ? data.books : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    if (selected.length === 0) return;
    load(selected).catch(() => undefined);
  }, [selected, userId]);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-brand-parchment bg-white p-6 text-center space-y-3">
        <div className="text-brand-muted">登录后，书境将根据你的书单为你发现更多</div>
        <a
          href="/login"
          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-brand-blue text-white font-medium"
        >
          去登录
        </a>
      </div>
    );
  }

  if (loadingSeeds) {
    return <SkeletonGrid />;
  }

  if (seeds.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-parchment bg-white p-6 text-center space-y-2">
        <div className="text-brand-muted">你的书单还空着，先去读几本，书境会记住你的口味</div>
        <a href="/" className="text-[13px] text-[#3A7AB5] hover:underline underline-offset-2">
          去首页逛逛 →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm text-brand-muted">基于书单</div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {seeds.map(s => {
            const active = selected.includes(s.douban_id);
            return (
              <button
                key={s.douban_id}
                type="button"
                onClick={() => {
                  setSelected(prev => {
                    const has = prev.includes(s.douban_id);
                    if (has) return prev.filter(x => x !== s.douban_id);
                    if (prev.length >= 3) return prev;
                    return [...prev, s.douban_id];
                  });
                }}
                className={
                  active
                    ? 'h-10 px-3 rounded-2xl bg-brand-blue text-white font-medium whitespace-nowrap'
                    : 'h-10 px-3 rounded-2xl bg-brand-parchment text-brand-navy font-medium whitespace-nowrap hover:bg-brand-parchment/70'
                }
              >
                {s.title.slice(0, 8)}
              </button>
            );
          })}
        </div>
      </div>

      {toast && <div className="text-xs text-brand-muted">{toast}</div>}

      {loading && books.length === 0 ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {books.slice(0, 4).map((b: ApiBook) => {
            const badge = badgeStyle(b.relation_type);
            return (
              <div key={b.douban_id || b.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: badge.bg, color: badge.fg }}>
                    {badge.label}
                  </span>
                </div>
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
                    className="flex-1 h-9 rounded-xl bg-brand-blue text-white text-sm font-medium inline-flex items-center justify-center"
                  >
                    详情
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => load(selected)}
          className="h-10 px-4 rounded-xl border border-dashed border-brand-blue/40 text-brand-blue text-sm font-medium hover:bg-brand-blue/5"
        >
          换一批 · 再看看
        </button>
        <button
          type="button"
          onClick={() => {
            const names = seeds.filter(s => selected.includes(s.douban_id)).map(s => s.title).join('、');
            onOpenChat(`我读过（或在读）${names}，想要更多延伸或互补的书。`);
          }}
          className="text-[13px] text-[#3A7AB5] hover:underline underline-offset-2"
        >
          让 AI 深度分析 →
        </button>
      </div>
    </div>
  );
}
