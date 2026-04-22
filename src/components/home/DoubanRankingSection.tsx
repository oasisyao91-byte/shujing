import { createClient } from '@/lib/supabase/server';
import { Book } from '@/types/database';
import { DoubanRankingSectionClient } from '@/components/home/DoubanRankingSectionClient';

export async function DoubanRankingSection() {
  const supabase = createClient();
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .gt('rating_count', 100)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error || !books || books.length === 0) {
    return <DoubanRankingSectionClient books={[]} lastSync="最近" showDevLink={process.env.NODE_ENV === 'development'} />;
  }

  const typedBooks = books as Book[];
  const { data: latest } = await (supabase as any)
    .from('books')
    .select('synced_at')
    .order('synced_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const lastSync = latest?.synced_at ? new Date(latest.synced_at).toLocaleDateString('zh-CN') : '最近';

  return <DoubanRankingSectionClient books={typedBooks} lastSync={lastSync} showDevLink={false} />;
}
