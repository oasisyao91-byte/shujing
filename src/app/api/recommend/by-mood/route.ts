import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

const moodMap: Record<string, { label: string; keywords: string[] }> = {
  heal: { label: '治愈放松', keywords: ['治愈', '温暖', '轻盈', '日常'] },
  think: { label: '深度思考', keywords: ['思考', '洞见', '哲学', '结构'] },
  story: { label: '沉浸故事', keywords: ['故事', '叙事', '沉浸', '戏剧性'] },
  grow: { label: '成长突破', keywords: ['突破', '行动', '成长', '方法'] },
  wander: { label: '漫游世界', keywords: ['旅行', '世界', '文化', '漫游'] },
};

const schema = z.object({
  books: z.array(
    z.object({
      title: z.string(),
      author: z.string().optional().default(''),
      reason: z.string(),
    })
  ),
});

type CacheItem = { expiresAt: number; data: Array<{ book: any; reason: string }> };
const moodCache = new Map<string, CacheItem>();

function cleanTitle(title: string) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .split('：')[0]
    .split(':')[0]
    .trim();
}

function shortReason(text: string) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().replace(/\*\*/g, '');
  const max = 28;
  if (t.length <= max) return t;
  let cut = t.slice(0, max);
  cut = cut.replace(/[，,、:：;；\s]+$/g, '');
  return `${cut}…`;
}

function makeMoodReason(mood: string, book: any) {
  const kw = moodMap[mood]?.keywords?.[0] || '刚刚好';
  const tags = Array.isArray(book?.tags) ? book.tags.slice(0, 2).join('·') : '';
  const base = tags ? `${kw}·${tags}` : kw;
  return shortReason(base);
}

async function getUserExcludedDoubanIds(supabase: any, userId: string) {
  const { data } = await supabase
    .from('reading_history')
    .select('books(douban_id)')
    .eq('user_id', userId)
    .limit(2000);
  const ids = new Set<string>();
  (data || []).forEach((r: any) => {
    const b = Array.isArray(r.books) ? r.books[0] : r.books;
    if (b?.douban_id) ids.add(String(b.douban_id));
  });
  return ids;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mood = searchParams.get('mood') || 'heal';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 4), 1), 8);
  const moodInfo = moodMap[mood] || moodMap.heal;

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  let personaName = '';
  let personaTags: string[] = [];
  let exclude = new Set<string>();

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('persona_name, persona_tags')
      .eq('id', user.id)
      .maybeSingle();
    personaName = profile?.persona_name || '';
    personaTags = Array.isArray(profile?.persona_tags) ? profile.persona_tags : [];
    exclude = await getUserExcludedDoubanIds(supabase, user.id);
  }

  const slot = Math.floor(Date.now() / 300000);
  const cacheKey = `mood:${mood}:${slot}`;
  const cached = moodCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    const filtered = cached.data.filter(x => x?.book?.douban_id && !exclude.has(String(x.book.douban_id)));
    if (filtered.length >= limit) {
      return NextResponse.json({ books: filtered.slice(0, limit).map(x => ({ ...x.book, reason: x.reason })) });
    }
  }

  const system = [
    '你是书境的推荐助手。',
    `用户当前心情：${moodInfo.label}。`,
    personaName ? `用户阅读性格：${personaName}。标签：${personaTags.join('、') || '暂无'}。` : '用户未登录。',
    '请推荐 6 本真实存在的书（用于校验兜底）。',
    '每本附一句推荐语（15字以内，口语化，有画面感，禁止用“建议”“推荐”“适合”等词）。',
    '只输出严格 JSON，对象格式：{"books":[{"title":"...","author":"...","reason":"..."}]}',
  ].join('\n');

  let candidates: Array<{ title: string; author?: string; reason: string }> = [];
  try {
    const result = await generateObject({
      model: openai.chat(process.env.OPENAI_MODEL || 'deepseek-v3-2-251201'),
      schema,
      prompt: system,
      maxRetries: 1,
    });
    candidates = (result.object.books || []).slice(0, 8);
  } catch {
    candidates = [];
  }
  const chosen: Array<{ book: any; reason: string }> = [];
  const used = new Set<string>();

  for (const c of candidates) {
    const t = cleanTitle(c.title);
    if (!t) continue;
    let q = supabase.from('books').select('*').ilike('title', `%${t}%`).order('rating', { ascending: false }).order('rating_count', { ascending: false }).limit(1);
    if (c.author && c.author.trim()) {
      q = q.ilike('author', `%${c.author.trim()}%`);
    }
    const { data } = await q;
    const book = data && data[0] ? data[0] : null;
    if (!book?.douban_id) continue;
    const id = String(book.douban_id);
    if (exclude.has(id) || used.has(id)) continue;
    used.add(id);
    chosen.push({ book, reason: shortReason(c.reason) });
    if (chosen.length >= limit) break;
  }

  if (chosen.length < limit) {
    const need = limit - chosen.length;
    const excludeIds = Array.from(new Set([...Array.from(exclude), ...Array.from(used)]));
    let q = supabase
      .from('books')
      .select('*')
      .gt('rating', 8.0)
      .gt('rating_count', 50)
      .order('rating', { ascending: false })
      .limit(need * 6);
    if (excludeIds.length > 0) {
      q = q.not('douban_id', 'in', `(${excludeIds.join(',')})`);
    }
    const { data: fb } = await q;
    (fb || []).slice(0, need).forEach((b: any) => {
      if (!b?.douban_id) return;
      const id = String(b.douban_id);
      if (exclude.has(id) || used.has(id)) return;
      used.add(id);
      chosen.push({ book: b, reason: makeMoodReason(mood, b) });
    });
  }

  moodCache.set(cacheKey, { expiresAt: Date.now() + 300000, data: chosen });

  return NextResponse.json({ books: chosen.slice(0, limit).map(x => ({ ...x.book, reason: x.reason })) });
}
