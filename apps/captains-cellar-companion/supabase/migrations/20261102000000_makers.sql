-- Makers: the catalog is organized by manufacturer, not by the store a listing came from.
-- One row per maker (a maker can make cigars and pipe tobacco alike); every item points at one.

create table public.makers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  -- "Tabanero", "tabanero" and "Tabanero  " are the same maker.
  name_key text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored unique,
  country text,
  website text,
  notes text,
  status text not null default 'user_added_pending' check (status in ('curated', 'user_added_pending')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.items add column maker_id uuid references public.makers (id);
create index items_maker_idx on public.items (maker_id);

-- Backfill: one maker per distinct brand already in the catalog. A maker is curated when any of its
-- items is; otherwise it stays pending and visible to whoever added it.
insert into public.makers (name, status, created_by)
select min(regexp_replace(btrim(brand), '\s+', ' ', 'g')),
       case when bool_or(status = 'curated') then 'curated' else 'user_added_pending' end,
       (array_agg(created_by) filter (where created_by is not null))[1]
from public.items
group by lower(regexp_replace(btrim(brand), '\s+', ' ', 'g'))
on conflict (name_key) do nothing;

update public.items i set maker_id = m.id
from public.makers m
where i.maker_id is null and m.name_key = lower(regexp_replace(btrim(i.brand), '\s+', ' ', 'g'));

alter table public.makers enable row level security;

-- Same rule as items: curated makers are public, a typed-in one is visible to whoever added it.
create policy "read makers" on public.makers for select to anon, authenticated
  using (status = 'curated' or created_by = auth.uid());
create policy "submit makers" on public.makers for insert to authenticated
  with check (status = 'user_added_pending' and created_by = auth.uid());
