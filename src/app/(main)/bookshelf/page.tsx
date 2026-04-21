import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BookshelfClient } from '@/components/bookshelf/BookshelfClient';

export default async function BookshelfPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('persona_name')
    .eq('id', user.id)
    .maybeSingle();

  const personaName = profile?.persona_name || '自由探索者';

  const { data: rows } = await supabase
    .from('reading_history')
    .select('status, note, updated_at, books(*)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  const entries = (rows || [])
    .map((r: any) => {
      const book = Array.isArray(r.books) ? r.books[0] : r.books;
      return {
        status: r.status,
        note: r.note || '',
        updated_at: r.updated_at,
        book,
      };
    })
    .filter((e: any) => e.book);

  const title = `${personaName}的私人藏书`;
  return <BookshelfClient entries={entries} title={title} />;
}

