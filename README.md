# 书境 BookMind

一个基于 Supabase + Next.js（App Router）+ Vercel AI SDK 的智能阅读伴侣：阅读性格测试、对话寻书、精准搜索、书籍详情与书单管理、今日文化热点。

## 本地开发

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`（若端口被占用，Next 会自动切换到 3001/3002）。

## 环境变量

复制示例文件并填入自己的配置：

```bash
cp .env.local.example .env.local
```

必要项（本地与部署都需要）：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `CRON_SECRET`

## 数据库初始化（Supabase）

将 `supabase/migrations/` 下的 SQL 按顺序在 Supabase SQL Editor 中执行（或使用你自己的迁移工具）。

## 同步豆瓣数据

开发调试页：`/dev/sync`

单独脚本同步（会写入 `books` 表）：

```bash
node scripts/douban-sync.cjs --pages 10 --discover-tags --tag-limit 80 --tag-pages 2 --max-books 2200 --details 0 --delay-ms 900
```

## Cron（Vercel）

本项目使用 `vercel.json` 配置两个定时任务：

- `/api/cron/douban-books`：每天凌晨 2 点
- `/api/cron/trending`：每天早上 8 点

生产环境下 Cron 路由会校验请求来源（Vercel Cron Header 或 `Authorization: Bearer <CRON_SECRET>`）。

