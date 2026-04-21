import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { count } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .gt('rating', 8.0)
    .gt('rating_count', 50);

  const total = count || 0;
  if (total <= 0) {
    return NextResponse.json({ book: null });
  }

  const offset = Math.floor(Math.random() * total);
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .gt('rating', 8.0)
    .gt('rating_count', 50)
    .order('id', { ascending: true })
    .range(offset, offset);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const book = data && data.length > 0 ? data[0] : null;
  return NextResponse.json({ book });
}

