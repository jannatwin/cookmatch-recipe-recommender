-- Editing a recipe keeps the quantity and display name of ingredients that stay in it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000ed171', 'editor@test.local');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000ed171';
insert into public.ingredients (name, normalized_name) values
  ('Edit keep', 'edit_keep'), ('Edit drop', 'edit_drop'), ('Edit add', 'edit_add');
insert into public.recipes (title, cooking_time_min, is_published, source, source_id)
  values ('Edit me', 10, true, 'cookmatch', 'edit-r1');
insert into public.recipe_ingredients (recipe_id, ingredient_id, display_name, amount, unit)
select r.id, i.id, 'Kept name', '2', 'cups'
from public.recipes r, public.ingredients i
where r.source_id = 'edit-r1' and i.normalized_name in ('edit_keep', 'edit_drop');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000ed171", "role": "authenticated"}';

select lives_ok(
  $$ select public.update_recipe(
       (select id from public.recipes where source_id = 'edit-r1'),
       jsonb_build_object(
         'title', 'Edited', 'cookingTimeMin', 12, 'isPublished', true,
         'ingredients', (select jsonb_agg(jsonb_build_object('ingredient_id', id))
                         from public.ingredients where normalized_name in ('edit_keep', 'edit_add')),
         'steps', jsonb_build_array(jsonb_build_object('step_number', 1, 'instruction', 'Cook.'))
       )) $$,
  'admin can edit the recipe'
);
select is(
  (select ri.amount || ' ' || ri.unit || ' ' || ri.display_name from public.recipe_ingredients ri
   join public.ingredients i on i.id = ri.ingredient_id where i.normalized_name = 'edit_keep'),
  '2 cups Kept name', 'a kept ingredient keeps its quantity and display name'
);
select is_empty(
  $$ select 1 from public.recipe_ingredients ri join public.ingredients i on i.id = ri.ingredient_id
     where i.normalized_name = 'edit_drop' $$,
  'a removed ingredient is deleted'
);
select isnt_empty(
  $$ select 1 from public.recipe_ingredients ri join public.ingredients i on i.id = ri.ingredient_id
     where i.normalized_name = 'edit_add' $$,
  'a new ingredient is added'
);

select * from finish();
rollback;
