import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return (
    h === 'img1.doubanio.com' ||
    h === 'img2.doubanio.com' ||
    h === 'img3.doubanio.com' ||
    h === 'img9.doubanio.com' ||
    h === 'covers.openlibrary.org'
  );
}

function pickUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function fetchWithRetry(url: string, maxAttempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': pickUserAgent(),
          Referer: 'https://book.douban.com/',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        cache: 'no-store',
      });

      if (res.ok) return res;
      if ([418, 429, 500, 502, 503, 504].includes(res.status)) {
        await new Promise(r => setTimeout(r, 600 * attempt + Math.floor(Math.random() * 400)));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, 600 * attempt + Math.floor(Math.random() * 400)));
    }
  }
  throw lastError ?? new Error('Request failed');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || '';
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(target.protocol) || !isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const res = await fetchWithRetry(target.toString(), 3);
  if (!res.ok) {
    return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 });
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await res.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
