-- Curation: a curator reviews what people type in, then approves it into the catalog, merges it into
-- an existing entry (typos, duplicates), or rejects it. Curators see counts, never who logged what.

alter table public.users add column is_curator boolean not null default false;

-- Nobody can make themselves a curator: the app may write only these columns of its own row.
-- (Grant curators with SQL: update public.users set is_curator = true where id = '<user id>';)
revoke insert, update on public.users from anon, authenticated;
grant insert (id, birth_year, mode, quiz_seed, detailed_offer_seen) on public.users to authenticated;
grant update (mode, quiz_seed, detailed_offer_seen) on public.users to authenticated;

create function public.is_curator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_curator from users where id = auth.uid()), false)
$$;
grant execute on function public.is_curator() to authenticated;

-- A rejected entry leaves the catalog and the queue but stays with the person who added it.
alter table public.items drop constraint items_status_check;
alter table public.items add constraint items_status_check check (status in ('curated', 'user_added_pending', 'rejected'));
alter table public.makers drop constraint makers_status_check;
alter table public.makers add constraint makers_status_check check (status in ('curated', 'user_added_pending', 'rejected'));

create policy "curators read items" on public.items for select to authenticated using (public.is_curator());
create policy "curators read makers" on public.makers for select to authenticated using (public.is_curator());

-- Everything a curator changes goes through these functions, so each step is checked and atomic.

create function public.require_curator() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_curator() then
    raise exception 'Only curators can do that' using errcode = 'insufficient_privilege';
  end if;
end $$;

create function public.maker_key(name text) returns text
language sql immutable as $$ select lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) $$;

-- The queue: pending items and makers, with how often each is used. No user ids leave this function.
create function public.curator_queue()
returns table (kind text, id uuid, category text, brand text, name text, strength smallint, attributes jsonb,
               maker_id uuid, created_at timestamptz, log_count bigint, people bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_curator();
  return query
    select 'item'::text, i.id, i.category, i.brand, i.name, i.strength, i.attributes, i.maker_id, i.created_at,
           count(l.id), count(distinct l.user_id)
    from items i left join logs l on l.item_id = i.id
    where i.status = 'user_added_pending'
    group by i.id
  union all
    select 'maker'::text, m.id, null, m.name, m.name, null::smallint, '{}'::jsonb, m.id, m.created_at,
           (select count(*) from items i2 where i2.maker_id = m.id), null::bigint
    from makers m
    where m.status = 'user_added_pending'
  order by 9;
end $$;

-- Approve an item, publishing its (possibly corrected) maker and name. Refuses to create a duplicate.
create function public.approve_item(item_id uuid, new_brand text, new_name text, new_strength smallint)
returns void language plpgsql security definer set search_path = public as $$
declare
  it items%rowtype;
  mk uuid;
begin
  perform public.require_curator();
  select * into it from items where id = item_id for update;
  if not found then raise exception 'No such item'; end if;
  if exists (select 1 from items o where o.id <> item_id and o.status = 'curated' and o.category = it.category
             and public.maker_key(o.brand) = public.maker_key(new_brand) and public.maker_key(o.name) = public.maker_key(new_name)) then
    raise exception 'Already in the catalog: merge it instead' using errcode = 'unique_violation';
  end if;
  insert into makers (name, status) values (regexp_replace(btrim(new_brand), '\s+', ' ', 'g'), 'curated')
    on conflict (name_key) do update set status = 'curated'
    returning id into mk;
  update items set brand = (select name from makers where id = mk), name = regexp_replace(btrim(new_name), '\s+', ' ', 'g'),
                   strength = new_strength, maker_id = mk, status = 'curated'
    where id = item_id;
end $$;

-- Merge a pending item into a catalog item: every log, inventory row and pairing moves over.
create function public.merge_item(from_id uuid, into_id uuid)
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
  delete from items where id = from_id;
end $$;

create function public.reject_item(item_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_curator();
  update items set status = 'rejected' where id = item_id and status = 'user_added_pending';
end $$;

create function public.approve_maker(maker_id uuid, new_name text, new_country text, new_website text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_curator();
  if exists (select 1 from makers o where o.id <> maker_id and o.name_key = public.maker_key(new_name)) then
    raise exception 'Another maker already has that name: merge it instead' using errcode = 'unique_violation';
  end if;
  update makers set name = regexp_replace(btrim(new_name), '\s+', ' ', 'g'), country = nullif(btrim(new_country), ''),
                    website = nullif(btrim(new_website), ''), status = 'curated'
    where id = maker_id;
  update items set brand = (select name from makers where id = maker_id) where items.maker_id = approve_maker.maker_id;
end $$;

-- Merge a pending maker into a catalog maker: its items move over and take that maker's name.
create function public.merge_maker(from_id uuid, into_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_curator();
  if from_id = into_id then raise exception 'Cannot merge a maker into itself'; end if;
  if not exists (select 1 from makers where id = into_id and status = 'curated') then
    raise exception 'Merge into a catalog maker';
  end if;
  update items set maker_id = into_id, brand = (select name from makers where id = into_id) where maker_id = from_id;
  delete from makers where id = from_id;
end $$;

create function public.reject_maker(maker_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_curator();
  update makers set status = 'rejected' where id = maker_id and status = 'user_added_pending';
end $$;

revoke all on function public.require_curator(), public.curator_queue(), public.approve_item(uuid, text, text, smallint),
  public.merge_item(uuid, uuid), public.reject_item(uuid), public.approve_maker(uuid, text, text, text),
  public.merge_maker(uuid, uuid), public.reject_maker(uuid) from public;
grant execute on function public.curator_queue(), public.approve_item(uuid, text, text, smallint),
  public.merge_item(uuid, uuid), public.reject_item(uuid), public.approve_maker(uuid, text, text, text),
  public.merge_maker(uuid, uuid), public.reject_maker(uuid) to authenticated;
