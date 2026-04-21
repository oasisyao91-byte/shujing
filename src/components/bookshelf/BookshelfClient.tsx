'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useMemo, useState } from 'react';
import { BookCard } from '@/components/books/BookCard';

type Entry = {
  status: 'want_read' | 'reading' | 'finished';
  note: string;
  updated_at: string;
  book: any;
};

export function BookshelfClient({
  entries,
  title,
}: {
  entries: Entry[];
  title: string;
}) {
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    if (tab === 'all') return entries;
    return entries.filter(e => e.status === tab);
  }, [entries, tab]);

  return (
    <div className="container py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-brand-navy">{title}</h1>
        <div className="text-brand-muted">把想读、在读、已读都妥善安放</div>
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="inline-flex rounded-2xl bg-brand-parchment p-1">
          <Tabs.Trigger
            value="all"
            className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors"
          >
            全部
          </Tabs.Trigger>
          <Tabs.Trigger
            value="want_read"
            className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors"
          >
            想读
          </Tabs.Trigger>
          <Tabs.Trigger
            value="reading"
            className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors"
          >
            在读
          </Tabs.Trigger>
          <Tabs.Trigger
            value="finished"
            className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors"
          >
            已读
          </Tabs.Trigger>
        </Tabs.List>

        <div className="mt-6">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-brand-parchment bg-white p-10 text-center space-y-4">
              <div className="text-5xl">📚🕯️</div>
              <div className="text-brand-navy text-lg font-semibold">书架还空着</div>
              <div className="text-brand-muted">
                去首页找找看有没有失散已久的好书吧。
              </div>
              <a
                href="/"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-brand-blue text-white font-medium"
              >
                去发现
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(e => (
                <div key={`${e.book?.douban_id || e.book?.id}-${e.updated_at}`} className="space-y-2">
                  <BookCard book={e.book} variant="default" />
                  {e.status === 'finished' && e.note ? (
                    <div className="rounded-2xl bg-brand-parchment/60 border border-brand-parchment p-3 text-sm text-slate-800">
                      <div className="text-xs text-brand-muted mb-1">我的笔记</div>
                      <div className="whitespace-pre-wrap leading-relaxed">{e.note}</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
}

