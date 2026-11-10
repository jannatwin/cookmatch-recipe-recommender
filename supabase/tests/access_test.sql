-- Role and row-level access checks (NFR-7, ST-4, ST-5).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@access.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@access.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@access.local');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';

insert into public.ingredients (name, normalized_name) values ('Access A', 'access_a');
insert into public.recipes (title, cooking_time_min, is_published, source, source_id)
  values ('Access draft', 5, false, 'cookmatch', 'access-draft');
insert into public.pantry_items (user_id, ingredient_id)
select '00000000-0000-0000-0000-0000000000b1', id from public.ingredients where normalized_name = 'access_a';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select throws_ok($$ select public.create_recipe('{}'::jsonb) $$, '42501', null, 'user cannot create a recipe');
select throws_ok($$ select public.update_recipe(1, '{}'::jsonb) $$, '42501', null, 'user cannot update a recipe');
select throws_ok($$ select public.create_ingredient('X', 'access_x') $$, '42501', null, 'user cannot create an ingredient');
select throws_ok(
  $$ insert into public.ingredients (name, normalized_name) values ('X', 'access_x') $$,
  '42501', null, 'user cannot insert catalog rows directly'
);
select is_empty(
  $$ with gone as (delete from public.ingredients where normalized_name = 'access_a' returning 1) select * from gone $$,
  'user cannot delete catalog rows'
);
select is_empty($$ select 1 from public.recipes where source_id = 'access-draft' $$, 'user cannot see an unpublished recipe');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'user cannot change their own role'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Renamed' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'user can change their own display name'
);
select is_empty(
  $$ select 1 from public.pantry_items where user_id = '00000000-0000-0000-0000-0000000000b1' $$,
  'user cannot read another pantry'
);
select throws_ok(
  $$ insert into public.pantry_items (user_id, ingredient_id)
     select '00000000-0000-0000-0000-0000000000b1', id from public.ingredients where normalized_name = 'access_a' $$,
  '42501', null, 'user cannot write to another pantry'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';
select lives_ok($$ select public.create_ingredient('Access B', 'access_b') $$, 'admin can create an ingredient');
select isnt_empty($$ select 1 from public.recipes where source_id = 'access-draft' $$, 'admin can see an unpublished recipe');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select * from public.get_recommendations() $$, '42501', null, 'anonymous cannot call recommendations');
select is_empty($$ select 1 from public.ingredients $$, 'anonymous sees no catalog rows');

select * from finish();
rollback;
