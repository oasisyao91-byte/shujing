import { createClient } from '@/lib/supabase/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId') || '';
  if (!bookId) {
    return new Response('missing bookId', { status: 400 });
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: book } = await supabase
    .from('books')
    .select('douban_id,title,author')
    .or(`id.eq.${bookId},douban_id.eq.${bookId}`)
    .limit(1)
    .maybeSingle();

  if (!book) {
    return new Response('not found', { status: 404 });
  }

  let personaName = '自由探索者';
  let personaTags: string[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('persona_name, persona_tags')
      .eq('id', user.id)
      .maybeSingle();
    personaName = profile?.persona_name || personaName;
    personaTags = Array.isArray(profile?.persona_tags) ? profile.persona_tags : [];
  }

  const system = [
    '你是一个温柔、带点诗意的读书朋友。',
    '只输出纯文本，不要使用 Markdown，不要使用 ** 加粗，不要换行。',
    '不使用“建议”“推荐”等词。',
    '一句话，不超过30字。',
  ].join('\n');

  const prompt = user
    ? `用户阅读性格：${personaName}。用户标签：${personaTags.join('、') || '暂无'}。书名：${book.title}。作者：${book.author || ''}。请写一句话说明为什么今天这个性格的人适合读它。`
    : `书名：${book.title}。作者：${book.author || ''}。请写一句话说明为什么今天适合读它。`;

  const result = streamText({
    model: openai.chat(process.env.OPENAI_MODEL || 'deepseek-v3-2-251201'),
    system,
    prompt,
    maxOutputTokens: 80,
    temperature: 0.8,
  });

  return result.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

