"use server";

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export async function getSyncStats() {
  if (process.env.NODE_ENV !== 'development') return null;

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count } = await supabase.from('books').select('*', { count: 'exact', head: true });
  const { data: logs } = await supabase.from('sync_logs').select('*').order('synced_at', { ascending: false }).limit(5);

  return { bookCount: count, logs: logs || [] };
}