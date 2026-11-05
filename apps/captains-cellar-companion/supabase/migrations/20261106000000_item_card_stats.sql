-- The community block on an item's card: how many members logged it, how many would reach for it
-- again, and which flavor families the people who rated it high (4-5) and low (1-2) noted most.
-- Only totals leave this function, never anyone's notes or individual ratings. Below three
-- different people, only the head count is returned, so no one's log can be read back through it
-- (the same threshold as item_family_aggregates).
create or replace function public.item_card_stats(p_item_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with l as (select * from logs where item_id = p_item_id),
  s as (
    select count(distinct user_id) as people, count(*) as n, avg(overall_rating) as avg_rating,
           count(*) filter (where would_buy_again) as yes, count(*) filter (where would_buy_again is not null) as answered
    from l
  ),
  fam as (select l.id, l.overall_rating as r, t.family from l join log_tags t on t.log_id = l.id group by l.id, l.overall_rating, t.family),
  loved as (select family, count(*) as c from fam where r >= 4 group by family order by c desc, family limit 3),
  low as (select family, count(*) as c from fam where r <= 2 group by family order by c desc, family limit 3)
  select case when s.people >= 3 then jsonb_build_object(
      'people', s.people, 'logs', s.n, 'enough', true,
      'avg_rating', round(s.avg_rating, 1),
      'would_again', case when s.answered > 0 then round(s.yes::numeric / s.answered, 2) end,
      'loved', coalesce((select jsonb_agg(family order by c desc, family) from loved), '[]'::jsonb),
      'low', coalesce((select jsonb_agg(family order by c desc, family) from low), '[]'::jsonb))
    else jsonb_build_object('people', s.people, 'enough', false) end
  from s
$$;
revoke all on function public.item_card_stats(uuid) from public;
grant execute on function public.item_card_stats(uuid) to authenticated;
