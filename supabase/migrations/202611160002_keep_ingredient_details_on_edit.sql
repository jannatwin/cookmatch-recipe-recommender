-- Editing a recipe in the admin tools used to delete and re-create all of its ingredient rows,
-- which wiped their display names and quantities. Keep the rows for ingredients that remain.
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
    description = nullif(p_recipe ->> 'description', ''),
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
  insert into public.recipe_steps (recipe_id, step_number, instruction)
  select p_recipe_id, x.step_number, x.instruction
  from jsonb_to_recordset(p_recipe -> 'steps') as x(step_number integer, instruction text);
  insert into public.recipe_dietary_tags (recipe_id, tag_id)
  select p_recipe_id, x.tag_id
  from jsonb_to_recordset(coalesce(p_recipe -> 'dietaryTags', '[]'::jsonb)) as x(tag_id bigint);
end;
$$;
