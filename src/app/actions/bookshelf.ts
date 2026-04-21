'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getBookshelfEntry(doubanId: string) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('未登录');
  }

  const { data: book } = await supabase
    .from('books')
    .select('id, douban_id')
    .eq('douban_id', doubanId)
    .maybeSingle();

  if (!book) {
    throw new Error('未找到该书');
  }

  const { data: entry } = await supabase
    .from('reading_history')
    .select('status, note')
    .eq('user_id', user.id)
    .eq('book_id', book.id)
    .maybeSingle();

  return entry || { status: null, note: '' };
}

export async function saveBookshelfEntry(input: {
  doubanId: string;
  status: 'want_read' | 'reading' | 'finished' | null;
  note: string;
}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('未登录');
  }

  const { data: book } = await supabase
    .from('books')
    .select('id, douban_id')
    .eq('douban_id', input.doubanId)
    .maybeSingle();

  if (!book) {
    throw new Error('未找到该书');
  }

  const { error } = await supabase
    .from('reading_history')
    .upsert(
      {
        user_id: user.id,
        book_id: book.id,
        status: input.status ?? 'want_read',
        note: input.note,
      },
      { onConflict: 'user_id,book_id' }
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/book/${input.doubanId}`);
  revalidatePath('/');
  return { success: true };
}
