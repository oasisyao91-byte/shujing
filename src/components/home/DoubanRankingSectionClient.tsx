'use client';

import { useRef } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { BookCard } from '@/components/books/BookCard';
import type { Book } from '@/types/database';

export function DoubanRankingSectionClient({
  books,
  lastSync,
  showDevLink,
}: {
  books: Book[];
  lastSync: string;
  showDevLink: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref as any, 0);

  if (!books || books.length === 0) {
    return (
      <section ref={ref} className="scroll-reveal space-y-4 h-full">
        <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
          <h3 className="text-xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
            豆瓣榜单
          </h3>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm space-y-4 text-center border border-brand-parchment h-full flex flex-col justify-center">
          <p className="text-brand-muted mb-2">数据同步中，请稍后刷新</p>
          {showDevLink && (
            <a href="/dev/sync" className="text-brand-blue text-sm underline-offset-2 hover:underline">
              前往开发工具页手动触发同步
            </a>
          )}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="scroll-reveal space-y-4 h-full">
      <div className="flex items-end justify-between gap-4">
        <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
          <h3 className="text-xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
            豆瓣高分图书
          </h3>
        </div>
        <div className="text-xs text-brand-muted text-right">
          <div>数据来源：豆瓣图书 · 每日更新</div>
          <div>{lastSync}</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2 border border-brand-parchment h-full flex flex-col">
        <div className="space-y-2">
          {books.map((book: Book, i: number) => (
            <BookCard key={book.id} book={book} variant="ranking" rank={i + 1} />
          ))}
        </div>
        <div className="pt-2 text-center border-t mt-auto border-brand-parchment">
          <a
            href="/rankings"
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-[#3A7AB5] hover:underline underline-offset-2"
          >
            查看更多
          </a>
        </div>
      </div>
    </section>
  );
}
