import { createClient } from '@/lib/supabase/server';
import { BookCard } from '@/components/books/BookCard';
import type { Book } from '@/types/database';

export default async function RankingsPage() {
  const supabase = createClient();
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .gt('rating_count', 100)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(20);

  const list = (books || []) as Book[];

  return (
    <div className="container py-10 space-y-6">
      <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
        <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
          豆瓣高分图书
        </h1>
        <div className="text-sm font-songti" style={{ color: 'var(--color-ink-muted)' }}>
          精选 20 本高分之作，慢慢翻。
        </div>
      </div>

      {error || list.length === 0 ? (
        <div className="rounded-2xl border border-brand-parchment bg-white p-8 text-center text-brand-muted">
          暂时没有榜单数据
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-parchment bg-white p-4 space-y-2">
          {list.map((b, i) => (
            <BookCard key={b.id} book={b} variant="ranking" rank={i + 1} />
          ))}
        </div>
      )}

      <a href="/" className="text-[13px] text-[#3A7AB5] hover:underline underline-offset-2">
        返回首页 →
      </a>
    </div>
  );
}

