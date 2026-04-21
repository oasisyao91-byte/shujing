import { NextResponse } from 'next/server';
import { syncDoubanBooks } from '@/lib/douban/sync';

export async function GET(request: Request) {
  // 1. 验证 Vercel Cron 请求（防止外部滥用），开发环境下跳过
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 2. 调用同步服务
  try {
    const result = await syncDoubanBooks();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
