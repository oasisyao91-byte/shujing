const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickUserAgent() {
  const uas = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

async function fetchTagCloud() {
  const res = await fetchWithRetry('https://book.douban.com/tag/?view=cloud', {
    headers: {
      'User-Agent': pickUserAgent(),
      Referer: 'https://book.douban.com/tag/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const tags = [];
  $('.tagCol a').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });
  return Array.from(new Set(tags));
}

async function fetchWithRetry(url, init, maxAttempts = 3) {
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if ([418, 429, 500, 502, 503, 504].includes(res.status)) {
        last = new Error(`Request failed: ${res.status}`);
        await sleep(900 * attempt + Math.floor(Math.random() * 500));
        continue;
      }
      return res;
    } catch (e) {
      last = e;
      await sleep(900 * attempt + Math.floor(Math.random() * 500));
    }
  }
  throw last || new Error('Request failed');
}

function parsePubInfo(text) {
  const parts = String(text || '')
    .trim()
    .split(' / ')
    .map(s => s.trim())
    .filter(Boolean);
  const author = parts[0] || '';
  const publisher = parts.length >= 3 ? parts[parts.length - 3] : null;
  const publish_date = parts.length >= 2 ? parts[parts.length - 2] : null;
  return { author, publisher, publish_date };
}

function parseRatingCount(text) {
  const m = String(text || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function normalizeTitle(title) {
  return String(title || '').replace(/\s+/g, ' ').trim();
}

async function fetchTop250Page(start) {
  const res = await fetchWithRetry(`https://book.douban.com/top250?start=${start}`, {
    headers: {
      'User-Agent': pickUserAgent(),
      Referer: 'https://book.douban.com/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const books = [];

  $('.item').each((_, el) => {
    const $el = $(el);
    const title = normalizeTitle($el.find('h2 a').text() || $el.find('.pl2 a').text());
    const url = $el.find('h2 a').attr('href') || $el.find('.pl2 a').attr('href') || '';
    const douban_id = (url.match(/\/subject\/(\d+)\//) || [])[1] || '';
    const cover_url = $el.find('a.nbg img').attr('src') || $el.find('img').attr('src') || null;

    const pubText = $el.find('p.pl').text();
    const { author, publisher, publish_date } = parsePubInfo(pubText);

    const ratingStr = $el.find('.rating_nums').text().trim();
    const rating = ratingStr ? Number.parseFloat(ratingStr) : null;
    const ratingCountText = $el.find('.star .pl').text();
    const rating_count = parseRatingCount(ratingCountText);
    const summary = normalizeTitle($el.find('.inq').text()) || null;

    if (douban_id && title) {
      books.push({
        douban_id,
        title,
        author,
        publisher,
        publish_date,
        rating: Number.isFinite(rating) ? rating : null,
        rating_count: Number.isFinite(rating_count) ? rating_count : null,
        cover_url,
        summary,
        tags: [],
        isbn: null,
      });
    }
  });

  return books;
}

async function fetchTagPage(tag, start) {
  const url = `https://book.douban.com/tag/${encodeURIComponent(tag)}?start=${start}&type=T`;
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': pickUserAgent(),
      Referer: 'https://book.douban.com/tag/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const books = [];

  $('li.subject-item').each((_, el) => {
    const $el = $(el);
    const link = $el.find('h2 a').attr('href') || $el.find('a.nbg').attr('href') || '';
    const douban_id = (link.match(/\/subject\/(\d+)\//) || [])[1] || '';
    const title = normalizeTitle($el.find('h2 a').text());
    const cover_url = $el.find('a.nbg img').attr('src') || null;

    const pubText = $el.find('.pub').text();
    const { author, publisher, publish_date } = parsePubInfo(pubText);

    const ratingStr = $el.find('.rating_nums').text().trim();
    const rating = ratingStr ? Number.parseFloat(ratingStr) : null;
    const ratingCountText = $el.find('.pl').first().text();
    const rating_count = parseRatingCount(ratingCountText);
    const summary = normalizeTitle($el.find('p').last().text()) || null;

    if (douban_id && title) {
      books.push({
        douban_id,
        title,
        author,
        publisher,
        publish_date,
        rating: Number.isFinite(rating) ? rating : null,
        rating_count: Number.isFinite(rating_count) ? rating_count : null,
        cover_url,
        summary,
        tags: [tag],
        isbn: null,
      });
    }
  });

  return books;
}

function parseIsbnFromInfo(text) {
  const m = String(text || '').match(/ISBN:\s*([0-9Xx-]+)/);
  return m?.[1]?.replace(/-/g, '') || null;
}

async function fetchBookDetail(douban_id) {
  const url = `https://book.douban.com/subject/${douban_id}/`;
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': pickUserAgent(),
      Referer: 'https://book.douban.com/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);

  const tags = [];
  $('#db-tags-section a.tag').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  const infoText = $('#info').text().replace(/\s+/g, ' ').trim();
  const isbn = parseIsbnFromInfo(infoText);

  let summary = null;
  const intro = $('#link-report .intro').first().text().replace(/\s+/g, ' ').trim();
  if (intro) summary = intro;

  return { tags: tags.slice(0, 10), isbn, summary };
}

function parseArgs(argv) {
  const args = {
    pages: 10,
    tagPages: 5,
    details: 30,
    tags: null,
    discoverTags: false,
    tagLimit: 200,
    maxBooks: 10000,
    delayMs: 1100,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pages') args.pages = Number(argv[++i] || args.pages);
    else if (a === '--tag-pages') args.tagPages = Number(argv[++i] || args.tagPages);
    else if (a === '--details') args.details = Number(argv[++i] || args.details);
    else if (a === '--tags') args.tags = String(argv[++i] || '');
    else if (a === '--discover-tags') args.discoverTags = true;
    else if (a === '--tag-limit') args.tagLimit = Number(argv[++i] || args.tagLimit);
    else if (a === '--max-books') args.maxBooks = Number(argv[++i] || args.maxBooks);
    else if (a === '--delay-ms') args.delayMs = Number(argv[++i] || args.delayMs);
  }
  return args;
}

async function upsertBooks(supabaseAdmin, books) {
  const batchSize = 50;
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const { error } = await supabaseAdmin
      .from('books')
      .upsert(
        batch.map(b => ({
          douban_id: b.douban_id,
          title: b.title,
          author: b.author,
          publisher: b.publisher,
          publish_date: b.publish_date,
          rating: b.rating,
          rating_count: b.rating_count,
          cover_url: b.cover_url,
          summary: b.summary,
          tags: b.tags,
          isbn: b.isbn,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: 'douban_id' }
      );
    if (error) throw error;
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');
  loadEnvFile(path.join(root, '.env.local'));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const { pages, tagPages, details, tags, discoverTags, tagLimit, maxBooks, delayMs } = parseArgs(process.argv.slice(2));
  const defaultTags = [
    '小说','文学','中国文学','外国文学','经典','随笔','散文','诗歌','童话','漫画','绘本',
    '历史','传记','回忆录','人物传记','社会','社会学','政治','法律','哲学','宗教','心理学','教育',
    '经济学','商业','管理','金融','投资','营销','创业','科普','科技','互联网','人工智能',
    '科幻','推理','悬疑','奇幻','武侠','青春','爱情','旅行','摄影','艺术','设计','建筑',
    '医学','健康','养生','美食','生活','家庭','育儿','职场','自我提升','方法论'
  ];

  let tagList = tags ? tags.split(',').map(s => s.trim()).filter(Boolean) : defaultTags;
  if (discoverTags) {
    const discovered = await fetchTagCloud();
    if (discovered.length > 0) tagList = discovered;
  }
  tagList = tagList.slice(0, Math.max(0, tagLimit || 0));

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  const map = new Map();

  console.log(`Top250 pages: ${pages}`);
  for (let p = 0; p < pages; p++) {
    const start = p * 25;
    const list = await fetchTop250Page(start);
    for (const b of list) {
      map.set(b.douban_id, b);
    }
    if (map.size >= maxBooks) break;
    if (p < pages - 1) await sleep(delayMs + Math.floor(Math.random() * 700));
  }

  console.log(`Tag pages per tag: ${tagPages}, tags: ${tagList.join(', ')}`);
  for (const tag of tagList) {
    for (let p = 0; p < tagPages; p++) {
      const start = p * 20;
      const list = await fetchTagPage(tag, start);
      for (const b of list) {
        const existing = map.get(b.douban_id);
        if (existing) {
          const mergedTags = Array.from(new Set([...(existing.tags || []), ...(b.tags || [])]));
          map.set(b.douban_id, { ...existing, ...b, tags: mergedTags });
        } else {
          map.set(b.douban_id, b);
        }
      }
      if (map.size >= maxBooks) break;
      await sleep(delayMs + Math.floor(Math.random() * 900));
    }
    if (map.size >= maxBooks) break;
  }

  const books = Array.from(map.values());
  console.log(`Fetched unique books: ${books.length}`);

  await upsertBooks(supabaseAdmin, books);
  console.log(`Upserted books: ${books.length}`);

  const needDetail = books
    .filter(b => (!b.summary || (b.tags || []).length <= 1 || !b.isbn) && b.douban_id)
    .slice(0, details);

  console.log(`Enrich details: ${needDetail.length}`);
  for (let i = 0; i < needDetail.length; i++) {
    const b = needDetail[i];
    const detail = await fetchBookDetail(b.douban_id);
    if (detail) {
      const mergedTags = Array.from(new Set([...(b.tags || []), ...(detail.tags || [])])).slice(0, 10);
      await supabaseAdmin
        .from('books')
        .update({
          tags: mergedTags,
          isbn: detail.isbn || b.isbn || null,
          summary: detail.summary || b.summary || null,
          synced_at: new Date().toISOString(),
        })
        .eq('douban_id', b.douban_id);
    }
    await sleep(700 + Math.floor(Math.random() * 600));
  }

  console.log('Done');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
