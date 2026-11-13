-- Guests (anon) may browse the published recipe catalog. Pantry, profiles, aliases, writes and
-- provider searches stay sign-in only.
grant select on public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_dietary_tags,
  public.ingredients, public.cuisines, public.dietary_tags, public.substitutes to anon;

-- get_recommendations reads the caller's pantry; with RLS and no anon policy this grant exposes zero rows.
grant select on public.pantry_items to anon;

create policy "published_recipes_read_anon" on public.recipes
  for select to anon using (is_published);
create policy "recipe_ingredients_read_published_anon" on public.recipe_ingredients
  for select to anon using (exists (select 1 from public.recipes r where r.id = recipe_id and r.is_published));
create policy "recipe_steps_read_published_anon" on public.recipe_steps
  for select to anon using (exists (select 1 from public.recipes r where r.id = recipe_id and r.is_published));
create policy "recipe_tags_read_published_anon" on public.recipe_dietary_tags
  for select to anon using (exists (select 1 from public.recipes r where r.id = recipe_id and r.is_published));
create policy "ingredients_read_anon" on public.ingredients for select to anon using (true);
create policy "cuisines_read_anon" on public.cuisines for select to anon using (true);
create policy "dietary_tags_read_anon" on public.dietary_tags for select to anon using (true);
create policy "substitutes_read_anon" on public.substitutes for select to anon using (true);

-- Same function as the initial schema with one change: a caller with no session has no pantry,
-- so the "owns at least one ingredient" filter is skipped and the catalog is listed unranked
-- (score 0, quickest first). Signed-in ranking is unchanged.
create or replace function public.get_recommendations(
  p_cuisine_id bigint default null,
  p_max_time integer default null,
  p_diet_tag_id bigint default null,
  p_almost_only boolean default false,
  p_min_score numeric default null,
  p_warning_days integer default 3,
  p_page integer default 1,
  p_limit integer default 20
)
returns table (
  recipe_id bigint,
  title text,
  cuisine text,
  cooking_time_min integer,
  image_url text,
  dietary_tags text[],
  match_score numeric,
  required_count integer,
  have_count integer,
  missing_count integer,
  expiring_count integer,
  almost_achievable boolean,
  missing_ingredients jsonb,
  total_items bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with user_pantry as (
    select pi.ingredient_id, pi.expiry_date
    from public.pantry_items pi
    where pi.user_id = (select auth.uid())
  ),
  scored as (
    select
      r.id as rid,
      r.title as rtitle,
      c.name as cuisine_name,
      r.cooking_time_min as cook_time,
      r.image_url as recipe_image,
      count(ri.ingredient_id)::integer as req_count,
      count(up.ingredient_id)::integer as owned_count,
      count(ri.ingredient_id)::integer - count(up.ingredient_id)::integer as miss_count,
      count(*) filter (
        where up.expiry_date >= current_date
          and up.expiry_date <= current_date + make_interval(days => greatest(0, least(p_warning_days, 30)))
      )::integer as expiring,
      round(100.0 * count(up.ingredient_id)::numeric / nullif(count(ri.ingredient_id), 0), 1) as score,
      coalesce(array(
        select distinct dt.name
        from public.recipe_dietary_tags rdt
        join public.dietary_tags dt on dt.id = rdt.tag_id
        where rdt.recipe_id = r.id
        order by dt.name
      ), array[]::text[]) as tags
    from public.recipes r
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    left join public.cuisines c on c.id = r.cuisine_id
    left join user_pantry up on up.ingredient_id = ri.ingredient_id
    where r.is_published
      and (p_cuisine_id is null or r.cuisine_id = p_cuisine_id)
      and (p_max_time is null or r.cooking_time_min <= p_max_time)
      and (p_diet_tag_id is null or exists (
        select 1 from public.recipe_dietary_tags x
        where x.recipe_id = r.id and x.tag_id = p_diet_tag_id
      ))
    group by r.id, r.title, c.name, r.cooking_time_min, r.image_url
  ),
  filtered as (
    select s.* from scored s
    where (s.owned_count > 0 or (select auth.uid()) is null)
      and (not p_almost_only or s.miss_count in (1, 2))
      and (p_min_score is null or s.score >= p_min_score)
  ),
  counted as (
    select count(*)::bigint as n from filtered
  )
  select
    f.rid,
    f.rtitle,
    f.cuisine_name,
    f.cook_time,
    f.recipe_image,
    f.tags,
    f.score,
    f.req_count,
    f.owned_count,
    f.miss_count,
    f.expiring,
    f.miss_count in (1, 2),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'ingredientId', i.id,
        'name', coalesce(ri.display_name, i.name),
        'substitutes', coalesce((
          select jsonb_agg(jsonb_build_object('ingredientId', si.id, 'name', si.name, 'note', s.note))
          from public.substitutes s
          join public.ingredients si on si.id = s.substitute_id
          where s.ingredient_id = i.id
        ), '[]'::jsonb)
      ) order by i.name)
      from public.recipe_ingredients ri
      join public.ingredients i on i.id = ri.ingredient_id
      where ri.recipe_id = f.rid
        and not exists (select 1 from user_pantry up where up.ingredient_id = i.id)
    ), '[]'::jsonb),
    counted.n
  from filtered f cross join counted
  order by f.score desc, f.expiring desc, f.cook_time asc, f.rid asc
  offset greatest(0, p_page - 1) * greatest(1, least(p_limit, 50))
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.get_recommendations(bigint, integer, bigint, boolean, numeric, integer, integer, integer) to anon;
