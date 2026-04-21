create table public.chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  message_id text unique not null,
  role text check (role in ('user','assistant')) not null,
  content text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_chat_sessions_user on public.chat_sessions(user_id, updated_at desc);
create index if not exists idx_chat_messages_session on public.chat_messages(session_id, created_at asc);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "users_own_chat_sessions" on public.chat_sessions
  for all using (auth.uid() = user_id);

create policy "users_own_chat_messages" on public.chat_messages
  for all using (auth.uid() = user_id);

create trigger on_chat_sessions_updated
  before update on public.chat_sessions
  for each row execute function public.handle_updated_at();

