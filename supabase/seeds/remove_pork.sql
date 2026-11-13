-- One-off cleanup for databases seeded before pork was removed from the CookMatch seed catalog.
-- Removes pork, bacon, ham and sausage as ingredients, deletes the one recipe that had no pork-free
-- version, and deletes the seed recipes that changed so the seed files can re-create them.
-- After this, run again in order: leftover_recipes.sql, world_recipes.sql, recipe_images.sql,
-- recipe_quantities.sql. Safe to run more than once. Fresh databases do not need this file.
begin;

-- Seed recipes that were rewritten or replaced (saved copies of them are removed with them).
delete from public.recipes
where source = 'cookmatch'
  and source_id in (
    'leftover-002', 'leftover-045', 'leftover-057', 'leftover-081', 'leftover-096', 'leftover-097',
    'world-043', 'world-050', 'world-075', 'world-079', 'world-095', 'world-100'
  );

-- Any other recipe (for example one added by an admin) loses just the pork ingredient line.
delete from public.recipe_ingredients ri
using public.ingredients i
where i.id = ri.ingredient_id
  and i.normalized_name in ('pork', 'bacon', 'ham', 'sausage');

-- Pantry rows, aliases and substitutes for these ingredients are removed by their foreign keys.
delete from public.ingredients
where normalized_name in ('pork', 'bacon', 'ham', 'sausage');

commit;
