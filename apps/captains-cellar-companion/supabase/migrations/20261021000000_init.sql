-- Captain's Cellar Companion: Phase 1 schema.
-- Table names are category-agnostic; cigar specifics live in items.attributes, logs.details, and the tag vocabulary.

-- ── Users ────────────────────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  mode text not null default 'simple' check (mode in ('simple', 'detailed')),
  birth_year int not null check (birth_year between 1900 and 2100),
  quiz_seed jsonb,                                   -- onboarding quiz answers (cold-start seed)
  detailed_offer_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- 21+ gate enforced in the database, not just the UI. Birth year only, so this is the
-- generous bound; the signup form also requires an explicit 21+ attestation.
create function public.enforce_minimum_age() returns trigger
language plpgsql as $$
begin
  if extract(year from now())::int - new.birth_year < 21 then
    raise exception 'Users must be 21 or older' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger users_minimum_age
  before insert or update of birth_year on public.users
  for each row execute function public.enforce_minimum_age();

-- ── Catalog ──────────────────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  brand text not null,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  strength smallint check (strength between 1 and 5),
  status text not null default 'user_added_pending' check (status in ('curated', 'user_added_pending')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index items_category_idx on public.items (category, status);

-- Curated flavor tags for an item (feeds the recommender before anyone has logged it).
create table public.item_tags (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.items (id) on delete cascade,
  family text not null,
  descriptor text,
  weight numeric(3, 2) not null default 1 check (weight between 0 and 1)
);
create unique index item_tags_unique on public.item_tags (item_id, family, coalesce(descriptor, ''));

-- ── Journal ──────────────────────────────────────────────────────────────
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  item_id uuid not null references public.items (id),
  logged_at timestamptz not null default now(),
  overall_rating smallint not null check (overall_rating between 1 and 5),
  would_buy_again boolean,
  notes text,
  details jsonb not null default '{}'::jsonb          -- branch-defined extras (draw, burn, retrohale…)
);
create index logs_user_idx on public.logs (user_id, logged_at desc);
create index logs_item_idx on public.logs (item_id);

create table public.log_tags (
  id bigint generated always as identity primary key,
  log_id uuid not null references public.logs (id) on delete cascade,
  descriptor text,                                   -- null = family-level tag (simple mode)
  family text not null,
  third smallint check (third in (1, 2, 3)),         -- null = whole session
  intensity smallint not null default 2 check (intensity between 1 and 3)
);
create index log_tags_log_idx on public.log_tags (log_id);

-- Derived: rebuilt by the engine after every log. A cache, never the source of truth.
create table public.taste_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  profile jsonb not null,
  log_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- ── Tables only, no UI or logic yet ──────────────────────────────────────
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  item_id uuid not null references public.items (id),
  quantity int not null default 1 check (quantity >= 0),
  box_date date,
  humidor_name text,
  cost numeric(10, 2),
  created_at timestamptz not null default now()
);

create table public.pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  item_id uuid not null references public.items (id),
  paired_item_id uuid references public.items (id),  -- when the partner is also in the catalog
  paired_category text,
  paired_label text,                                 -- free text when it isn't
  rating smallint check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

-- ── Row-level security ───────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.item_tags enable row level security;
alter table public.logs enable row level security;
alter table public.log_tags enable row level security;
alter table public.taste_profiles enable row level security;
alter table public.inventory enable row level security;
alter table public.pairings enable row level security;

create policy "own user row" on public.users for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Curated items are readable by everyone; pending submissions only by whoever added them.
create policy "read items" on public.items for select to anon, authenticated
  using (status = 'curated' or created_by = auth.uid());
create policy "submit items" on public.items for insert to authenticated
  with check (status = 'user_added_pending' and created_by = auth.uid());

create policy "read item tags" on public.item_tags for select to anon, authenticated using (true);

create policy "own logs" on public.logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own log tags" on public.log_tags for all to authenticated
  using (exists (select 1 from public.logs l where l.id = log_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.logs l where l.id = log_id and l.user_id = auth.uid()));

create policy "own profile" on public.taste_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own inventory" on public.inventory for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own pairings" on public.pairings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Community signal for the recommender ─────────────────────────────────
-- Per item and family: the share of logs that noted that family, scaled by intensity (2 = 1.0).
-- Mirrors aggregateCommunityTags() in src/core/recommend.ts. Only items logged by at least
-- three different people are returned, so no one's private log can be read back through it.
create function public.item_family_aggregates()
returns table (item_id uuid, family text, weight numeric)
language sql stable security definer set search_path = public as $$
  with per_log as (
    select l.id as log_id, l.item_id, t.family, max(t.intensity) as intensity
    from logs l join log_tags t on t.log_id = l.id
    group by l.id, l.item_id, t.family
  ),
  item_totals as (
    select item_id, count(*) as n_logs, count(distinct user_id) as n_users
    from logs group by item_id
  )
  select p.item_id, p.family, round(sum(p.intensity / 2.0) / t.n_logs, 4)
  from per_log p join item_totals t using (item_id)
  where t.n_users >= 3
  group by p.item_id, p.family, t.n_logs
$$;
revoke all on function public.item_family_aggregates() from public;
grant execute on function public.item_family_aggregates() to authenticated;
