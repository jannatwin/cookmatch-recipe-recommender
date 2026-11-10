-- Ranking and isolation checks for get_recommendations (FR-8–FR-14, NFR determinism).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

insert into public.ingredients (name, normalized_name) values
  ('T1', 'test_1'), ('T2', 'test_2'), ('T3', 'test_3'), ('T4', 'test_4'), ('T5', 'test_5'), ('T6', 'test_6');
insert into public.cuisines (name) values ('Test cuisine');
insert into public.dietary_tags (name) values ('Test tag');
insert into public.substitutes (ingredient_id, substitute_id)
select a.id, b.id from public.ingredients a, public.ingredients b
where a.normalized_name = 'test_3' and b.normalized_name = 'test_4';

insert into public.recipes (title, cooking_time_min, is_published, source, source_id) values
  ('Full match, expiring', 20, true, 'cookmatch', 'test-r1'),
  ('Missing one', 5, true, 'cookmatch', 'test-r2'),
  ('Nothing owned', 5, true, 'cookmatch', 'test-r3'),
  ('Full match, quicker', 10, true, 'cookmatch', 'test-r4'),
  ('Unpublished', 5, false, 'cookmatch', 'test-r5'),
  ('Missing two', 30, true, 'cookmatch', 'test-r6'),
  ('Missing three', 30, true, 'cookmatch', 'test-r7');
update public.recipes set cuisine_id = (select id from public.cuisines where name = 'Test cuisine') where source_id = 'test-r4';
insert into public.recipe_dietary_tags (recipe_id, tag_id)
select r.id, t.id from public.recipes r, public.dietary_tags t where r.source_id = 'test-r4' and t.name = 'Test tag';
insert into public.recipe_ingredients (recipe_id, ingredient_id)
select r.id, i.id from (values
  ('test-r1', 'test_1'), ('test-r1', 'test_2'),
  ('test-r2', 'test_1'), ('test-r2', 'test_2'), ('test-r2', 'test_3'),
  ('test-r3', 'test_3'), ('test-r3', 'test_4'),
  ('test-r4', 'test_2'), ('test-r4', 'test_5'),
  ('test-r5', 'test_1'),
  ('test-r6', 'test_2'), ('test-r6', 'test_3'), ('test-r6', 'test_4'),
  ('test-r7', 'test_1'), ('test-r7', 'test_3'), ('test-r7', 'test_4'), ('test-r7', 'test_6')
) v(source_id, ingredient)
join public.recipes r on r.source_id = v.source_id
join public.ingredients i on i.normalized_name = v.ingredient;

insert into public.pantry_items (user_id, ingredient_id, expiry_date)
select '00000000-0000-0000-0000-00000000000a', i.id, case when i.normalized_name = 'test_1' then current_date + 1 end
from public.ingredients i where i.normalized_name in ('test_1', 'test_2', 'test_5');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select title from public.get_recommendations() $$,
  array['Full match, expiring', 'Full match, quicker', 'Missing one', 'Missing two', 'Missing three'],
  'ranks by score, then expiring ingredients, then cooking time; excludes unowned and unpublished'
);
select is((select match_score from public.get_recommendations() where title = 'Missing one'), 66.7, 'score is percentage of required ingredients owned');
select is((select almost_achievable from public.get_recommendations() where title = 'Missing one'), true, 'one missing ingredient is almost achievable');
select is((select almost_achievable from public.get_recommendations() where title = 'Full match, quicker'), false, 'complete match is not almost achievable');
select is(
  (select missing_ingredients -> 0 -> 'substitutes' -> 0 ->> 'name' from public.get_recommendations() where title = 'Missing one'),
  'T4', 'missing ingredient lists its substitute'
);
select results_eq(
  $$ select title from public.get_recommendations(p_almost_only => true) $$,
  array['Missing one', 'Missing two'], 'almost-only filter keeps ranking subset'
);
select is((select total_items from public.get_recommendations(p_limit => 1)), 5::bigint, 'total count ignores page size');

select is((select almost_achievable from public.get_recommendations() where title = 'Missing two'), true, 'two missing ingredients is almost achievable');
select is((select almost_achievable from public.get_recommendations() where title = 'Missing three'), false, 'three missing ingredients is not almost achievable');
select results_eq(
  $$ select title from public.get_recommendations(p_max_time => 10) $$,
  array['Full match, quicker', 'Missing one'], 'cooking-time filter keeps ranking order'
);
select results_eq(
  $$ select title from public.get_recommendations(p_cuisine_id => (select id from public.cuisines where name = 'Test cuisine')) $$,
  array['Full match, quicker'], 'cuisine filter'
);
select results_eq(
  $$ select title from public.get_recommendations(p_diet_tag_id => (select id from public.dietary_tags where name = 'Test tag')) $$,
  array['Full match, quicker'], 'dietary filter'
);
select results_eq(
  $$ select title from public.get_recommendations(p_min_score => 100) $$,
  array['Full match, expiring', 'Full match, quicker'], 'minimum-score filter'
);
select is_empty(
  $$ select 1 from public.get_recommendations(p_cuisine_id => (select id from public.cuisines where name = 'Test cuisine'), p_max_time => 5) $$,
  'filters combine'
);
select results_eq(
  $$ select title from public.get_recommendations(p_page => 2, p_limit => 2) $$,
  array['Missing one', 'Missing two'], 'pagination continues the same order'
);
select results_eq(
  $$ select title from public.get_recommendations() $$,
  $$ select title from public.get_recommendations() $$,
  'same pantry gives the same ranking'
);

update public.pantry_items set expiry_date = current_date + 30;
select results_eq(
  $$ select title from public.get_recommendations(p_limit => 2) $$,
  array['Full match, quicker', 'Full match, expiring'], 'expiry beyond the warning window gives no boost'
);
update public.pantry_items set expiry_date = current_date - 1;
select results_eq(
  $$ select title from public.get_recommendations(p_limit => 2) $$,
  array['Full match, quicker', 'Full match, expiring'], 'an already expired ingredient gives no boost'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty($$ select 1 from public.get_recommendations() $$, 'another user does not see this pantry''s matches');

select * from finish();
rollback;
