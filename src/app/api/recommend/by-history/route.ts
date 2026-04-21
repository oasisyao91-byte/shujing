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
  books: z.array(
    z.object({
      douban_id: z.string(),
      relation_type: z.enum(['same_author', 'same_theme', 'similar_style', 'complement']),
      reason: z.string(),
    })
  ),
});

type CacheItem = { expiresAt: number; data: any[] };
const historyCache = new Map<string, CacheItem>();

function shortReason(text: string) {
  const t = String(text || '').replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
  const max = 28;
  if (t.length <= max) return t;
  let cut = t.slice(0, max);
  cut = cut.replace(/[，,、:：;；\s]+$/g, '');
  return `${cut}…`;
}

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await req.json();
  const seedIds: string[] = Array.isArray(body?.seed_book_ids) ? body.seed_book_ids.map((x: any) => String(x)) : [];
  const cleaned = Array.from(new Set(seedIds.filter(Boolean))).slice(0, 3);
  if (cleaned.length === 0) {
    return NextResponse.json({ books: [] });
  }

  const key = `${user.id}:${cleaned.slice().sort().join(',')}`;
  const cached = historyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ books: cached.data });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('persona_name')
    .eq('id', user.id)
    .maybeSingle();

  const personaName = profile?.persona_name || '';

  const { data: seeds } = await supabase
    .from('books')
    .select('douban_id,title,author,tags')
    .in('douban_id', cleaned)
    .limit(3);

  const seedList = (seeds || []).filter((b: any) => b?.douban_id);
  const seedTags: string[] = Array.from(
    new Set<string>(
      seedList
        .flatMap((b: any) => (Array.isArray(b.tags) ? (b.tags as any[]).map(String) : []))
        .slice(0, 14)
    )
  );
  const seedAuthors: string[] = Array.from(
    new Set<string>(seedList.map((b: any) => String(b.author || '').trim()).filter(Boolean))
  ).slice(0, 3);

  const orParts: string[] = [];
  seedTags.slice(0, 6).forEach((t: string) => orParts.push(`tags.cs.{${t.replace(/[{}]/g, '')}}`));
  seedAuthors.forEach((a: string) => orParts.push(`author.ilike.%${a}%`));

  const { data: candidates } = await supabase
    .from('books')
    .select('douban_id,title,author,rating,tags,cover_url,rating_count')
    .gt('rating_count', 50)
    .gte('rating', 8.0)
    .or(orParts.join(','))
    .limit(160);

  const candidateList = (candidates || [])
    .filter((b: any) => b?.douban_id && !cleaned.includes(String(b.douban_id)))
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 120);

  const lines = candidateList.map((b: any) => `${b.douban_id} | ${b.title} | ${b.author || ''}`).join('\n');

  const prompt = [
    `用户读过以下书籍：`,
    seedList.map((b: any) => `- ${b.title}（${(Array.isArray(b.tags) ? b.tags.slice(0, 6).join('、') : '')}）`).join('\n'),
    personaName ? `用户阅读性格：${personaName}` : '',
    `请从候选书单中挑选 6 本与这些书相关的书，类型可以是：同作者/同主题/风格相似/互补视角。`,
    `为每本注明 relation_type（same_author/same_theme/similar_style/complement）和一句推荐语（15字内，不使用“建议”“推荐”“适合”）。`,
    `只能使用候选中的 douban_id。`,
    `输出严格 JSON：{"books":[{"douban_id":"...","relation_type":"...","reason":"..."}]}`,
    `候选书单：`,
    lines || '（候选为空）',
  ].filter(Boolean).join('\n');

  let picked: Array<{ douban_id: string; relation_type: string; reason: string }> = [];
  if (candidateList.length >= 12) {
    try {
      const result = await generateObject({
        model: openai.chat(process.env.OPENAI_MODEL || 'deepseek-v3-2-251201'),
        schema,
        prompt,
        maxRetries: 1,
      });
      picked = (result.object.books || [])
        .map((b) => ({
          douban_id: String(b.douban_id || '').trim(),
          relation_type: b.relation_type,
          reason: shortReason(b.reason),
        }))
        .filter((b) => b.douban_id);
    } catch {
      picked = [];
    }
  }

  const map = new Map<string, any>();
  candidateList.forEach((b: any) => map.set(String(b.douban_id), b));

  const out: any[] = [];
  const used = new Set<string>();
  for (const p of picked) {
    const b = map.get(String(p.douban_id));
    if (!b) continue;
    const id = String(b.douban_id);
    if (used.has(id)) continue;
    used.add(id);
    out.push({ ...b, reason: p.reason, relation_type: p.relation_type });
    if (out.length >= 4) break;
  }

  if (out.length < 4) {
    for (const b of candidateList) {
      if (out.length >= 4) break;
      const id = String(b.douban_id);
      if (used.has(id)) continue;
      used.add(id);
      out.push({ ...b, reason: shortReason('换个角度看看'), relation_type: 'complement' });
    }
  }

  historyCache.set(key, { expiresAt: Date.now() + 86400000, data: out });
  return NextResponse.json({ books: out });
}
