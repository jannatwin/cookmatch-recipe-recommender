-- Saved recipes are private per user; the guest limiter is reachable only by the server's secret key.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'fa@fav.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'fb@fav.local');
insert into public.recipes (title, cooking_time_min, is_published, source, source_id) values
  ('Fav published', 10, true, 'cookmatch', 'fav-1'),
  ('Fav draft', 10, false, 'cookmatch', 'fav-2');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.favorite_recipes (recipe_id) select id from public.recipes where source_id = 'fav-1' $$,
  'user can save a recipe (user_id defaults to the caller)'
);
select is(
  (select user_id from public.favorite_recipes limit 1), '00000000-0000-0000-0000-0000000000f1'::uuid,
  'saved row belongs to the caller'
);
select throws_ok(
  $$ insert into public.favorite_recipes (user_id, recipe_id)
     select '00000000-0000-0000-0000-0000000000f2', id from public.recipes where source_id = 'fav-1' $$,
  '42501', null, 'user cannot save a recipe for someone else'
);
select throws_ok(
  $$ select public.consume_guest_request_limit(repeat('a', 64), 5) $$,
  '42501', null, 'signed-in users cannot call the guest limiter'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';
select is_empty($$ select 1 from public.favorite_recipes $$, 'another user cannot see those saved recipes');
select is_empty(
  $$ with gone as (delete from public.favorite_recipes returning 1) select * from gone $$,
  'another user cannot delete those saved recipes'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select 1 from public.favorite_recipes $$, '42501', null, 'guests cannot read saved recipes');
select throws_ok(
  $$ select public.consume_guest_request_limit(repeat('a', 64), 5) $$,
  '42501', null, 'guests cannot call the guest limiter directly'
);

reset role;
set local role service_role;
select results_eq(
  $$ select public.consume_guest_request_limit(repeat('b', 64), 2) from generate_series(1, 3) $$,
  $$ values (true), (true), (false) $$,
  'the limiter allows the limit per minute, then refuses'
);
select throws_ok(
  $$ select public.consume_guest_request_limit('short', 2) $$,
  '22023', null, 'the limiter rejects malformed client keys'
);

select * from finish();
rollback;
