'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookCard } from '@/components/books/BookCard';
import type { Book } from '@/types/database';

export function PreciseSearch({
  onSwitchToChat,
}: {
  onSwitchToChat: () => void;
}) {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const debounceRef = useRef<number | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setError(null);

    if (!trimmed) {
      setBooks([]);
      setReasons({});
      setLoading(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(trimmed)}&limit=12`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || '搜索失败');
        }
        const list: Book[] = data?.books || [];
        setBooks(list);
        setReasons({});
      } catch (e: any) {
        setError(e.message || '搜索失败');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [trimmed]);

  useEffect(() => {
    if (books.length === 0) return;

    const top = books.slice(0, 3);
    let aborted = false;

    (async () => {
      for (const b of top) {
        if (aborted) return;
        const id = b.douban_id;
        if (!id || reasons[id]) continue;
        try {
          const res = await fetch(`/api/books/persona-reason?doubanId=${encodeURIComponent(id)}`);
          if (!res.ok) continue;
          const reader = res.body?.getReader();
          if (!reader) continue;
          const decoder = new TextDecoder();
          let text = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            setReasons(prev => ({ ...prev, [id]: text }));
          }
        } catch {
          continue;
        }
      }
    })();

    return () => {
      aborted = true;
    };
  }, [books, reasons]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted">
          ⌕
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入书名、作者或关键词…"
          className="w-full h-12 rounded-2xl border border-brand-parchment bg-white pl-10 pr-4 text-brand-navy placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      {loading && (
        <div className="text-sm text-brand-muted">正在检索…</div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && trimmed && books.length === 0 && !error && (
        <div className="rounded-2xl border border-brand-parchment bg-white p-6 text-center space-y-3">
          <div className="text-brand-muted">没有找到相关书籍</div>
          <button
            onClick={onSwitchToChat}
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-brand-blue text-white font-medium"
          >
            没有找到？让 AI 帮我找找
          </button>
        </div>
      )}

      {books.length > 0 && (
        <div className="space-y-3">
          {books.map((b, idx) => (
            <div key={b.douban_id || b.id} className="space-y-2">
              <BookCard
                book={b as any}
                variant="compact"
                reason={idx < 3 && b.douban_id ? reasons[b.douban_id] : undefined}
                reasonLabel="为你推荐"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
