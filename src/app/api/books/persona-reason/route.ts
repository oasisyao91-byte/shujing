import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function extractTextFromResponsesPayload(payload: any): string {
  if (!payload) return '';
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string') parts.push(c.text);
    }
  }
  if (parts.length > 0) return parts.join('');
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const maybe = choices?.[0]?.message?.content;
  return typeof maybe === 'string' ? maybe : '';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doubanId = searchParams.get('doubanId') || '';
  const mode = searchParams.get('mode') || 'search';

  if (!doubanId) {
    return NextResponse.json({ error: '缺少 doubanId' }, { status: 400 });
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('persona_name, persona_tags')
    .eq('id', user.id)
    .maybeSingle();

  const { data: book } = await supabase
    .from('books')
    .select('douban_id, title, author, rating, tags, summary')
    .eq('douban_id', doubanId)
    .maybeSingle();

  if (!book) {
    return NextResponse.json({ error: '未找到该书' }, { status: 404 });
  }

  const personaName = profile?.persona_name || '自由探索者';
  const personaTags = Array.isArray(profile?.persona_tags) ? profile.persona_tags : [];

  const prompt =
    mode === 'detail'
      ? `用户阅读性格：${personaName}（${personaTags.join('、') || '暂无'}）\n书籍信息：${book.title} / ${book.author || ''} / 评分${book.rating ?? '未知'}\n简介：${book.summary || '暂无'}\n\n请写一段不超过50字的「为你推荐」语段，语气温暖、富有哲理，不要使用引号，不要换行。`
      : `用户阅读性格：${personaName}（${personaTags.join('、') || '暂无'}）\n书籍信息：${book.title} / ${book.author || ''} / 评分${book.rating ?? '未知'}\n\n请写一句不超过30字的专属推荐理由，不要使用引号，不要换行。`;

  const baseURL = (process.env.OPENAI_BASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.OPENAI_API_KEY || '';
  const model = process.env.OPENAI_MODEL || 'deepseek-v3-2-251201';

  const res = await fetch(`${baseURL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: raw || 'LLM 调用失败' }, { status: 500 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON response' }, { status: 500 });
  }

  const text = extractTextFromResponsesPayload(payload).trim();
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const chunks = [text.slice(0, Math.ceil(text.length / 2)), text.slice(Math.ceil(text.length / 2))].filter(Boolean);
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
