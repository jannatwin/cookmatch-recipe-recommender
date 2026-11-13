-- Saved (favourite) recipes per user, and a request limit for signed-out catalog browsing.

create table public.favorite_recipes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id bigint not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index favorite_recipes_recipe_id_idx on public.favorite_recipes (recipe_id);

alter table public.favorite_recipes enable row level security;

create policy "favorites_select_own" on public.favorite_recipes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites_insert_own" on public.favorite_recipes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favorites_delete_own" on public.favorite_recipes
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.favorite_recipes from anon;
grant select, insert, delete on public.favorite_recipes to authenticated;

-- Guest request counters, keyed by a server-side hash of the client IP. Only the server's
-- secret-key client (service_role) can touch them; anon and authenticated users cannot.
create table public.guest_request_limits (
  client_key text primary key,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.guest_request_limits enable row level security;
revoke all on public.guest_request_limits from anon, authenticated;

create or replace function public.consume_guest_request_limit(p_client_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz := date_trunc('minute', now());
  v_request_count integer;
begin
  if p_client_key is null or char_length(p_client_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid client key';
  end if;

  -- Occasionally drop counters from earlier windows so the table stays small.
  if random() < 0.01 then
    delete from public.guest_request_limits where window_start < now() - interval '10 minutes';
  end if;

  insert into public.guest_request_limits as limits (client_key, window_start, request_count)
  values (p_client_key, v_window_start, 1)
  on conflict (client_key) do update
    set window_start = excluded.window_start,
        request_count = case
          when limits.window_start = excluded.window_start then limits.request_count + 1
          else 1
        end
  returning request_count into v_request_count;

  return v_request_count <= greatest(1, p_limit);
end;
$$;

revoke all on function public.consume_guest_request_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_guest_request_limit(text, integer) to service_role;
