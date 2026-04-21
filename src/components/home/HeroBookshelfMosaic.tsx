'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookVolume } from '@/components/books/BookVolume';
import type { Book } from '@/types/database';

type RecommendBook = Book & { llm_reason?: string };

export function HeroBookshelfMosaic({
  isLoggedIn,
  personaType,
}: {
  isLoggedIn: boolean;
  personaType?: string | null;
}) {
  const [books, setBooks] = useState<RecommendBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [needPersona, setNeedPersona] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popoverLeft, setPopoverLeft] = useState<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setBooks([]);
      setNeedPersona(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/recommend/personal', { cache: 'no-store' });
        if (res.status === 400) {
          setNeedPersona(true);
          setBooks([]);
          return;
        }
        if (!res.ok) {
          setBooks([]);
          return;
        }
        const data = await res.json();
        setNeedPersona(false);
        setBooks((data?.recommendations || []) as RecommendBook[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn, personaType]);

  const subtitle = useMemo(() => {
    if (!isLoggedIn) return '登录后解锁你的专属书架';
    if (needPersona) return '完成阅读性格测试，解锁你的专属书架';
    return '你的性格解锁了这些书，它们一直在等你';
  }, [isLoggedIn, needPersona]);

  const slice = books.slice(0, 7);
  const row1 = slice.slice(0, 3);
  const row2 = slice.slice(3, 7);

  const open = (b: RecommendBook) => {
    const id = String(b.douban_id || b.id);
    window.location.href = `/book/${id}`;
  };

  const closePopover = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setHoveredId(null), 220);
  };

  const openPopover = (b: RecommendBook, anchor: HTMLElement) => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    const id = String(b.douban_id || b.id);
    setHoveredId(id);
    if (!containerRef.current) return;
    const r = anchor.getBoundingClientRect();
    const cr = containerRef.current.getBoundingClientRect();
    const rawLeft = r.left - cr.left + r.width / 2;
    const clampedLeft = Math.min(Math.max(150, rawLeft), cr.width - 150);
    setPopoverLeft(clampedLeft);
  };

  const hoveredBook = useMemo(() => {
    if (!hoveredId) return null;
    return books.find(b => String(b.douban_id || b.id) === hoveredId) || null;
  }, [books, hoveredId]);

  return (
    <div ref={containerRef} className="space-y-3 relative" onMouseLeave={closePopover}>
      <div className="space-y-1 text-right">
        <div className="text-xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
          只为你开架
        </div>
        <div className="text-sm font-songti" style={{ color: 'var(--color-ink-muted)' }}>
          {subtitle}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3 justify-end">
          {(loading ? Array.from({ length: 3 }) : row1).map((b: any, idx: number) => (
            <div
              key={b?.douban_id || idx}
              className="flex-none"
              onMouseEnter={(e) => {
                if (loading) return;
                openPopover(b, e.currentTarget);
              }}
            >
              {loading ? (
                <div className="rounded-xl" style={{ width: 132, height: 178, background: 'rgba(255,255,255,0.55)' }} />
              ) : (
                <BookVolume
                  book={b}
                  active={hoveredId === String(b.douban_id || b.id)}
                  onOpen={() => open(b)}
                  width={132}
                  height={178}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          {(loading ? Array.from({ length: 4 }) : row2).map((b: any, idx: number) => (
            <div
              key={b?.douban_id || idx}
              className="flex-none"
              onMouseEnter={(e) => {
                if (loading) return;
                openPopover(b, e.currentTarget);
              }}
            >
              {loading ? (
                <div className="rounded-xl" style={{ width: 112, height: 160, background: 'rgba(255,255,255,0.45)' }} />
              ) : (
                <BookVolume
                  book={b}
                  active={hoveredId === String(b.douban_id || b.id)}
                  onOpen={() => open(b)}
                  width={112}
                  height={160}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {hoveredBook && (
        <div
          className="absolute"
          style={{ left: popoverLeft ?? 150, top: 96, transform: 'translateX(-50%)', zIndex: 30 }}
          onMouseEnter={() => {
            if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={closePopover}
        >
          <div
            className="rounded-2xl border border-brand-parchment bg-white shadow-sm p-4 w-[300px]"
          >
            <div className="text-slate-800 font-semibold font-songti line-clamp-2">{hoveredBook.title}</div>
            <div className="text-sm text-brand-muted mt-1 line-clamp-1">{hoveredBook.author}</div>
            <div className="mt-3 text-sm text-slate-800 leading-relaxed">
              <span className="text-brand-muted">一句话：</span>
              {(hoveredBook.llm_reason || '它会在你需要的那一刻，刚好说中你。').replace(/\s+/g, ' ').trim()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
