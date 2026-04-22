'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatRecommend } from '@/components/recommend/ChatRecommend';
import { PreciseSearch } from '@/components/recommend/PreciseSearch';
import { useScrollReveal } from '@/lib/useScrollReveal';

export function RecommendSection({
  isLoggedIn,
  personaName,
  personaType,
  lastBookTitle,
}: {
  isLoggedIn: boolean;
  personaName?: string | null;
  personaType?: string | null;
  lastBookTitle?: string | null;
}) {
  const [tab, setTab] = useState('chat');
  const [expanded, setExpanded] = useState(true);
  const [collapsedSearch, setCollapsedSearch] = useState('');
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref as any, 0);

  const bg = useMemo(
    () => ({
      background: 'linear-gradient(180deg, #2C1810 0%, #3D2314 60%, #2C1810 100%)',
      borderTop: '6px solid #5C3A1E',
    }),
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chat = params.get('chat');
    const prefill = params.get('prefill');
    if (chat === 'true') {
      setTab('chat');
      setExpanded(true);
    }
    if (prefill) {
      setChatPrefill(prefill);
      setTab('chat');
      setExpanded(true);
    }
    if (chat === 'true' || prefill) {
      params.delete('chat');
      params.delete('prefill');
      const next = params.toString();
      const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
      window.history.replaceState({}, '', url);
    }
  }, []);

  return (
    <section ref={ref} className="scroll-reveal rounded-2xl overflow-hidden" style={bg}>
      <Tabs.Root value={tab} onValueChange={setTab}>
        <div className="px-4 pt-4 md:px-6 md:pt-6 flex items-center justify-between gap-4">
          <Tabs.List className="inline-flex rounded-2xl bg-brand-parchment/90 p-1">
            <Tabs.Trigger
              value="chat"
              className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors duration-200"
            >
              对话寻书
            </Tabs.Trigger>
            <Tabs.Trigger
              value="search"
              className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors duration-200"
            >
              精准搜索
            </Tabs.Trigger>
          </Tabs.List>

          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-[13px] text-white/80 hover:text-white transition-colors"
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>

        <div className="p-4 md:p-6">
          <Tabs.Content value="chat" className="outline-none">
            <ChatRecommend
              isLoggedIn={isLoggedIn}
              personaName={personaName}
              personaType={personaType}
              lastBookTitle={lastBookTitle}
              collapsed={!expanded}
              onExpand={() => setExpanded(true)}
              prefillText={chatPrefill}
            />
          </Tabs.Content>
          <Tabs.Content value="search" className="outline-none">
            {expanded ? (
              <PreciseSearch onSwitchToChat={() => setTab('chat')} />
            ) : (
              <div className="rounded-2xl border border-brand-parchment bg-white p-3 md:p-4">
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted">
                    ⌕
                  </div>
                  <input
                    value={collapsedSearch}
                    onChange={e => setCollapsedSearch(e.target.value)}
                    onFocus={() => setExpanded(true)}
                    placeholder="输入书名、作者或关键词…"
                    className="w-full h-12 rounded-2xl border border-brand-parchment bg-white pl-10 pr-4 text-slate-800 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>
              </div>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </section>
  );
}
