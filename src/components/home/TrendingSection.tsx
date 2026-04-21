import { TrendingSectionClient } from '@/components/home/TrendingSectionClient';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function TrendingSection() {
  try {
    const { data } = await (supabaseAdmin as any)
      .from('daily_trending')
      .select('*')
      .order('trend_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      const { data: fallbackBooks } = await (supabaseAdmin as any)
        .from('books')
        .select('*')
        .gt('rating_count', 100)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(3);
      const items = (fallbackBooks || []).map((b: any) => ({
        quote: `翻开《${b.title}》，先把心放慢一点。`,
        book: b,
      }));
      return <TrendingSectionClient items={items} />;
    }

    const books = Array.isArray(data.books_json) ? data.books_json : [];
    const items = books.slice(0, 3).map((b: any) => ({
      quote: String(b.page_quote || b.connection_reason || '').trim() || `翻开《${b.title}》，先把心放慢一点。`,
      book: b,
    }));

    return <TrendingSectionClient items={items} />;
  } catch {
    const { data: fallbackBooks } = await (supabaseAdmin as any)
      .from('books')
      .select('*')
      .gt('rating_count', 100)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(3);
    const items = (fallbackBooks || []).map((b: any) => ({
      quote: `翻开《${b.title}》，先把心放慢一点。`,
      book: b,
    }));
    return <TrendingSectionClient items={items} />;
  }
}
