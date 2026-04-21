'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { BookVolume } from '@/components/books/BookVolume';
import type { Book } from '@/types/database';

type RecommendBook = Book & { llm_reason?: string };

function stars(rating: number | null) {
  const v = rating ? Math.round(rating / 2) : 0;
  return '★'.repeat(v) + '☆'.repeat(5 - v);
}

export function BookshelfSection({
  isLoggedIn,
  personaName,
  personaType,
}: {
  isLoggedIn: boolean;
  personaName?: string | null;
  personaType?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref, 100);

  const [books, setBooks] = useState<RecommendBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [needPersona, setNeedPersona] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpenId, setMobileOpenId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [popoverLeft, setPopoverLeft] = useState<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }, []);

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

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setShowHint(false);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const title = '只为你开架';
  const subtitle = useMemo(() => {
    if (!isLoggedIn) return '登录后解锁你的专属书架';
    if (needPersona) return '完成阅读性格测试，解锁你的专属书架';
    return '你的性格解锁了这些书，它们一直在等你';
  }, [isLoggedIn, needPersona]);

  const activeBook = useMemo(() => {
    const id = isMobile ? mobileOpenId : activeId;
    if (!id) return null;
    return books.find(b => (b.douban_id || b.id) === id) || null;
  }, [activeId, mobileOpenId, books, isMobile]);

  const openSpine = (b: RecommendBook, anchor?: HTMLElement | null) => {
    const id = (b.douban_id || b.id) as string;
    if (isMobile) {
      setMobileOpenId(prev => (prev === id ? null : id));
      return;
    }
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setActiveId(id);
    if (anchor && containerRef.current) {
      const r = anchor.getBoundingClientRect();
      const cr = containerRef.current.getBoundingClientRect();
      const rawLeft = r.left - cr.left + r.width / 2;
      const clampedLeft = Math.min(Math.max(110, rawLeft), cr.width - 110);
      setPopoverLeft(clampedLeft);
    }
  };

  const closePopover = () => {
    if (isMobile) {
      setMobileOpenId(null);
      return;
    }
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setActiveId(null), 300);
  };

  return (
    <section ref={ref} className="scroll-reveal space-y-4">
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
            <div className="text-xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
              {title}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              {subtitle}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-2xl"
        style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.14)' }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #2C1810 0%, #3D2314 60%, #2C1810 100%)',
            borderTop: '6px solid #5C3A1E',
          }}
        >
          <div
            ref={scrollerRef}
            className="relative flex overflow-x-auto hide-scrollbar"
            style={{
              padding: '18px 14px 22px',
              gap: 10,
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
            onMouseLeave={closePopover}
          >
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-none rounded-xl"
                  style={{
                    width: 132,
                    height: 188,
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                />
              ))
            ) : books.length > 0 ? (
              books.map(b => {
                const id = (b.douban_id || b.id) as string;
                const active = (isMobile ? mobileOpenId : activeId) === id;
                return (
                  <div
                    key={id}
                    onMouseEnter={(e) => openSpine(b, e.currentTarget)}
                    className="relative"
                  >
                    <BookVolume book={b} active={active} onOpen={() => openSpine(b, null)} />
                  </div>
                );
              })
            ) : (
              <div className="w-full p-10 text-center text-white/70">
                书架还没亮起来，去做个性格测试吧。
              </div>
            )}

            {showHint && books.length > 0 && (
              <div className="absolute right-4 bottom-3 text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                ← 滑动探索你的专属书单
              </div>
            )}
          </div>
        </div>

        {activeBook && !isMobile && (
          <div
            className="absolute"
            style={{ bottom: 228, zIndex: 80, left: popoverLeft ?? 110, transform: 'translateX(-50%)' }}
            onMouseEnter={() => {
              if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
            }}
            onMouseLeave={closePopover}
          >
            <div
              className="origin-bottom rounded-xl overflow-hidden border"
              style={{
                width: 220,
                background: '#ffffff',
                borderColor: 'rgba(0,0,0,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                transform: activeId ? 'scaleY(1)' : 'scaleY(0)',
                transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div className="relative w-full h-[130px] bg-brand-parchment/40">
                {activeBook.cover_url ? (
                  <Image
                    src={`/api/images/proxy?url=${encodeURIComponent(activeBook.cover_url)}`}
                    alt={activeBook.title}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-brand-muted">
                    {activeBook.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="text-[15px] font-semibold text-slate-800 line-clamp-2">{activeBook.title}</div>
                <div className="text-[13px] text-[#666] line-clamp-1">{activeBook.author}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">{stars(activeBook.rating ?? null)}</span>
                  <span className="text-slate-800 font-medium">{activeBook.rating ? Number(activeBook.rating).toFixed(1) : '—'}</span>
                </div>
                <div className="h-px bg-brand-parchment my-2" />
                <div className="text-[13px] italic text-[#3A7AB5] line-clamp-3">
                  因为你是 {personaName || '自由探索者'}：{activeBook.llm_reason || '它会在你需要的那一刻，刚好说中你。'}
                </div>
                <a
                  href={`/book/${activeBook.douban_id || activeBook.id}`}
                  className="mt-2 inline-flex items-center justify-center h-9 w-full rounded-lg bg-brand-blue text-white text-sm font-medium"
                >
                  查看详情
                </a>
              </div>
            </div>
          </div>
        )}

        {activeBook && isMobile && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.28)' }}
            onClick={() => setMobileOpenId(null)}
          >
            <div
              className="w-full max-w-[300px] rounded-xl overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.22)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="relative w-full h-[140px] bg-brand-parchment/40">
                {activeBook.cover_url ? (
                  <Image
                    src={`/api/images/proxy?url=${encodeURIComponent(activeBook.cover_url)}`}
                    alt={activeBook.title}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-brand-muted">
                    {activeBook.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="text-[15px] font-semibold text-slate-800">{activeBook.title}</div>
                <div className="text-[13px] text-[#666]">{activeBook.author}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">{stars(activeBook.rating ?? null)}</span>
                  <span className="text-slate-800 font-medium">{activeBook.rating ? Number(activeBook.rating).toFixed(1) : '—'}</span>
                </div>
                <div className="text-[13px] italic text-[#3A7AB5]">
                  因为你是 {personaName || '自由探索者'}：{activeBook.llm_reason || '它会在你需要的那一刻，刚好说中你。'}
                </div>
                <a
                  href={`/book/${activeBook.douban_id || activeBook.id}`}
                  className="inline-flex items-center justify-center h-10 w-full rounded-xl bg-brand-blue text-white text-sm font-medium"
                >
                  查看详情
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
