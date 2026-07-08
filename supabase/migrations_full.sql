-- supabase/migrations_full.sql

-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- profiles (if not exists)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  username text unique,
  email text unique,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- posts
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create index if not exists posts_created_at_idx on posts(created_at desc);

-- comments
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  author uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create index if not exists comments_post_idx on comments(post_id);

-- likes
create table if not exists likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
create index if not exists likes_post_idx on likes(post_id);

-- follows (who user follows)
create table if not exists follows (
  id uuid primary key default uuid_generate_v4(),
  follower uuid references profiles(id) on delete cascade, -- who follows
  following uuid references profiles(id) on delete cascade, -- who is followed
  created_at timestamptz default now(),
  unique(follower, following)
);

-- conversations (for messaging)
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  title text,
  is_group boolean default false,
  created_at timestamptz default now()
);

create table if not exists conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key(conversation_id, user_id)
);

-- messages
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender uuid references profiles(id) on delete cascade,
  content text,
  post_shared uuid references posts(id), -- optional shared post preview
  created_at timestamptz default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at desc);

-- shares (history of sharing posts to users via messages)
create table if not exists shares (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  sender uuid references profiles(id) on delete cascade,
  recipient uuid references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists shares_recipient_idx on shares(recipient);

-- notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade, -- who receives
  actor_id uuid references profiles(id), -- who triggered the notification
  type text not null, -- 'like','comment','share','message'
  post_id uuid references posts(id),
  comment_id uuid references comments(id),
  message_id uuid references messages(id),
  metadata jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

-- Row Level Security (RLS) and policies

-- Enable RLS for sensitive tables
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table follows enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table shares enable row level security;
alter table notifications enable row level security;

-- helper: allow authenticated users via auth.uid() to match profiles.id
-- Note: Supabase uses auth.uid() as the user's uuid when using GoTrue. We use current_setting('request.jwt.claim.sub') as fallback for Postgres-only environments.

-- Policy: posts - allow anyone to select; allow insert for authenticated users; allow delete/update only by author
create policy "posts_select" on posts for select using (true);
create policy "posts_insert" on posts for insert with check (
  auth.role() = 'authenticated' or auth.uid() is not null
);
create policy "posts_update_owner" on posts for update using (author = auth.uid());
create policy "posts_delete_owner" on posts for delete using (author = auth.uid());

-- comments policies
create policy "comments_select" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (
  auth.role() = 'authenticated' or auth.uid() is not null
);
create policy "comments_update_owner" on comments for update using (author = auth.uid());
create policy "comments_delete_owner" on comments for delete using (author = auth.uid());

-- likes policies
create policy "likes_select" on likes for select using (true);
create policy "likes_insert" on likes for insert with check (
  auth.role() = 'authenticated' or auth.uid() is not null
);
create policy "likes_delete_owner" on likes for delete using (user_id = auth.uid());

-- follows policies
create policy "follows_select" on follows for select using (follower = auth.uid() or following = auth.uid());
create policy "follows_insert" on follows for insert with check (
  auth.role() = 'authenticated' or auth.uid() is not null
);
create policy "follows_delete_owner" on follows for delete using (follower = auth.uid());

-- conversations & members
create policy "conversations_select" on conversations for select using (exists (select 1 from conversation_members cm where cm.conversation_id = conversations.id and cm.user_id = auth.uid()));
create policy "conversations_insert" on conversations for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "conversation_members_manage" on conversation_members for insert using (user_id = auth.uid());
create policy "conversation_members_select" on conversation_members for select using (user_id = auth.uid());

-- messages
create policy "messages_select" on messages for select using (
  exists (select 1 from conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
);
create policy "messages_insert" on messages for insert with check (
  auth.role() = 'authenticated' or auth.uid() is not null
);
create policy "messages_delete_owner" on messages for delete using (sender = auth.uid());

-- shares
create policy "shares_select" on shares for select using (recipient = auth.uid() or sender = auth.uid());
create policy "shares_insert" on shares for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);

-- notifications
create policy "notifications_select" on notifications for select using (user_id = auth.uid());
create policy "notifications_insert" on notifications for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "notifications_update_owner" on notifications for update using (user_id = auth.uid());
create policy "notifications_delete_owner" on notifications for delete using (user_id = auth.uid());

-- Triggers: create notification entries on likes, comments, shares, messages

-- function to create notification
create or replace function public.notify_on_event()
returns trigger as $$
begin
  if (tg_table_name = 'likes' and tg_op = 'INSERT') then
    insert into notifications (user_id, actor_id, type, post_id, created_at)
    values ((select p.author from posts p where p.id = NEW.post_id), NEW.user_id, 'like', NEW.post_id, now());
    return NEW;
  elsif (tg_table_name = 'comments' and tg_op = 'INSERT') then
    insert into notifications (user_id, actor_id, type, post_id, comment_id, created_at)
    values ((select p.author from posts p where p.id = NEW.post_id), NEW.author, 'comment', NEW.post_id, NEW.id, now());
    return NEW;
  elsif (tg_table_name = 'shares' and tg_op = 'INSERT') then
    insert into notifications (user_id, actor_id, type, post_id, created_at)
    values (NEW.recipient, NEW.sender, 'share', NEW.post_id, now());
    return NEW;
  elsif (tg_table_name = 'messages' and tg_op = 'INSERT') then
    -- notify other members in conversation (exclude sender)
    insert into notifications (user_id, actor_id, type, message_id, created_at)
    select cm.user_id, NEW.sender, 'message', NEW.id, now()
    from conversation_members cm
    where cm.conversation_id = NEW.conversation_id and cm.user_id <> NEW.sender;
    return NEW;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- attach trigger to likes, comments, shares, messages
create trigger trg_notify_likes after insert on likes for each row execute function public.notify_on_event();
create trigger trg_notify_comments after insert on comments for each row execute function public.notify_on_event();
create trigger trg_notify_shares after insert on shares for each row execute function public.notify_on_event();
create trigger trg_notify_messages after insert on messages for each row execute function public.notify_on_event();

-- End of migrations
