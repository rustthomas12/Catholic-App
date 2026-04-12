-- Parish messaging system
-- Allows users to send messages to parish admin inboxes.

create table if not exists parish_messages (
  id          uuid primary key default gen_random_uuid(),
  parish_id   uuid not null references parishes(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  subject     text,
  body        text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists parish_messages_parish_id_idx on parish_messages(parish_id, created_at desc);
create index if not exists parish_messages_sender_id_idx on parish_messages(sender_id);

-- RLS
alter table parish_messages enable row level security;

-- Senders can insert their own messages
create policy "Users can send messages"
  on parish_messages for insert
  with check (auth.uid() = sender_id);

-- Parish admins can read messages for their parish
create policy "Parish admins can read messages"
  on parish_messages for select
  using (
    exists (
      select 1 from parish_admins
      where parish_admins.parish_id = parish_messages.parish_id
        and parish_admins.user_id = auth.uid()
    )
  );

-- Parish admins can mark messages as read
create policy "Parish admins can update messages"
  on parish_messages for update
  using (
    exists (
      select 1 from parish_admins
      where parish_admins.parish_id = parish_messages.parish_id
        and parish_admins.user_id = auth.uid()
    )
  );

-- Senders can see their own sent messages
create policy "Senders can see their own messages"
  on parish_messages for select
  using (auth.uid() = sender_id);
