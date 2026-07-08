-- supabase/notes_migration.sql

-- Notes table for PDF uploads
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  author uuid references profiles(id) on delete cascade,
  course text not null,          -- Ders adı
  section text not null,         -- Bölüm
  class integer not null,        -- Sınıf (1..4)
  semester text not null,        -- Dönem
  title text not null,           -- Not başlığı
  description text,              -- Kısa açıklama
  filename text not null,
  file_path text not null,       -- path in storage
  downloads integer default 0,
  views integer default 0,
  created_at timestamptz default now()
);
create index if not exists notes_created_idx on notes(created_at desc);
create index if not exists notes_course_idx on notes(course);
create index if not exists notes_section_idx on notes(section);
create index if not exists notes_class_idx on notes(class);
create index if not exists notes_semester_idx on notes(semester);

-- RLS
alter table notes enable row level security;

create policy "notes_select" on notes for select using (true);
create policy "notes_insert" on notes for insert with check (auth.role() = 'authenticated' or auth.uid() is not null);
create policy "notes_update_owner" on notes for update using (author = auth.uid());
create policy "notes_delete_owner" on notes for delete using (author = auth.uid());

-- Functions to increment views and downloads (security definer)
create or replace function public.increment_note_views(note uuid)
returns void as $$
begin
  update notes set views = coalesce(views,0) + 1 where id = note;
end;
$$ language plpgsql security definer;

create or replace function public.increment_note_downloads(note uuid)
returns void as $$
begin
  update notes set downloads = coalesce(downloads,0) + 1 where id = note;
end;
$$ language plpgsql security definer;

-- Grant execute on functions to authenticated role (if needed)
-- NOTE: Supabase typically maps authenticated role to "authenticated"; adjust if your project differs
grant execute on function public.increment_note_views(uuid) to authenticated;
grant execute on function public.increment_note_downloads(uuid) to authenticated;

-- End notes migration
