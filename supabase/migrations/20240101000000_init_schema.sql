-- 启用扩展
create extension if not exists "uuid-ossp";

-- 用户画像表（每用户一行，关联 auth.users）
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  persona_type text,           -- 性格类型代码，如 'IFNW'
  persona_name text,           -- 性格名称，如 '月光漫游者'
  persona_tags text[] default '{}',  -- 标签数组
  persona_emoji text,          -- 配图 emoji
  persona_desc text,           -- 性格描述文案
  llm_memory text default '',  -- LLM 对用户的滚动记忆摘要
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 书籍表（从豆瓣同步 + 缓存）
create table public.books (
  id uuid default uuid_generate_v4() primary key,
  douban_id text unique,
  title text not null,
  author text,
  publisher text,
  publish_date text,
  rating numeric(3,1),         -- 豆瓣评分，如 9.2
  rating_count integer,
  cover_url text,
  summary text,
  tags text[] default '{}',
  isbn text,
  synced_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 用户书单表
create table public.reading_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  status text check (status in ('want_read','reading','finished')) not null,
  note text default '',        -- 用户想法/备注
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, book_id)
);

-- 推荐缓存表（按用户 + 日期缓存）
create table public.recommendation_cache (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  cache_date date not null default current_date,
  books_json jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(user_id, cache_date)
);

-- 每日热点表
create table public.daily_trending (
  id uuid default uuid_generate_v4() primary key,
  trend_date date not null unique default current_date,
  topic text not null,
  topic_emoji text,
  books_json jsonb not null default '[]',
  created_at timestamptz default now()
);

-- RLS 策略（Row Level Security）
alter table public.user_profiles enable row level security;
alter table public.reading_history enable row level security;
alter table public.recommendation_cache enable row level security;

-- user_profiles：只能读写自己的数据
create policy "users_own_profile" on public.user_profiles
  for all using (auth.uid() = id);

-- reading_history：只能读写自己的数据
create policy "users_own_history" on public.reading_history
  for all using (auth.uid() = user_id);

-- recommendation_cache：只能读写自己的数据
create policy "users_own_cache" on public.recommendation_cache
  for all using (auth.uid() = user_id);

-- books 表公开只读（无需登录可查）
alter table public.books enable row level security;
create policy "books_public_read" on public.books
  for select using (true);

-- 自动更新 updated_at 的触发器
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_user_profiles_updated
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

create trigger on_reading_history_updated
  before update on public.reading_history
  for each row execute function public.handle_updated_at();

-- 新用户注册时自动创建 user_profiles 行
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();