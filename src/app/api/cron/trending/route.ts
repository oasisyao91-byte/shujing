import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Database } from '@/types/database';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function pickUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': pickUserAgent(),
      Accept: 'application/json,text/plain,*/*',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }
  return await res.json();
}

function extractHotTopics(payload: any): string[] {
  const candidates: string[] = [];
  const list =
    payload?.data?.list ||
    payload?.data ||
    payload?.data?.band_list ||
    payload?.data?.hotword ||
    payload?.hotword ||
    payload?.list ||
    payload?.items ||
    [];

  const arr = Array.isArray(list) ? list : [];
  for (const item of arr) {
    const t =
      item?.word ||
      item?.name ||
      item?.title ||
      item?.note ||
      item?.query ||
      item?.hotword ||
      '';
    const text = String(t).trim();
    if (text) candidates.push(text);
  }
  return candidates;
}

function isCultureTopic(topic: string) {
  const banned = [
    '习近平',
    '中共中央',
    '外交',
    '台湾',
    '美国',
    '总统',
    '俄乌',
    '乌克兰',
    '以色列',
    '巴以',
    '地震',
    '火灾',
    '洪水',
    '疫情',
    '病例',
    '军',
    '核',
  ];
  return !banned.some(k => topic.includes(k));
}

async function getTrendingTopics(): Promise<string[]> {
  const endpoints = [
    'https://tenapi.cn/v2/weibohot',
    'https://v.api.aa1.cn/api/weibo-rs/index.php?type=json',
  ];

  for (const url of endpoints) {
    try {
      const payload = await fetchJson(url);
      const topics = extractHotTopics(payload).filter(isCultureTopic);
      if (topics.length > 0) return topics;
    } catch {
      continue;
    }
  }

  return ['繁花', '黑神话：悟空', '诺贝尔文学奖'];
}

const trendingSchema = z.object({
  cultural_analysis: z.string().min(1),
  books: z.array(
    z.object({
      douban_id: z.string().min(1),
      page_quote: z.string().min(1),
      connection_reason: z.string().min(1),
    })
  ),
});

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

function toCandidateLines(books: any[]) {
  return (books || [])
    .filter((b: any) => b?.douban_id)
    .slice(0, 40)
    .map((b: any) => {
      const tags = Array.isArray(b.tags) ? b.tags.slice(0, 4).join('、') : '';
      return `${b.douban_id} | ${b.title} | ${b.author || ''} | ${tags}`;
    })
    .join('\n');
}

async function getCandidateBooks(topic: string): Promise<any[]> {
  const safeTopic = topic.replace(/[{}]/g, '');
  const { data } = await supabaseAdmin
    .from('books')
    .select('douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
    .gt('rating_count', 50)
    .gte('rating', 8.0)
    .or(`tags.cs.{${safeTopic}},title.ilike.%${topic}%,summary.ilike.%${topic}%`)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(40);

  const list = (data || []).filter((b: any) => b?.douban_id);
  if (list.length >= 12) return list;

  const { data: fallback } = await supabaseAdmin
    .from('books')
    .select('douban_id,title,author,rating,rating_count,cover_url,tags,summary,publisher,publish_date')
    .gt('rating_count', 100)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(40);
  return (fallback || []).filter((b: any) => b?.douban_id);
}

function buildFallbackQuote(book: any, topic: string, index: number) {
  const tags = Array.isArray(book?.tags) ? book.tags.slice(0, 2).join('、') : '';
  const title = String(book?.title || '');
  const variants = [
    `在《${title}》里，答案不会吵闹，只会慢慢靠近。`,
    `《${title}》像一盏小灯，把${topic}照得更清楚一点。`,
    `翻到《${title}》这一页，先把心放慢一点，再继续往前走。`,
    `《${title}》的温柔，是把复杂说得更明白。`,
  ];
  const base = variants[index % variants.length];
  return tags ? `${base.replace(/。$/, '')}（${tags}）` : base;
}

async function generateTrendingByLLM(topic: string, candidates: any[]) {
  const baseURL = (process.env.OPENAI_BASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.OPENAI_API_KEY || '';
  const model = process.env.OPENAI_MODEL || 'deepseek-v3-2-251201';

  const lines = toCandidateLines(candidates);
  const prompt = [
    `你是书境的编辑。今日的热点是：${topic}。`,
    `请先写一段“导读”（不超过60字，不要引号，不要Markdown），放在 cultural_analysis 字段里。`,
    `然后从候选书单中挑选3本最相关的书（必须使用候选里的 douban_id）。`,
    `对每本书：`,
    `- page_quote：写一句像“摘抄”的短句（不超过48字，不要引号，不要Markdown，不要提“建议/推荐/适合”），要贴合该书气质。`,
    `- connection_reason：写一句关联理由（30字内）。`,
    `请严格输出 JSON，不要输出 Markdown，不要解释文字，不要多余字段。`,
    `输出格式：{"cultural_analysis":"...","books":[{"douban_id":"...","page_quote":"...","connection_reason":"..."}]}`,
    `候选书单（每行：douban_id | 书名 | 作者 | 标签）：`,
    lines || '（候选为空）',
  ].join('\n');

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
    throw new Error(raw || `LLM error: ${res.status}`);
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON response');
  }

  const modelText = extractTextFromResponsesPayload(payload).trim();
  const match = modelText.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : modelText;

  let obj: any;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    throw new Error('模型输出不是有效 JSON');
  }

  return trendingSchema.parse(obj);
}

async function upsertDailyTrendingRow(input: {
  trend_date: string;
  topic: string;
  cultural_analysis: string;
  books_json: any[];
}) {
  const base = {
    trend_date: input.trend_date,
    topic: input.topic,
    topic_emoji: null,
    books_json: input.books_json,
  };

  const withAnalysis = { ...base, cultural_analysis: input.cultural_analysis };
  const r1 = await (supabaseAdmin.from('daily_trending') as any).upsert(withAnalysis, { onConflict: 'trend_date' });
  if (!r1?.error) return;

  const msg = String(r1.error?.message || '');
  if (msg.includes('cultural_analysis')) {
    const r2 = await (supabaseAdmin.from('daily_trending') as any).upsert(base, { onConflict: 'trend_date' });
    if (!r2?.error) return;
    throw r2.error;
  }

  throw r1.error;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const today = new Date().toISOString().split('T')[0];
  let synced = 0;
  let errorMessage: string | null = null;

  try {
    const topics = await getTrendingTopics();
    const topic = topics[0];

    const candidates = await getCandidateBooks(topic);
    let llm: z.infer<typeof trendingSchema> | null = null;
    try {
      llm = await generateTrendingByLLM(topic, candidates);
    } catch {
      llm = null;
    }

    const map = new Map<string, any>();
    (candidates as any[]).forEach((b: any) => {
      if (b?.douban_id) map.set(String(b.douban_id), b);
    });

    const validated: any[] = [];
    const used = new Set<string>();
    if (llm) {
      for (const b of llm.books.slice(0, 3)) {
        const id = String(b.douban_id || '').trim();
        if (!id || used.has(id)) continue;
        const bookRow = (map.get(id) as any) || null;
        if (!bookRow) continue;
        used.add(id);
        validated.push({
          ...bookRow,
          page_quote: String(b.page_quote || '').trim(),
          connection_reason: String(b.connection_reason || '').trim(),
        });
      }
    }

    for (const c of candidates as any[]) {
      if (validated.length >= 3) break;
      const id = String(c?.douban_id || '').trim();
      if (!id || used.has(id)) continue;
      used.add(id);
      validated.push({
        ...(c as any),
        page_quote: buildFallbackQuote(c, topic, validated.length),
        connection_reason: llm?.cultural_analysis ? `从${topic}看见更深一层。` : `先读一本，把心放稳。`,
      });
    }

    await upsertDailyTrendingRow({
      trend_date: today,
      topic,
      cultural_analysis: llm?.cultural_analysis || `把热闹拆开，看见里面的心事。`,
      books_json: validated,
    });

    synced = validated.length;

    await (supabaseAdmin.from('sync_logs') as any).insert({
      sync_type: 'trending',
      status: synced > 0 ? 'success' : 'partial',
      books_synced: synced,
      error_message: null,
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, topic, books: validated.length });
  } catch (e: any) {
    errorMessage = e?.message || 'Unknown error';
    await (supabaseAdmin.from('sync_logs') as any).insert({
      sync_type: 'trending',
      status: 'failed',
      books_synced: synced,
      error_message: errorMessage,
      synced_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
