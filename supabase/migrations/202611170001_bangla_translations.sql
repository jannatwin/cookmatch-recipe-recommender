-- Bangla translations for the catalog. English stays the canonical text; every *_bn column is
-- optional and the app falls back to the English value when it is null.
-- Translations for the seed catalog are loaded by supabase/seeds/bangla_translations.sql.

alter table public.ingredients
  add column name_bn text,
  -- Same normalisation the app applies to typed names (NFKC, trimmed, lower case, single spaces),
  -- so a Bangla name typed in the pantry resolves to its ingredient.
  add column normalized_name_bn text generated always as (
    lower(regexp_replace(btrim(normalize(name_bn, NFKC)), '\s+', ' ', 'g'))
  ) stored,
  add constraint ingredients_name_bn_not_blank
    check (name_bn is null or char_length(btrim(name_bn)) between 1 and 100);

create unique index ingredients_normalized_name_bn_key
  on public.ingredients (normalized_name_bn)
  where normalized_name_bn is not null;

alter table public.cuisines
  add column name_bn text check (name_bn is null or char_length(btrim(name_bn)) between 1 and 50);

alter table public.dietary_tags
  add column name_bn text check (name_bn is null or char_length(btrim(name_bn)) between 1 and 50);

alter table public.recipes
  add column title_bn text check (title_bn is null or char_length(btrim(title_bn)) between 1 and 200),
  add column description_bn text;

alter table public.recipe_ingredients
  add column display_name_bn text,
  add column amount_bn text,
  add column unit_bn text;

alter table public.recipe_steps
  add column instruction_bn text check (instruction_bn is null or char_length(btrim(instruction_bn)) > 0);

alter table public.substitutes
  add column note_bn text;

-- Ranking is unchanged from 202611160001. The new p_locale argument only chooses the language of
-- the returned text: 'bn' returns Bangla where a translation exists, anything else English.
drop function public.get_recommendations(bigint, integer, bigint, boolean, numeric, integer, integer, integer);

create function public.get_recommendations(
  p_cuisine_id bigint default null,
  p_max_time integer default null,
  p_diet_tag_id bigint default null,
  p_almost_only boolean default false,
  p_min_score numeric default null,
  p_warning_days integer default 3,
  p_page integer default 1,
  p_limit integer default 20,
  p_locale text default 'en'
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
      case when p_locale = 'bn' then coalesce(r.title_bn, r.title) else r.title end as rtitle,
      case when p_locale = 'bn' then coalesce(c.name_bn, c.name) else c.name end as cuisine_name,
      r.cooking_time_min as cook_time,
      r.image_url as recipe_image,
      count(ri.ingredient_id)::integer as req_count,
      count(up.ingredient_id)::integer as owned_count,
      count(ri.ingredient_id)::integer - count(up.ingredient_id)::integer as miss_count,
      count(*) filter (
        where up.expiry_date >= current_date
          and up.expiry_date <= current_date + make_interval(days => greatest(0, least(p_warning_days, 30)))
      )::integer as expiring,
      count(up.ingredient_id) filter (where not i.is_staple)::integer as owned_core,
      round(
        100.0 * coalesce(sum(case when i.is_staple then 0.25 else 1 end) filter (where up.ingredient_id is not null), 0)
          / nullif(sum(case when i.is_staple then 0.25 else 1 end), 0),
        1
      ) as score,
      coalesce(array(
        select case when p_locale = 'bn' then coalesce(dt.name_bn, dt.name) else dt.name end
        from public.recipe_dietary_tags rdt
        join public.dietary_tags dt on dt.id = rdt.tag_id
        where rdt.recipe_id = r.id
        order by dt.name
      ), array[]::text[]) as tags
    from public.recipes r
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    join public.ingredients i on i.id = ri.ingredient_id
    left join public.cuisines c on c.id = r.cuisine_id
    left join user_pantry up on up.ingredient_id = ri.ingredient_id
    where r.is_published
      and (p_cuisine_id is null or r.cuisine_id = p_cuisine_id)
      and (p_max_time is null or r.cooking_time_min <= p_max_time)
      and (p_diet_tag_id is null or exists (
        select 1 from public.recipe_dietary_tags x
        where x.recipe_id = r.id and x.tag_id = p_diet_tag_id
      ))
    group by r.id, r.title, r.title_bn, c.name, c.name_bn, r.cooking_time_min, r.image_url
  ),
  filtered as (
    select s.* from scored s
    where (s.owned_core > 0 or (select auth.uid()) is null)
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
        'name', case
          when p_locale = 'bn' then coalesce(ri.display_name_bn, i.name_bn, ri.display_name, i.name)
          else coalesce(ri.display_name, i.name)
        end,
        'substitutes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'ingredientId', si.id,
            'name', case when p_locale = 'bn' then coalesce(si.name_bn, si.name) else si.name end,
            'note', case when p_locale = 'bn' then coalesce(s.note_bn, s.note) else s.note end
          ))
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

revoke all on function public.get_recommendations(bigint, integer, bigint, boolean, numeric, integer, integer, integer, text) from public;
grant execute on function public.get_recommendations(bigint, integer, bigint, boolean, numeric, integer, integer, integer, text) to authenticated, anon;

-- Admin recipe editing: accept the optional Bangla title, description and step text.
-- Same behaviour as before for English; a missing or empty Bangla value is stored as null.
create or replace function public.create_recipe(p_recipe jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id bigint;
begin
  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  insert into public.recipes (title, title_bn, description, description_bn, cuisine_id, cooking_time_min, image_url, is_published, source)
  values (
    p_recipe ->> 'title',
    nullif(btrim(p_recipe ->> 'titleBn'), ''),
    nullif(p_recipe ->> 'description', ''),
    nullif(btrim(p_recipe ->> 'descriptionBn'), ''),
    nullif(p_recipe ->> 'cuisineId', '')::bigint,
    (p_recipe ->> 'cookingTimeMin')::integer,
    nullif(p_recipe ->> 'imageUrl', ''),
    coalesce((p_recipe ->> 'isPublished')::boolean, false),
    'cookmatch'
  ) returning id into v_recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id)
  select v_recipe_id, x.ingredient_id
  from jsonb_to_recordset(p_recipe -> 'ingredients') as x(ingredient_id bigint);

  insert into public.recipe_steps (recipe_id, step_number, instruction, instruction_bn)
  select v_recipe_id, x.step_number, x.instruction, nullif(btrim(x.instruction_bn), '')
  from jsonb_to_recordset(p_recipe -> 'steps') as x(step_number integer, instruction text, instruction_bn text);

  insert into public.recipe_dietary_tags (recipe_id, tag_id)
  select v_recipe_id, x.tag_id
  from jsonb_to_recordset(coalesce(p_recipe -> 'dietaryTags', '[]'::jsonb)) as x(tag_id bigint);

  return v_recipe_id;
end;
$$;

create or replace function public.update_recipe(p_recipe_id bigint, p_recipe jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;
  update public.recipes set
    title = p_recipe ->> 'title',
    title_bn = nullif(btrim(p_recipe ->> 'titleBn'), ''),
    description = nullif(p_recipe ->> 'description', ''),
    description_bn = nullif(btrim(p_recipe ->> 'descriptionBn'), ''),
    cuisine_id = nullif(p_recipe ->> 'cuisineId', '')::bigint,
    cooking_time_min = (p_recipe ->> 'cookingTimeMin')::integer,
    image_url = nullif(p_recipe ->> 'imageUrl', ''),
    is_published = coalesce((p_recipe ->> 'isPublished')::boolean, false)
  where id = p_recipe_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Recipe not found';
  end if;

  -- Keep rows for ingredients that stay in the recipe, so their display name and quantity survive an edit.
  delete from public.recipe_ingredients
  where recipe_id = p_recipe_id
    and ingredient_id not in (
      select x.ingredient_id from jsonb_to_recordset(p_recipe -> 'ingredients') as x(ingredient_id bigint)
    );
  delete from public.recipe_steps where recipe_id = p_recipe_id;
  delete from public.recipe_dietary_tags where recipe_id = p_recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id)
  select p_recipe_id, x.ingredient_id
  from jsonb_to_recordset(p_recipe -> 'ingredients') as x(ingredient_id bigint)
  on conflict (recipe_id, ingredient_id) do nothing;
  insert into public.recipe_steps (recipe_id, step_number, instruction, instruction_bn)
  select p_recipe_id, x.step_number, x.instruction, nullif(btrim(x.instruction_bn), '')
  from jsonb_to_recordset(p_recipe -> 'steps') as x(step_number integer, instruction text, instruction_bn text);
  insert into public.recipe_dietary_tags (recipe_id, tag_id)
  select p_recipe_id, x.tag_id
  from jsonb_to_recordset(coalesce(p_recipe -> 'dietaryTags', '[]'::jsonb)) as x(tag_id bigint);
end;
$$;
