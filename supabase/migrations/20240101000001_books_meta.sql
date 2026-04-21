-- 同步日志表（记录每次 cron 执行情况）
create table public.sync_logs (
  id uuid default uuid_generate_v4() primary key,
  sync_type text not null,       -- 'douban_books' | 'trending'
  status text not null,          -- 'success' | 'failed' | 'partial'
  books_synced integer default 0,
  error_message text,
  synced_at timestamptz default now()
);

-- books 表补充索引（加速搜索）
create index if not exists idx_books_title on public.books using gin(to_tsvector('simple', title));
create index if not exists idx_books_rating on public.books(rating desc nulls last);
create index if not exists idx_books_douban_id on public.books(douban_id);
create index if not exists idx_books_synced_at on public.books(synced_at desc);

-- sync_logs 公开只读（供管理查询）
alter table public.sync_logs enable row level security;
create policy "sync_logs_service_only" on public.sync_logs
  for all using (false);  -- 只允许 service role 访问