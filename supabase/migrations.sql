-- Supabase migration: posts, comments, likes, notes

create extension if not exists "uuid-ossp";

-- posts
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- comments
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  author uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- likes
create table if not exists likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

-- notes metadata
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  author uuid references profiles(id) on delete cascade,
  file_path text not null,
  filename text not null,
  created_at timestamptz default now()
);
