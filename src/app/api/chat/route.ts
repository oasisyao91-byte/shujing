import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const openai = createOpenAI({

  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});


const recommendBooksSchema = z.object({
  books: z.array(
    z.object({
      douban_id: z.string().min(1),
      title: z.string().min(1),
      reason: z.string().min(1),
    })
  ),
});

export const maxDuration = 30;

function extractTextFromUIMessage(message: UIMessage): string {
  const parts: any[] = Array.isArray((message as any).parts) ? (message as any).parts : [];
  const texts = parts
    .filter(p => p?.type === 'text' && typeof p?.text === 'string')
    .map(p => p.text);
  return texts.join('').trim();
}

function cleanTitle(title: string) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .split('：')[0]
    .split(':')[0]
    .trim();
}

async function resolveBookByTitle(supabase: any, title: string) {
  const t = cleanTitle(title);
  if (!t) return null;
  const { data } = await supabase
    .from('books')
    .select('*')
    .ilike('title', `%${t}%`)
    .order('rating', { ascending: false })
    .order('rating_count', { ascending: false })
    .limit(1);
  if (data && data.length > 0) return data[0];
  return null;
}

function buildCandidateLines(rows: any[]) {
  return rows
    .slice(0, 120)
    .map((b: any) => {
      const tags = Array.isArray(b.tags) ? b.tags.slice(0, 4).join('、') : '';
      const rating = b.rating ?? '';
      const author = b.author ?? '';
      return `${b.douban_id} | ${b.title} | ${author} | ${rating} | ${tags}`;
    })
    .join('\n');
}

function extractLastUserText(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user') {
      const t = extractTextFromUIMessage(m);
      if (t) return t;
    }
  }
  return '';
}

function extractQueryTags(text: string) {
  const t = String(text || '');
  const tags: string[] = [];
  const pairs: Array<[string, string]> = [
    ['漫画', '漫画'],
    ['治愈', '治愈'],
    ['科幻', '科幻'],
    ['推理', '推理'],
    ['悬疑', '悬疑'],
    ['历史', '历史'],
    ['心理', '心理学'],
    ['心理学', '心理学'],
    ['经济', '经济学'],
    ['经济学', '经济学'],
    ['哲学', '哲学'],
    ['传记', '传记'],
    ['设计', '设计'],
    ['商业', '商业'],
    ['管理', '管理'],
  ];
  for (const [key, tag] of pairs) {
    if (t.includes(key)) tags.push(tag);
  }
  return Array.from(new Set(tags));
}

function stripMarkdownLike(text: string) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`+/g, '')
    .replace(/#+\s*/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await req.json();
  const messages: UIMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const sessionId: string | undefined = body?.sessionId || body?.id;

  if (sessionId) {
    await supabase
      .from('chat_sessions')
      .upsert({ id: sessionId, user_id: user.id }, { onConflict: 'id' });

    const toUpsert = messages
      .filter(m => m.role === 'user' && typeof (m as any).id === 'string')
      .map(m => ({
        session_id: sessionId,
        user_id: user.id,
        message_id: (m as any).id,
        role: m.role,
        content: extractTextFromUIMessage(m),
        message_json: m,
      }))
      .filter(m => m.content);

    if (toUpsert.length > 0) {
      await supabase.from('chat_messages').upsert(toUpsert, { onConflict: 'message_id' });
      await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
    }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('persona_name, persona_tags')
    .eq('id', user.id)
    .maybeSingle();

  const personaName = profile?.persona_name || '自由探索者';
  const personaTags = Array.isArray(profile?.persona_tags) ? profile.persona_tags : [];

  const { data: recent } = await supabase
    .from('reading_history')
    .select('status, updated_at, books(title, author)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5);

  const recentText = (recent || [])
    .map((r: any) => {
      const book = Array.isArray(r.books) ? r.books[0] : r.books;
      const title = book?.title || '未知书名';
      const author = book?.author || '未知作者';
      const status = r.status || 'reading';
      return `- ${title} / ${author}（${status}）`;
    })
    .join('\n');

  const lastUserText = extractLastUserText(messages);
  const queryTags = extractQueryTags(lastUserText);
  const mergedTags = Array.from(new Set([...(personaTags || []), ...queryTags]));
  let candidateBooks: any[] = [];

  if (mergedTags.length > 0) {
    const orParts = mergedTags
      .slice(0, 6)
      .map((t: string) => `tags.cs.{${String(t).replace(/[{}]/g, '')}}`);
    if (queryTags.includes('漫画')) {
      orParts.push('title.ilike.%漫画%');
    }

    const { data } = await supabase
      .from('books')
      .select('douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
      .gte('rating', 8.2)
      .or(orParts.filter(Boolean).join(','))
      .order('rating', { ascending: false })
      .limit(160);
    candidateBooks = data || [];
  }

  if (lastUserText) {
    const { data } = await supabase
      .from('books')
      .select('douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
      .textSearch('title', lastUserText, { type: 'plain', config: 'simple' })
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(60);
    const merged = new Map<string, any>();
    [...(candidateBooks || []), ...(data || [])].forEach((b: any) => {
      if (b?.douban_id) merged.set(String(b.douban_id), b);
    });
    candidateBooks = Array.from(merged.values());
  }

  if (!candidateBooks || candidateBooks.length < 80) {
    const { data } = await supabase
      .from('books')
      .select('douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
      .gte('rating', 8.5)
      .order('rating', { ascending: false })
      .limit(220);
    candidateBooks = data || candidateBooks;
  }

  const candidateLines = buildCandidateLines(candidateBooks || []);
  const candidateMap = new Map<string, any>();
  (candidateBooks || []).forEach((b: any) => {
    if (b?.douban_id) candidateMap.set(String(b.douban_id), b);
  });

  const system = [
    `你是一个有文人气息的书籍推荐助手。`,
    `用户的阅读性格是「${personaName}」。用户标签：${personaTags.join('、') || '暂无'}`,
    `对话风格：短句、有活人感、带一点俏皮但不油腻。每次回答尽量不超过120个汉字，最后用一个问题收尾。`,
    `格式要求：不要使用 Markdown，不要使用 ** 加粗，不要写“阅读顺序建议/长段分析”。`,
    `推荐呈现：当你要推荐书，请只说1-2句引导，不要在正文里写任何书名（不要出现《》）。具体书名只通过 recommendBooks 工具卡片展示。`,
    `当你要推荐具体书籍时，必须调用工具 recommendBooks。推荐理由要短（每本<=18字），像朋友一句话。`,
    `用户最近在读：`,
    recentText || '- 暂无记录',
    `重要：只能从候选书单里选书；调用工具时 douban_id 必须完全使用候选书单中的 douban_id。`,
    `候选书单（每行：douban_id | 书名 | 作者 | 评分 | 标签）：`,
    candidateLines || '（候选为空）',
  ].join('\n');

  const result = streamText({
    model: openai.chat(process.env.OPENAI_MODEL || 'deepseek-v3-2-251201'),
    system,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 260,
    temperature: 0.7,
    tools: {
      recommendBooks: {
        description: '用于展示书籍卡片。只能从候选书单中选择 douban_id；正文不要重复书名。',
        inputSchema: recommendBooksSchema,
        execute: async ({ books }: z.infer<typeof recommendBooksSchema>) => {
          const ids = Array.from(new Set(books.map(b => String(b.douban_id))));

          const { data: dbBooks } = await supabase
            .from('books')
            .select('*')
            .in('douban_id', ids);

          const map = new Map<string, any>();
          (dbBooks || []).forEach((b: any) => {
            if (b?.douban_id) map.set(String(b.douban_id), b);
          });

          const used = new Set<string>();
          const resolved: Array<{
            douban_id: string;
            title: string;
            reason: string;
            book: any;
            missing: boolean;
          }> = [];
          for (const b of books) {
            let book =
              map.get(String(b.douban_id)) ||
              candidateMap.get(String(b.douban_id)) ||
              null;
            if (!book) {
              book = await resolveBookByTitle(supabase, b.title);
            }
            if (!book && candidateBooks && candidateBooks.length > 0) {
              const preferred = candidateBooks.find((x: any) => {
                const id = String(x?.douban_id || '');
                if (!id || used.has(id)) return false;
                const title = String(x?.title || '');
                const tags = Array.isArray(x?.tags) ? x.tags.join('、') : '';
                return queryTags.some(k => title.includes(k) || tags.includes(k));
              });
              book = preferred || candidateBooks.find((x: any) => x?.douban_id && !used.has(String(x.douban_id))) || null;
            }
            if (book?.douban_id) used.add(String(book.douban_id));
            resolved.push({
              douban_id: book?.douban_id || b.douban_id,
              title: b.title,
              reason: stripMarkdownLike(b.reason).slice(0, 40),
              book,
              missing: !book,
            });
          }

          return { books: resolved, personaName };
        },
      },
    },
    experimental_transform: () =>
      new TransformStream({
        transform(chunk, controller) {
          if (chunk?.type === 'text-delta' && typeof (chunk as any).textDelta === 'string') {
            const textDelta = stripMarkdownLike((chunk as any).textDelta);
            controller.enqueue({ ...(chunk as any), textDelta });
            return;
          }
          controller.enqueue(chunk as any);
        },
      }),
  });

  return result.toUIMessageStreamResponse();
}
