import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UIMessage } from 'ai';

export const dynamic = 'force-dynamic';

function extractTextFromUIMessage(message: UIMessage): string {
  const parts: any[] = Array.isArray((message as any).parts) ? (message as any).parts : [];
  const texts = parts
    .filter(p => p?.type === 'text' && typeof p?.text === 'string')
    .map(p => p.text);
  return texts.join('').trim();
}

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await req.json();
  const sessionId: string | undefined = body?.sessionId;
  const message: UIMessage | undefined = body?.message;
  const messages: UIMessage[] | undefined = body?.messages;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const list: UIMessage[] = Array.isArray(messages) ? messages : (message ? [message] : []);
  const filtered = list.filter(m => m && (m.role === 'assistant' || m.role === 'user') && typeof (m as any).id === 'string');

  await supabase
    .from('chat_sessions')
    .upsert({ id: sessionId, user_id: user.id }, { onConflict: 'id' });

  const toUpsert = filtered.map(m => ({
    session_id: sessionId,
    user_id: user.id,
    message_id: (m as any).id,
    role: m.role,
    content: extractTextFromUIMessage(m),
    message_json: m,
  }));

  if (toUpsert.length > 0) {
    await supabase.from('chat_messages').upsert(toUpsert, { onConflict: 'message_id' });
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  }

  return NextResponse.json({ ok: true });
}

