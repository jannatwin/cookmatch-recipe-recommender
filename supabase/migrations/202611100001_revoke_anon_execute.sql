-- Supabase grants EXECUTE on new public functions to anon by default; "revoke from public" alone
-- does not remove it. These functions are for signed-in users only.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.replace_pantry_items(jsonb) from anon;
revoke execute on function public.get_recommendations(bigint, integer, bigint, boolean, numeric, integer, integer, integer) from anon;
revoke execute on function public.create_recipe(jsonb) from anon;
revoke execute on function public.update_recipe(bigint, jsonb) from anon;
revoke execute on function public.create_ingredient(text, text, jsonb) from anon;
