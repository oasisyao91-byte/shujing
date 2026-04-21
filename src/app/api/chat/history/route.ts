import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function normalizeHistoryMessages(rows: any[]) {
  const messages: any[] = [];
  for (const r of rows) {
    const msg =
      r.message_json ??
      {
        id: r.message_id,
        role: r.role,
        parts: [{ type: 'text', text: r.content }],
      };

    const last = messages[messages.length - 1];
    const curText = Array.isArray(msg?.parts)
      ? msg.parts.filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('')
      : '';
    const lastText = last && Array.isArray(last?.parts)
      ? last.parts.filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('')
      : '';

    if (last && last.role === msg.role && lastText === curText) {
      continue;
    }
    messages.push(msg);
  }
  return messages;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId') || searchParams.get('id') || '';
  if (!sessionId) {
    return NextResponse.json({ messages: [] });
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { data: rows } = await supabase
    .from('chat_messages')
    .select('message_id, role, content, message_json, created_at')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const messages = normalizeHistoryMessages(rows || []);

  return NextResponse.json({ messages });
}
