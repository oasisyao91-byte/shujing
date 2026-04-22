'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';
import type { Book } from '@/types/database';
import Image from 'next/image';
import { HeroBookshelfMosaic } from '@/components/home/HeroBookshelfMosaic';

export function HeroSection({
  isLoggedIn,
  personaName,
  personaDesc,
  personaType,
}: {
  isLoggedIn: boolean;
  personaName?: string | null;
  personaDesc?: string | null;
  personaType?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref, 0);

  const [drawnBook, setDrawnBook] = useState<Book | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (personaName ? personaName : ''), [personaName]);

  const fetchRandomBook = async () => {
    const res = await fetch('/api/books/random', { cache: 'no-store' });
    const data = await res.json();
    return (data?.book || null) as Book | null;
  };

  const fetchReasonStream = async (b: Book) => {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `bookmind_random_reason_${b.douban_id || b.id}_${today}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) return cached;

    const id = b.douban_id || b.id;
    const res = await fetch(`/api/books/random-reason?bookId=${encodeURIComponent(id)}`);
    if (!res.ok) return '';
    const reader = res.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      setReason(text);
    }
    const finalText = text.replace(/\s+/g, ' ').trim();
    window.localStorage.setItem(cacheKey, finalText);
    return finalText;
  };

  const draw = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setReason('');
    try {
      const next = await fetchRandomBook();
      setDrawnBook(next);
      if (next) {
        await fetchReasonStream(next);
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return (
    <section
      ref={ref}
      className="scroll-reveal min-h-[320px] md:min-h-[420px] rounded-3xl overflow-hidden"
      style={{
        backgroundColor: '#F5F0E8',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(30,58,95,0.04) 0, rgba(30,58,95,0.04) 1px, transparent 1px, transparent 18px)',
      }}
    >
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 items-stretch">
          <div className="flex flex-col h-full">
            <div className="space-y-6">
              <div className="space-y-4">
                <div
                  className="leading-none text-brand-navy font-bold"
                  style={{
                    fontFamily: 'var(--font-songti)',
                    fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                    color: '#1E3A5F',
                    fontWeight: 700,
                  }}
                >
                  书境
                </div>
                <div
                  className="text-[1.125rem]"
                  style={{ color: '#5A7A9A', letterSpacing: '0.05em' }}
                >
                  在适合你的时间，遇见适合你的书
                </div>
              </div>

              {isLoggedIn && personaName ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={draw}
                    disabled={loading}
                    className="h-10 px-4 rounded-2xl text-sm font-semibold border transition-colors disabled:opacity-60"
                    style={{
                      borderColor: '#1E3A5F',
                      color: '#1E3A5F',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E3A5F';
                      (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = '#1E3A5F';
                    }}
                  >
                    抽一本好书
                  </button>

                  {drawnBook && (
                    <a
                      href={`/book/${drawnBook.douban_id || drawnBook.id}`}
                      className="block rounded-2xl border border-brand-parchment bg-white/70 overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="relative w-[72px] h-[100px] rounded-lg overflow-hidden bg-brand-parchment/60 flex-none">
                          {drawnBook.cover_url ? (
                            <Image
                              src={`/api/images/proxy?url=${encodeURIComponent(drawnBook.cover_url)}`}
                              alt={drawnBook.title}
                              fill
                              sizes="72px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-800 font-semibold line-clamp-2 font-songti">{drawnBook.title}</div>
                          <div className="text-sm text-brand-muted mt-1 line-clamp-1">{drawnBook.author}</div>
                          <div className="mt-2 text-sm text-slate-800">
                            <span className="text-brand-muted">今日宜读：</span>
                            {loading ? '正在翻书中…' : (reason || '这本书正在等你。')}
                          </div>
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm" style={{ color: '#5A7A9A' }}>
                    测试你的阅读性格，获取专属推荐
                  </span>
                  <a
                    href="/login?next=/?test=1"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-navy transition-colors"
                  >
                    去测试
                  </a>
                </div>
              )}
            </div>

            {isLoggedIn && personaName ? (
              <div className="mt-auto">
                <div className="rounded-2xl border border-brand-parchment bg-white/70 px-5 py-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: '#5A7A9A' }}>
                      你是
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: '#1E3A5F' }}
                    >
                      {title}
                    </span>
                  </div>
                  {personaDesc ? (
                    <div className="leading-relaxed text-[15px] text-slate-800 font-songti whitespace-pre-wrap">
                      {personaDesc}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:pl-4 flex flex-col h-full">
            <div className="mt-auto">
              <HeroBookshelfMosaic isLoggedIn={isLoggedIn} personaType={personaType} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
