-- A personal collection of things that aren't consumed, starting with pipes. Private to its owner,
-- like logs. Generic on purpose: a branch says what kind of thing it holds and what fields it has.

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  category text not null,                            -- the branch it belongs to, e.g. pipe_tobacco
  kind text not null,                                -- what it is, e.g. pipe
  maker text,
  name text,                                         -- model or nickname
  attributes jsonb not null default '{}'::jsonb,     -- branch-defined: shape, material, finish, filter...
  dedicated_item_id uuid references public.items (id) on delete set null,
  notes text,
  acquired_on date,
  created_at timestamptz not null default now()
);
create index collection_items_user_idx on public.collection_items (user_id, category);

alter table public.collection_items enable row level security;
create policy "own collection" on public.collection_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A curator's merge now also moves a pipe dedicated to the merged-away blend onto the catalog blend.
create or replace function public.merge_item(from_id uuid, into_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_curator();
  if from_id = into_id then raise exception 'Cannot merge an item into itself'; end if;
  if not exists (select 1 from items a join items b on b.id = into_id
                 where a.id = from_id and b.status = 'curated' and a.category = b.category) then
    raise exception 'Merge into a catalog item of the same kind';
  end if;
  update logs set item_id = into_id where item_id = from_id;
  update inventory set item_id = into_id where item_id = from_id;
  update pairings set item_id = into_id where item_id = from_id;
  update pairings set paired_item_id = into_id where paired_item_id = from_id;
  update collection_items set dedicated_item_id = into_id where dedicated_item_id = from_id;
  delete from items where id = from_id;
end $$;
