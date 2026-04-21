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
  const lastSync = typedBooks[0]?.synced_at ? new Date(typedBooks[0].synced_at).toLocaleDateString('zh-CN') : '最近';

  return <DoubanRankingSectionClient books={typedBooks} lastSync={lastSync} showDevLink={false} />;
}
