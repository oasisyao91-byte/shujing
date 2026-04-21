'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useRef, useState } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { MoodTab } from '@/components/home/MoodTab';
import { TopicTab } from '@/components/home/TopicTab';
import { SimilarTab } from '@/components/home/SimilarTab';

export function DiscoverSection() {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref as any, 0);
  const [tab, setTab] = useState('mood');

  const openChat = (prefill: string) => {
    const url = `/?chat=true&prefill=${encodeURIComponent(prefill)}`;
    window.location.href = url;
  };

  return (
    <section ref={ref} className="scroll-reveal space-y-4">
      <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
        <div className="text-xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
          发现更多
        </div>
        <div className="text-sm font-songti" style={{ color: 'var(--color-ink-muted)' }}>
          换个方式，找到你没想到但一定喜欢的书
        </div>
      </div>

      <div className="rounded-2xl border border-brand-parchment bg-white overflow-hidden">
        <Tabs.Root value={tab} onValueChange={setTab}>
          <div className="px-4 pt-4 md:px-6 md:pt-6">
            <Tabs.List className="inline-flex rounded-2xl bg-brand-parchment/90 p-1">
              <Tabs.Trigger
                value="mood"
                className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors duration-200"
              >
                按心情
              </Tabs.Trigger>
              <Tabs.Trigger
                value="topic"
                className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors duration-200"
              >
                按话题
              </Tabs.Trigger>
              <Tabs.Trigger
                value="history"
                className="px-4 py-2 rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy transition-colors duration-200"
              >
                按读过的书
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          <div className="p-4 md:p-6">
            <Tabs.Content
              value="mood"
              className="outline-none data-[state=inactive]:opacity-0 data-[state=inactive]:pointer-events-none transition-opacity duration-150"
            >
              <MoodTab onOpenChat={openChat} />
            </Tabs.Content>
            <Tabs.Content
              value="topic"
              className="outline-none data-[state=inactive]:opacity-0 data-[state=inactive]:pointer-events-none transition-opacity duration-150"
            >
              <TopicTab onOpenChat={openChat} />
            </Tabs.Content>
            <Tabs.Content
              value="history"
              className="outline-none data-[state=inactive]:opacity-0 data-[state=inactive]:pointer-events-none transition-opacity duration-150"
            >
              <SimilarTab onOpenChat={openChat} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>
    </section>
  );
}
