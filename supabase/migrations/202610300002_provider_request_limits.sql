create table public.provider_request_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('spoonacular_search', 'spoonacular_detail')),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, action)
);

alter table public.provider_request_limits enable row level security;
revoke all on public.provider_request_limits from anon, authenticated;

create or replace function public.consume_provider_request_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_window_start timestamptz := date_trunc('hour', now() at time zone 'utc') at time zone 'utc';
  v_request_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_action not in ('spoonacular_search', 'spoonacular_detail') then
    raise exception using errcode = '22023', message = 'Invalid provider action';
  end if;

  insert into public.provider_request_limits as limits (user_id, action, window_start, request_count)
  values (v_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action) do update
    set window_start = excluded.window_start,
        request_count = case
          when limits.window_start = excluded.window_start then limits.request_count + 1
          else 1
        end
  returning request_count into v_request_count;

  return v_request_count <= 30;
end;
$$;

revoke all on function public.consume_provider_request_limit(text) from public, anon;
grant execute on function public.consume_provider_request_limit(text) to authenticated;
