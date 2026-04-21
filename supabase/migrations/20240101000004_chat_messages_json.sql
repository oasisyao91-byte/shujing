alter table public.chat_messages
add column if not exists message_json jsonb;

