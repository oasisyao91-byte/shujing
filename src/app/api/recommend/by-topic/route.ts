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

const schema = z.object({
  intro: z.string(),
  books: z.array(
    z.object({
      douban_id: z.string(),
      reason: z.string(),
    })
  ),
});

type CacheItem = { expiresAt: number; data: { intro: string; books: any[] } };
const topicCache = new Map<string, CacheItem>();

function shortReason(text: string) {
  const t = String(text || '').replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
  const max = 28;
  if (t.length <= max) return t;
  let cut = t.slice(0, max);
  cut = cut.replace(/[，,、:：;；\s]+$/g, '');
  return `${cut}…`;
}

const topicKeywords: Record<string, string[]> = {
  人工智能: ['人工智能', 'AI', '机器学习', '深度学习', '神经网络', '算法', '编程'],
  城市与建筑: ['城市', '建筑', '建筑学', '建筑设计', '城市规划', '建筑史'],
  女性叙事: ['女性', '女性主义', '性别', '成长', '生活', '爱情'],
  日本文化: ['日本', '日本文化', '日本文学', '村上春树', '漫画', '日本漫画'],
  商业思维: ['商业', '管理', '营销', '创业', '投资', '经济'],
  战争与历史: ['战争', '军事', '二战', '历史', '近代史', '中国历史'],
  心理与自我: ['心理', '心理学', '自我', '情绪', '成长', '人际关系'],
  自然与生态: ['自然', '生态', '科普', '科学', '环境', '生物'],
  东方哲学: ['哲学', '国学', '佛教', '宗教', '思想', '人文'],
  科幻与未来: ['科幻', '未来', '科幻小说', '科技', '互联网', '神经网络'],
  设计与美学: ['设计', '美学', '艺术', '艺术史', '绘画', '摄影', '建筑'],
  中国现代史: ['中国现代史', '近代史', '思想', '人物传记', '社会', '政治'],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = (searchParams.get('topic') || '人工智能').trim();
  if (!topic) {
    return NextResponse.json({ error: 'missing topic' }, { status: 400 });
  }

  const cacheKey = `topic:${topic}:${Math.floor(Date.now() / 3600000)}`;
  const cached = topicCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const supabase = createClient() as any;
  const keywords = (topicKeywords[topic] || [topic]).map(k => k.trim()).filter(Boolean).slice(0, 6);
  const orParts: string[] = [];
  for (const k of keywords) {
    const safe = k.replace(/[{}]/g, '');
    orParts.push(`tags.cs.{${safe}}`);
    orParts.push(`title.ilike.%${k}%`);
    orParts.push(`summary.ilike.%${k}%`);
  }

  const { data: candidates } = await supabase
    .from('books')
    .select('douban_id,title,author,rating,tags,cover_url,publish_date,publisher,summary')
    .gt('rating_count', 50)
    .or(orParts.join(','))
    .order('rating', { ascending: false })
    .limit(10);

  const list = (candidates || []).filter((b: any) => b?.douban_id);

  const lines = list
    .slice(0, 10)
    .map((b: any) => `${b.douban_id} | ${b.title} | ${b.author || ''}`)
    .join('\n');

  const prompt = [
    `话题：${topic}`,
    `从候选书单中挑选 3 本最相关的书，并为每本写一句推荐语（15字内，口语、有画面感；不使用“建议”“推荐”“适合”）。`,
    `再写一句话题导读语（30字内），最后附“— 书境 · 话题导读”。`,
    `只能使用候选中的 douban_id。`,
    `输出严格 JSON：{"intro":"...","books":[{"douban_id":"...","reason":"..."}]}`,
    `候选书单：`,
    lines || '（候选为空）',
  ].join('\n');

  let intro = `读这个话题，是为了把“知道”变成“看见”。— 书境 · 话题导读`;
  let picks: Array<{ douban_id: string; reason: string }> = [];

  if (list.length >= 3) {
    try {
      const result = await generateObject({
        model: openai.chat(process.env.OPENAI_MODEL || 'deepseek-v3-2-251201'),
        schema,
        prompt,
        maxRetries: 1,
      });
      intro = String(result.object.intro || intro).replace(/\s+/g, ' ').trim().slice(0, 60);
      picks = (result.object.books || [])
        .slice(0, 3)
        .map((b) => ({ douban_id: String(b.douban_id || '').trim(), reason: shortReason(b.reason) }))
        .filter((b) => b.douban_id);
    } catch {
      picks = [];
    }
  }

  const map = new Map<string, any>();
  list.forEach((b: any) => map.set(String(b.douban_id), b));

  const books: any[] = [];
  const used = new Set<string>();
  for (const p of picks) {
    const b = map.get(String(p.douban_id));
    if (!b) continue;
    const id = String(b.douban_id);
    if (used.has(id)) continue;
    used.add(id);
    books.push({ ...b, reason: p.reason });
  }

  if (books.length < 3) {
    for (const b of list) {
      if (books.length >= 3) break;
      const id = String(b.douban_id);
      if (used.has(id)) continue;
      used.add(id);
      books.push({ ...b, reason: shortReason(`${topic}里的一盏灯`) });
    }
  }

  if (books.length < 3) {
    const { data: fallback } = await supabase
      .from('books')
      .select('douban_id,title,author,rating,tags,cover_url,publish_date,publisher,summary')
      .gt('rating_count', 50)
      .gte('rating', 8.0)
      .order('rating', { ascending: false })
      .limit(30);

    for (const b of fallback || []) {
      if (books.length >= 3) break;
      if (!b?.douban_id) continue;
      const id = String(b.douban_id);
      if (used.has(id)) continue;
      used.add(id);
      books.push({ ...b, reason: shortReason(`${topic}的另一条路`) });
    }
  }

  const data = { intro, books: books.slice(0, 3) };
  topicCache.set(cacheKey, { expiresAt: Date.now() + 3600000, data });
  return NextResponse.json(data);
}
