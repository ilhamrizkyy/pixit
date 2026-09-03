-- Pixit — published icons.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New
-- query -> paste -> Run). It is idempotent, so re-running it is safe.
--
-- SHAPE NOTE. Icons are stored the way the repo writes them: an ART MAP of 11
-- rows plus a palette, not a 121-element array of hexes. Same data, but a row
-- is readable — you can see the icon in the table — and it maps through
-- `cellsFromArt`, which the registry already uses and which is already tested.
-- One representation for the repo and the database rather than two that have to
-- agree.

create table if not exists public.icons (
  -- Kebab-case, and IMMUTABLE once published (BACKLOG.md D). It is the export
  -- filename and the future package key, so it must never be recycled into a
  -- different drawing. Deleting is soft — set status, never DELETE the row.
  id          text primary key,
  name        text not null,
  category    text not null
    check (category in ('interface','media','arcade','system','communication','nature')),
  tags        text[] not null default '{}',

  -- 11 rows of 11 characters. Checked here as well as in the app, because a
  -- database that only enforces shape when the app remembers to is not
  -- enforcing shape.
  art         text[] not null
    check (array_length(art, 1) = 11),
  palette     jsonb  not null,

  author      text not null default 'ilham',
  status      text not null default 'published'
    check (status in ('published','pending','rejected')),
  created_at  timestamptz not null default now()
);

-- The gallery reads published icons in a stable order.
create index if not exists icons_published_idx
  on public.icons (status, created_at);

-- An id must never change once it exists. A primary key stops duplicates, not
-- edits, so this is the half a PK does not cover.
create or replace function public.icons_freeze_id() returns trigger as $$
begin
  if new.id is distinct from old.id then
    raise exception 'icon id is immutable (tried % -> %)', old.id, new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists icons_freeze_id on public.icons;
create trigger icons_freeze_id
  before update on public.icons
  for each row execute function public.icons_freeze_id();

-- ---------------------------------------------------------------------------
-- Row level security.
--
-- READ IS PUBLIC, WRITE IS NOT. The gallery is the public product, so anyone
-- may select a published icon. There is deliberately NO insert/update/delete
-- policy: without one, RLS denies those to every ordinary key. Writes therefore
-- only happen through the service-role key, which bypasses RLS and is
-- server-only — it must never be given to the browser.
-- ---------------------------------------------------------------------------
alter table public.icons enable row level security;

drop policy if exists "published icons are world readable" on public.icons;
create policy "published icons are world readable"
  on public.icons for select
  using (status = 'published');
