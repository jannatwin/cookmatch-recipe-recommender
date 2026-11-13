-- Pantry staples weigh a quarter of a normal ingredient in the match score (migration 202611160001).
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005a1', 'staple@test.local');
insert into public.ingredients (name, normalized_name, is_staple) values
  ('S core 1', 'staple_core_1', false), ('S core 2', 'staple_core_2', false),
  ('S core 3', 'staple_core_3', false), ('S staple', 'staple_flagged', true);
insert into public.recipes (title, cooking_time_min, is_published, source, source_id) values
  ('Staple weighted', 10, true, 'cookmatch', 'staple-r1'),
  ('Only staple owned', 10, true, 'cookmatch', 'staple-r2'),
  ('Staple missing', 10, true, 'cookmatch', 'staple-r3'),
  ('All owned with staple', 10, true, 'cookmatch', 'staple-r4');
insert into public.recipe_ingredients (recipe_id, ingredient_id)
select r.id, i.id from (values
  ('staple-r1', 'staple_core_1'), ('staple-r1', 'staple_flagged'), ('staple-r1', 'staple_core_3'),
  ('staple-r2', 'staple_flagged'), ('staple-r2', 'staple_core_3'),
  ('staple-r3', 'staple_core_1'), ('staple-r3', 'staple_core_2'), ('staple-r3', 'staple_flagged'),
  ('staple-r4', 'staple_core_1'), ('staple-r4', 'staple_flagged')
) v(source_id, ingredient)
join public.recipes r on r.source_id = v.source_id
join public.ingredients i on i.normalized_name = v.ingredient;

-- First pantry: one core ingredient and the staple.
insert into public.pantry_items (user_id, ingredient_id)
select '00000000-0000-0000-0000-0000000005a1', id from public.ingredients
where normalized_name in ('staple_core_1', 'staple_flagged');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000005a1", "role": "authenticated"}';

select is(
  (select match_score from public.get_recommendations() where title = 'Staple weighted'), 55.6,
  'owned core (1) + owned staple (0.25) over required 2.25 = 55.6'
);
select is(
  (select match_score from public.get_recommendations() where title = 'All owned with staple'), 100.0,
  'a full match is still 100'
);
select is_empty(
  $$ select 1 from public.get_recommendations() where title = 'Only staple owned' $$,
  'owning only a staple does not make a recipe a match'
);
select is(
  (select missing_count from public.get_recommendations() where title = 'Staple weighted'), 1,
  'staples still count in the missing total'
);
select results_eq(
  $$ select title from public.get_recommendations() where title like '%taple%' $$,
  array['All owned with staple', 'Staple weighted', 'Staple missing'],
  'ranking follows the weighted score'
);

-- Second pantry: both core ingredients but not the staple.
reset role;
delete from public.pantry_items where user_id = '00000000-0000-0000-0000-0000000005a1';
insert into public.pantry_items (user_id, ingredient_id)
select '00000000-0000-0000-0000-0000000005a1', id from public.ingredients
where normalized_name in ('staple_core_1', 'staple_core_2');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000005a1", "role": "authenticated"}';

select is(
  (select match_score from public.get_recommendations() where title = 'Staple missing'), 88.9,
  'missing only the staple costs little: 2 of 2.25 = 88.9'
);
select is(
  (select almost_achievable from public.get_recommendations() where title = 'Staple missing'), true,
  'a missing staple still counts towards almost achievable'
);

select * from finish();
rollback;
