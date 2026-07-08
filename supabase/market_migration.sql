-- supabase/market_migration.sql

-- Market (listings) tables for marketplace
create table if not exists market_listings (
  id uuid primary key default uuid_generate_v4(),
  author uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null,
  category text not null,
  city text,
  university text,
  contact_in_app boolean default true,
  condition text,
  status text default 'active', -- active, sold, rented
  created_at timestamptz default now()
);
create index if not exists market_listings_created_idx on market_listings(created_at desc);
create index if not exists market_listings_category_idx on market_listings(category);
create index if not exists market_listings_city_idx on market_listings(city);
create index if not exists market_listings_university_idx on market_listings(university);

create table if not exists market_photos (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references market_listings(id) on delete cascade,
  file_path text not null,
  ordinal integer default 0
);
create index if not exists market_photos_listing_idx on market_photos(listing_id, ordinal);

create table if not exists market_favorites (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references market_listings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(listing_id, user_id)
);
create index if not exists market_favorites_user_idx on market_favorites(user_id);

-- Enable RLS
alter table market_listings enable row level security;
alter table market_photos enable row level security;
alter table market_favorites enable row level security;

-- Policies
create policy "market_listings_select" on market_listings for select using (true);
create policy "market_listings_insert" on market_listings for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "market_listings_update_owner" on market_listings for update using (author = auth.uid());
create policy "market_listings_delete_owner" on market_listings for delete using (author = auth.uid());

create policy "market_photos_select" on market_photos for select using (exists (select 1 from market_listings ml where ml.id = market_photos.listing_id and ml.status <> 'deleted'));
create policy "market_photos_insert" on market_photos for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "market_photos_delete_owner" on market_photos for delete using (exists (select 1 from market_listings ml where ml.id = market_photos.listing_id and ml.author = auth.uid()));

create policy "market_favorites_select" on market_favorites for select using (user_id = auth.uid() or exists (select 1 from market_listings ml where ml.id = market_favorites.listing_id and ml.author = auth.uid()));
create policy "market_favorites_insert" on market_favorites for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "market_favorites_delete_owner" on market_favorites for delete using (user_id = auth.uid());

-- Optional: notification trigger for favorites and listings
create or replace function public.notify_market_events()
returns trigger as $$
begin
  if (tg_table_name = 'market_favorites' and tg_op = 'INSERT') then
    insert into notifications (user_id, actor_id, type, post_id, metadata, created_at)
    values ((select ml.author from market_listings ml where ml.id = NEW.listing_id), NEW.user_id, 'favorite', NEW.listing_id, json_build_object('listing_id', NEW.listing_id), now());
    return NEW;
  elsif (tg_table_name = 'market_listings' and tg_op = 'INSERT') then
    -- optional: broadcast new listing notifications to followers or local feed handled client-side
    return NEW;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_notify_market_favorite after insert on market_favorites for each row execute function public.notify_market_events();
create trigger trg_notify_market_listings after insert on market_listings for each row execute function public.notify_market_events();

-- End market migration
