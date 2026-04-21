import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function normalizeBaseURL(value: string | undefined) {
  const raw = (value ?? '').trim().replace(/^`+|`+$/g, '');
  if (!raw) return 'http://maas-api.cn-huabei-1.xf-yun.com/v1';
  if (raw.endsWith('/v2')) return raw.replace(/\/v2$/, '/v1');
  if (raw.endsWith('/v2/')) return raw.replace(/\/v2\/$/, '/v1');
  return raw;
}

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

async function generateObjectViaResponsesAPI(args: {
  baseURL: string;
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const res = await fetch(`${args.baseURL.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      stream: false,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: args.prompt }],
        },
      ],
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(rawText || `LLM 请求失败: ${res.status}`);
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON response');
  }

  const modelText = extractTextFromResponsesPayload(payload);
  if (!modelText) {
    throw new Error('模型未返回文本内容');
  }

  const trimmed = modelText.trim();
  let jsonText = trimmed;
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }

  let obj: any = null;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    throw new Error('模型输出不是有效 JSON');
  }

  return obj;
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: normalizeBaseURL(process.env.OPENAI_BASE_URL),
});

// Define the expected output structure using Zod
const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      douban_id: z.string().describe('豆瓣书籍 subject id（纯数字字符串）'),
      title: z.string().describe('书籍的完整名称'),
      reason: z.string().describe('结合用户性格，为这本书撰写一句走心的推荐语（30字以内）'),
    })
  ),
});

export async function GET() {
  try {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Check Cache
    const { data: cacheData } = await supabase
      .from('recommendation_cache')
      .select('books_json')
      .eq('user_id', userId)
      .eq('cache_date', today)
      .maybeSingle();

    if (cacheData && cacheData.books_json && cacheData.books_json.length > 0) {
      return NextResponse.json({ recommendations: cacheData.books_json });
    }

    // 2. Fetch User Profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('persona_name, persona_tags')
      .eq('id', userId)
      .single();

    if (!userProfile || !userProfile.persona_name) {
      return NextResponse.json({ error: '尚未完成阅读性格测试' }, { status: 400 });
    }

    const personaTags: string[] = Array.isArray(userProfile.persona_tags) ? userProfile.persona_tags : [];

    let candidateBooks: any[] = [];
    if (personaTags.length > 0) {
      const orParts = personaTags
        .slice(0, 6)
        .map((t: string) => `tags.cs.{${String(t).replace(/[{}]/g, '')}}`);
      const { data } = await supabase
        .from('books')
        .select('id,douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
        .gte('rating', 8.2)
        .or(orParts.join(','))
        .order('rating', { ascending: false })
        .limit(160);
      candidateBooks = data || [];
    }

    if (!candidateBooks || candidateBooks.length < 60) {
      const { data } = await supabase
        .from('books')
        .select('id,douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
        .gte('rating', 8.5)
        .order('rating', { ascending: false })
        .limit(220);
      candidateBooks = data || [];
    }

    if (!candidateBooks || candidateBooks.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const candidateLines = candidateBooks
      .slice(0, 120)
      .map((b: any) => {
        const tags = Array.isArray(b.tags) ? b.tags.slice(0, 5).join('、') : '';
        const rating = b.rating ?? '';
        const author = b.author ?? '';
        return `${b.douban_id} | ${b.title} | ${author} | ${rating} | ${tags}`;
      })
      .join('\n');

    const prompt = [
      `用户阅读性格：${userProfile.persona_name}`,
      `用户标签：${personaTags.join('、') || '暂无'}`,
      ``,
      `你必须只从下面候选书单中挑选 8 本进行推荐，不允许虚构，不允许推荐候选之外的书。`,
      `输出必须为严格 JSON，不要输出 Markdown，不要解释文字。`,
      `输出格式：{"recommendations":[{"douban_id":"...","title":"...","reason":"..."}]}`,
      ``,
      `候选书单（每行格式：douban_id | 书名 | 作者 | 评分 | 标签）：`,
      candidateLines,
    ].join('\n');

    const baseURLUsed = normalizeBaseURL(process.env.OPENAI_BASE_URL);
    const modelId = process.env.OPENAI_MODEL || 'deepseek-v3-2-251201';

    let object: any;
    if (baseURLUsed.includes('ark.cn-beijing.volces.com')) {
      const raw = await generateObjectViaResponsesAPI({
        baseURL: baseURLUsed,
        apiKey: process.env.OPENAI_API_KEY || '',
        model: modelId,
        prompt,
      });
      object = recommendationSchema.parse(raw);
    } else {
      const result = await generateObject({
        model: openai(modelId),
        schema: recommendationSchema,
        prompt,
        maxRetries: 2,
      });
      object = result.object;
    }
    
    const aiRecommendations = object.recommendations;

    const ids = Array.from(new Set(aiRecommendations.map((r: any) => String(r.douban_id))));
    const { data: matchedBooks } = await supabase
      .from('books')
      .select('*')
      .in('douban_id', ids);

    const map = new Map<string, any>();
    (matchedBooks || []).forEach((b: any) => {
      if (b?.douban_id) map.set(String(b.douban_id), b);
    });

    const validBooks: any[] = [];
    for (const rec of aiRecommendations) {
      const book = map.get(String(rec.douban_id));
      if (!book) continue;
      validBooks.push({ ...book, llm_reason: rec.reason });
    }
    
    // 5. Fallback if valid books < 4
    if (validBooks.length < 4) {
      const needed = 4 - validBooks.length;
      
      // Get some high-rating books not already in validBooks
      const excludeIds = validBooks.map((b: any) => b.id);
      let fallbackQuery = supabase
        .from('books')
        .select('*')
        .limit(needed * 2); // just get any books for now to ensure it's not empty
        
      if (excludeIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { data: fallbackBooks, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        throw fallbackError;
      }

      if (fallbackBooks && fallbackBooks.length > 0) {
        // Simple random shuffle
        const shuffled = fallbackBooks.sort(() => 0.5 - Math.random()).slice(0, needed);
        
        shuffled.forEach((book: any) => {
          validBooks.push({
            ...book,
            llm_reason: `高分佳作，与你的阅读性格「${userProfile.persona_name}」很契合。`,
          });
        });
      }
    }

    // 6. Save to cache
    // Upsert the cache for today
    await supabase
      .from('recommendation_cache')
      .upsert(
        { 
          user_id: userId, 
          cache_date: today, 
          books_json: validBooks 
        },
        { onConflict: 'user_id,cache_date' }
      );

    return NextResponse.json({ recommendations: validBooks });
  } catch (error: any) {
    console.error('Personal Recommendation Error:', error);
    return NextResponse.json({ error: error.message || '内部服务器错误' }, { status: 500 });
  }
}
