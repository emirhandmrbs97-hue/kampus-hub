-- supabase/profile_migration.sql

-- Extend profiles with more fields for social features
alter table profiles
  add column if not exists cover_url text,
  add column if not exists department text,
  add column if not exists university text,
  add column if not exists class integer,
  add column if not exists phone text,
  add column if not exists is_private boolean default false,
  add column if not exists joined_at timestamptz default coalesce(created_at, now());

-- follow_requests for private accounts (follower requests)
create table if not exists follow_requests (
  id uuid primary key default uuid_generate_v4(),
  requester uuid references profiles(id) on delete cascade,
  target uuid references profiles(id) on delete cascade,
  status text default 'pending', -- pending, accepted, rejected
  created_at timestamptz default now()
);
create unique index if not exists follow_requests_unique on follow_requests(requester, target);

-- stories table
create table if not exists stories (
  id uuid primary key default uuid_generate_v4(),
  author uuid references profiles(id) on delete cascade,
  file_path text not null,
  media_type text not null, -- 'image' or 'video'
  caption text,
  created_at timestamptz default now(),
  expire_at timestamptz default (now() + interval '24 hours')
);
create index if not exists stories_author_idx on stories(author);
create index if not exists stories_expire_idx on stories(expire_at);

-- story views
create table if not exists story_views (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid references stories(id) on delete cascade,
  viewer uuid references profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  unique(story_id, viewer)
);
create index if not exists story_views_story_idx on story_views(story_id);

-- story replies (message / emoji replies stored as messages linked to story)
create table if not exists story_replies (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid references stories(id) on delete cascade,
  sender uuid references profiles(id) on delete cascade,
  message text,
  emoji text,
  created_at timestamptz default now()
);
create index if not exists story_replies_story_idx on story_replies(story_id);

-- saved posts (user bookmarks) - saved posts across app posts (and optionally market listings)
create table if not exists saved_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  item_type text not null, -- 'post','listing','note'
  item_id uuid not null,
  created_at timestamptz default now(),
  unique(user_id, item_type, item_id)
);
create index if not exists saved_items_user_idx on saved_items(user_id);

-- notifications for follow events are already set in notify_on_event; ensure triggers or notifications created when follow inserted
-- Add trigger for follows table to create notifications (if not exists)
create or replace function public.notify_on_follow()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into notifications (user_id, actor_id, type, metadata, created_at)
    values (NEW.following, NEW.follower, 'follow', json_build_object('follower', NEW.follower), now());
    return NEW;
  elsif (tg_op = 'DELETE') then
    -- optional: remove follow notifications or leave history
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- attach trigger
drop trigger if exists trg_notify_follow on follows;
create trigger trg_notify_follow after insert on follows for each row execute function public.notify_on_follow();

-- RPC to clean expired stories; can be invoked by scheduled job or edge function
authorization: security definer
create or replace function public.cleanup_expired_stories()
returns void as $$
begin
  delete from stories where expire_at < now();
end;
$$ language plpgsql security definer;

grant execute on function public.cleanup_expired_stories() to authenticated;

-- RLS policies: ensure only owners can modify their stories, follow_requests managed by requester/target appropriately
alter table follow_requests enable row level security;
create policy "follow_requests_select" on follow_requests for select using (requester = auth.uid() or target = auth.uid());
create policy "follow_requests_insert" on follow_requests for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "follow_requests_update_owner" on follow_requests for update using (target = auth.uid() or requester = auth.uid());
create policy "follow_requests_delete_owner" on follow_requests for delete using (requester = auth.uid() or target = auth.uid());

alter table stories enable row level security;
create policy "stories_select" on stories for select using (true);
create policy "stories_insert" on stories for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "stories_delete_owner" on stories for delete using (author = auth.uid());

alter table story_views enable row level security;
create policy "story_views_insert" on story_views for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "story_views_select" on story_views for select using (exists (select 1 from stories s where s.id = story_views.story_id and s.author = auth.uid()) or true);

alter table story_replies enable row level security;
create policy "story_replies_insert" on story_replies for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "story_replies_select" on story_replies for select using (exists (select 1 from stories s where s.id = story_replies.story_id and s.author = auth.uid()) or true);

alter table saved_items enable row level security;
create policy "saved_items_insert" on saved_items for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "saved_items_select" on saved_items for select using (user_id = auth.uid());
create policy "saved_items_delete_owner" on saved_items for delete using (user_id = auth.uid());

-- End profile migration
