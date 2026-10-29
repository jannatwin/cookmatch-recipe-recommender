-- Deterministic CookMatch-owned demo catalog. Do not seed provider-owned data here.
begin;

insert into public.cuisines (name) values ('Bangladeshi'), ('Italian')
on conflict (name) do nothing;

insert into public.dietary_tags (name) values ('Vegetarian'), ('Halal')
on conflict (name) do nothing;

insert into public.ingredients (name, normalized_name) values
  ('Egg', 'egg'), ('Onion', 'onion'), ('Tomato', 'tomato'), ('Rice', 'rice'),
  ('Butter', 'butter'), ('Oil', 'oil'), ('Salt', 'salt'), ('Chili', 'chili'),
  ('Garlic', 'garlic'), ('Chicken', 'chicken')
on conflict (normalized_name) do nothing;

insert into public.ingredient_aliases (ingredient_id, alias, normalized_alias)
select i.id, v.alias, v.normalized_alias
from (values
  ('onion', 'Piyaj', 'piyaj'),
  ('tomato', 'Tomatoes', 'tomatoes'),
  ('chili', 'Chilli', 'chilli')
) as v(ingredient_name, alias, normalized_alias)
join public.ingredients i on i.normalized_name = v.ingredient_name
on conflict (normalized_alias) do nothing;

insert into public.substitutes (ingredient_id, substitute_id, note)
select original.id, replacement.id, 'Use oil instead of butter for frying'
from public.ingredients original, public.ingredients replacement
where original.normalized_name = 'butter' and replacement.normalized_name = 'oil'
on conflict (ingredient_id, substitute_id) do nothing;

insert into public.recipes (title, description, cuisine_id, cooking_time_min, is_published, source, source_id)
select v.title, v.description, c.id, v.cooking_time_min, true, 'cookmatch', v.source_id
from (values
  ('Tomato Egg Curry', 'Quick curry using pantry staples.', 'Bangladeshi', 25, 'demo-r1'),
  ('Fried Rice', 'Simple fried rice with egg and vegetables.', 'Bangladeshi', 20, 'demo-r2'),
  ('Chicken Curry', 'A weeknight chicken curry.', 'Bangladeshi', 45, 'demo-r3'),
  ('Garlic Butter Rice', 'Rice with garlic and butter.', 'Italian', 15, 'demo-r4'),
  ('Plain Omelette', 'A quick egg omelette.', 'Italian', 10, 'demo-r5')
) as v(title, description, cuisine_name, cooking_time_min, source_id)
join public.cuisines c on c.name = v.cuisine_name
on conflict (source, source_id) do nothing;

insert into public.recipe_ingredients (recipe_id, ingredient_id)
select r.id, i.id
from (values
  ('demo-r1', 'egg'), ('demo-r1', 'onion'), ('demo-r1', 'tomato'), ('demo-r1', 'oil'), ('demo-r1', 'salt'),
  ('demo-r2', 'rice'), ('demo-r2', 'egg'), ('demo-r2', 'butter'), ('demo-r2', 'onion'), ('demo-r2', 'salt'),
  ('demo-r3', 'chicken'), ('demo-r3', 'onion'), ('demo-r3', 'garlic'), ('demo-r3', 'chili'), ('demo-r3', 'oil'), ('demo-r3', 'salt'),
  ('demo-r4', 'rice'), ('demo-r4', 'butter'), ('demo-r4', 'garlic'), ('demo-r4', 'salt'),
  ('demo-r5', 'egg'), ('demo-r5', 'oil'), ('demo-r5', 'salt')
) as v(source_id, ingredient_name)
join public.recipes r on r.source = 'cookmatch' and r.source_id = v.source_id
join public.ingredients i on i.normalized_name = v.ingredient_name
on conflict (recipe_id, ingredient_id) do nothing;

insert into public.recipe_steps (recipe_id, step_number, instruction)
select r.id, v.step_number, v.instruction
from (values
  ('demo-r1', 1, 'Heat oil in a pan and soften the onion.'),
  ('demo-r1', 2, 'Add tomato and simmer until soft.'),
  ('demo-r1', 3, 'Add the egg and cook through. Season with salt.'),
  ('demo-r2', 1, 'Heat oil in a pan and scramble the egg.'),
  ('demo-r2', 2, 'Add rice, onion and butter; stir-fry until hot.'),
  ('demo-r2', 3, 'Season with salt and serve.'),
  ('demo-r3', 1, 'Brown the chicken with onion, garlic and chili.'),
  ('demo-r3', 2, 'Add water and simmer until the chicken is cooked.'),
  ('demo-r3', 3, 'Season with salt and finish with a little oil.'),
  ('demo-r4', 1, 'Cook rice until tender.'),
  ('demo-r4', 2, 'Warm butter with garlic and fold through the rice.'),
  ('demo-r4', 3, 'Season with salt and serve warm.'),
  ('demo-r5', 1, 'Beat the eggs with a pinch of salt.'),
  ('demo-r5', 2, 'Cook in a lightly oiled pan until set, then fold.')
) as v(source_id, step_number, instruction)
join public.recipes r on r.source = 'cookmatch' and r.source_id = v.source_id
on conflict (recipe_id, step_number) do nothing;

insert into public.recipe_dietary_tags (recipe_id, tag_id)
select r.id, t.id
from (values
  ('demo-r1', 'Vegetarian'), ('demo-r2', 'Vegetarian'), ('demo-r3', 'Halal'),
  ('demo-r4', 'Vegetarian'), ('demo-r5', 'Vegetarian')
) as v(source_id, tag_name)
join public.recipes r on r.source = 'cookmatch' and r.source_id = v.source_id
join public.dietary_tags t on t.name = v.tag_name
on conflict (recipe_id, tag_id) do nothing;

commit;
