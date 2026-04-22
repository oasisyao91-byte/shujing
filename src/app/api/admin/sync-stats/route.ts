import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL is required' }, { status: 500 });
  if (!key) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required' }, { status: 500 });

  const supabase = createClient<Database>(url, key);
  const { count } = await supabase.from('books').select('*', { count: 'exact', head: true });
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ bookCount: count ?? null, logs: logs || [] });
}

