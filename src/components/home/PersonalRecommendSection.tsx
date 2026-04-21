'use client';

import { useEffect, useState } from 'react';
import { BookCard } from '@/components/books/BookCard';

import { Book } from '@/types/database';

interface RecommendBook extends Book {
  llm_reason?: string;
}

export function PersonalRecommendSection({ 
  isLoggedIn,
  personaType
}: { 
  isLoggedIn: boolean; 
  personaType?: string | null;
}) {
  const [books, setBooks] = useState<RecommendBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needPersona, setNeedPersona] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setNeedPersona(false);
      setBooks([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/recommend/personal');
        if (!res.ok) {
          const errData = await res.json();
          if (res.status === 400) {
            setNeedPersona(true);
            setBooks([]);
            setError(null);
            return;
          }
          if (res.status === 401) {
            setNeedPersona(false);
            setBooks([]);
            setError(null);
            return;
          }
          throw new Error(errData.error || 'Failed to fetch recommendations');
        }
        const data = await res.json();
        setNeedPersona(false);
        setBooks(data.recommendations || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isLoggedIn, personaType]);

  if (!isLoggedIn || needPersona) {
    return (
      <div className="p-8 bg-brand-blue/5 rounded-2xl border border-brand-blue/10 text-center">
        <h3 className="text-xl font-bold text-brand-navy mb-2">专属推荐</h3>
        <p className="text-brand-muted mb-4">
          {!isLoggedIn ? '登录并完成阅读性格测试，获取专属你的 AI 推荐书单' : '完成阅读性格测试后，为你生成专属书单'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-brand-navy flex items-center">
          <span className="animate-pulse mr-2">✨</span> 正在为你翻阅书海，寻找契合灵魂的文字...
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-none w-[280px] h-[160px] bg-brand-parchment animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-xl text-center">
        无法获取推荐：{error}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-brand-parchment text-center text-brand-muted">
        暂时没有可展示的推荐书单
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-brand-navy">✨ 专属你的推荐</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {books.map((book) => (
          <div key={book.id} className="flex-none w-[320px] snap-start">
            <BookCard 
              book={book} 
              variant="default"
              reason={book.llm_reason}
              reasonLabel="因为你的阅读性格"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
