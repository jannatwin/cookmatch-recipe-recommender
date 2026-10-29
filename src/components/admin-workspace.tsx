"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/client-api";
import { buttonPrimary, buttonSecondary, EmptyState, inputClass, PageHeading, Panel } from "@/components/ui";

type Ingredient = { ingredientId: number; name: string };
type Alias = { aliasId: number; ingredientId: number; alias: string };
type Option = { cuisineId: number; name: string };
type Tag = { tagId: number; name: string };
type Substitute = { ingredientId: number; substituteId: number; note: string | null };
type EditableRecipe = {
  recipeId: number;
  title: string;
  description: string;
  cuisineId: number | null;
  cookingTimeMin: number;
  imageUrl: string;
  isPublished: boolean;
  ingredientIds: number[];
  dietaryTagIds: number[];
  steps: Array<{ instruction: string }>;
};
type Catalog = { recipes: EditableRecipe[]; ingredients: Ingredient[]; aliases: Alias[]; cuisines: Option[]; dietaryTags: Tag[]; substitutes: Substitute[] };
type RecipeDraft = Omit<EditableRecipe, "recipeId"> & { recipeId: number | null };

const newRecipe = (): RecipeDraft => ({ recipeId: null, title: "", description: "", cuisineId: null, cookingTimeMin: 30, imageUrl: "", isPublished: false, ingredientIds: [], dietaryTagIds: [], steps: [{ instruction: "" }] });

export function AdminWorkspace() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"recipes" | "ingredients">("recipes");
  const [draft, setDraft] = useState<RecipeDraft>(newRecipe());
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [aliasesInput, setAliasesInput] = useState("");
  const [aliasIngredientId, setAliasIngredientId] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [substituteIngredientId, setSubstituteIngredientId] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [substituteNote, setSubstituteNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalog = useCallback(async () => {
    try {
      const result = await apiRequest<Catalog>("/api/v1/admin/catalog");
      setCatalog(result);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiRequest<Catalog>("/api/v1/admin/catalog")
      .then((result) => { setCatalog(result); setError(""); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load the catalog."))
      .finally(() => setLoading(false));
  }, []);

  function editRecipe(recipe: EditableRecipe) {
    setDraft({ ...recipe, ingredientIds: [...recipe.ingredientIds], dietaryTagIds: [...recipe.dietaryTagIds], steps: recipe.steps.length ? recipe.steps.map((step) => ({ ...step })) : [{ instruction: "" }] });
    setTab("recipes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleId(key: "ingredientIds" | "dietaryTagIds", id: number) {
    setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const body = {
        ...draft,
        cuisineId: draft.cuisineId || null,
        cookingTimeMin: Number(draft.cookingTimeMin),
        steps: draft.steps.filter((step) => step.instruction.trim()),
      };
      const path = draft.recipeId ? `/api/v1/recipes/${draft.recipeId}` : "/api/v1/recipes";
      await apiRequest(path, { method: draft.recipeId ? "PUT" : "POST", body: JSON.stringify(body) });
      setNotice(draft.recipeId ? "Recipe updated." : "Recipe created.");
      setDraft(newRecipe());
      await loadCatalog();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the recipe.");
    } finally { setBusy(false); }
  }

  async function deleteRecipe(recipe: EditableRecipe) {
    if (!window.confirm(`Delete “${recipe.title}”? This also removes its ingredients and instructions.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest<void>(`/api/v1/recipes/${recipe.recipeId}`, { method: "DELETE" });
      setNotice(`“${recipe.title}” was deleted.`);
      if (draft.recipeId === recipe.recipeId) setDraft(newRecipe());
      await loadCatalog();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the recipe.");
    } finally { setBusy(false); }
  }

  async function createIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest("/api/v1/ingredients", { method: "POST", body: JSON.stringify({ name: ingredientName, aliases: aliasesInput.split(",").map((alias) => alias.trim()).filter(Boolean) }) });
      setIngredientName(""); setAliasesInput(""); setNotice("Ingredient and aliases added."); await loadCatalog();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add the ingredient."); }
    finally { setBusy(false); }
  }

  async function createAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/api/v1/ingredients/${aliasIngredientId}/aliases`, { method: "POST", body: JSON.stringify({ alias: aliasText }) });
      setAliasText(""); setNotice("Alias added."); await loadCatalog();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add the alias."); }
    finally { setBusy(false); }
  }

  async function createSubstitute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest("/api/v1/substitutes", { method: "POST", body: JSON.stringify({ ingredientId: Number(substituteIngredientId), substituteId: Number(substituteId), note: substituteNote }) });
      setSubstituteNote(""); setNotice("Substitute mapping added."); await loadCatalog();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add the substitute."); }
    finally { setBusy(false); }
  }

  async function deleteSubstitute(item: Substitute) {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest<void>("/api/v1/substitutes", { method: "DELETE", body: JSON.stringify({ ingredientId: item.ingredientId, substituteId: item.substituteId }) });
      setNotice("Substitute mapping removed."); await loadCatalog();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove the substitute."); }
    finally { setBusy(false); }
  }

  const ingredientNameById = new Map((catalog?.ingredients ?? []).map((item) => [item.ingredientId, item.name]));
  if (loading && !catalog) return <div role="status" className="rounded-3xl bg-white/60 px-5 py-12 text-center font-semibold">Opening the kitchen catalog…</div>;
  if (!catalog) return <EmptyState title="Admin catalog unavailable" description={error || "You may need administrator access to manage the catalog."} />;

  return (
    <>
      <PageHeading eyebrow="Keep the catalog delicious" title="Kitchen admin" description="Manage CookMatch recipes and the ingredient catalog. Changes are protected by the admin role." />
      {error && <p role="alert" className="mb-5 rounded-2xl bg-[#ffe1dd] px-4 py-3 text-sm font-semibold text-[#7b2b22]">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold">{notice}</p>}
      <div role="tablist" aria-label="Catalog sections" className="mb-6 flex w-fit gap-2 rounded-full bg-[#ead9cd] p-1.5">
        {(["recipes", "ingredients"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`min-h-11 rounded-full px-5 text-sm font-extrabold capitalize ${tab === value ? "bg-white shadow-sm" : "text-[#765b4d]"}`}>{value === "recipes" ? "Recipes" : "Ingredients & substitutes"}</button>)}
      </div>

      {tab === "recipes" ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
        <Panel>
          <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">{draft.recipeId ? "Edit recipe" : "New recipe"}</p><h2 className="mt-1 text-2xl font-black">{draft.recipeId ? "Update a dish" : "Add a dish"}</h2></div>{draft.recipeId && <button type="button" onClick={() => setDraft(newRecipe())} className="text-sm font-bold underline underline-offset-4">Cancel edit</button>}</div>
          <form onSubmit={saveRecipe} className="space-y-4">
            <div><label htmlFor="recipe-title" className="mb-1.5 block text-sm font-bold">Recipe title</label><input id="recipe-title" required maxLength={200} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className={inputClass} /></div>
            <div><label htmlFor="recipe-description" className="mb-1.5 block text-sm font-bold">Description</label><textarea id="recipe-description" maxLength={5000} rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} resize-y`} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label htmlFor="recipe-cuisine" className="mb-1.5 block text-sm font-bold">Cuisine</label><select id="recipe-cuisine" value={draft.cuisineId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, cuisineId: event.target.value ? Number(event.target.value) : null }))} className={inputClass}><option value="">Not specified</option>{catalog.cuisines.map((item) => <option key={item.cuisineId} value={item.cuisineId}>{item.name}</option>)}</select></div>
              <div><label htmlFor="recipe-time" className="mb-1.5 block text-sm font-bold">Minutes</label><input id="recipe-time" type="number" min={1} max={1440} required value={draft.cookingTimeMin} onChange={(event) => setDraft((current) => ({ ...current, cookingTimeMin: Number(event.target.value) }))} className={inputClass} /></div>
            </div>
            <div><label htmlFor="recipe-image" className="mb-1.5 block text-sm font-bold">Image URL <span className="font-medium text-[#8b7061]">(optional)</span></label><input id="recipe-image" type="url" value={draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} className={inputClass} placeholder="https://…" /></div>
            <fieldset><legend className="mb-2 text-sm font-extrabold">Ingredients <span className="font-medium text-[#8b7061]">({draft.ingredientIds.length} selected)</span></legend><input aria-label="Search ingredients" value={ingredientSearch} onChange={(event) => setIngredientSearch(event.target.value)} className={`${inputClass} mb-2`} placeholder="Filter ingredient list" /><div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-2xl bg-cream/70 p-2">{catalog.ingredients.filter((item) => item.name.toLowerCase().includes(ingredientSearch.toLowerCase())).map((item) => <label key={item.ingredientId} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-white"><input type="checkbox" checked={draft.ingredientIds.includes(item.ingredientId)} onChange={() => toggleId("ingredientIds", item.ingredientId)} className="size-4 accent-[#d96f58]" />{item.name}</label>)}</div></fieldset>
            <fieldset><legend className="mb-2 text-sm font-extrabold">Dietary tags</legend><div className="flex flex-wrap gap-2">{catalog.dietaryTags.map((tag) => <label key={tag.tagId} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-bold ${draft.dietaryTagIds.includes(tag.tagId) ? "bg-lavender" : "bg-cream"}`}><input type="checkbox" checked={draft.dietaryTagIds.includes(tag.tagId)} onChange={() => toggleId("dietaryTagIds", tag.tagId)} className="size-4 accent-[#735a97]" />{tag.name}</label>)}</div></fieldset>
            <fieldset><legend className="mb-2 text-sm font-extrabold">Instructions</legend><div className="space-y-2">{draft.steps.map((step, index) => <div key={index} className="flex items-start gap-2"><label className="sr-only" htmlFor={`step-${index}`}>Step {index + 1}</label><span aria-hidden="true" className="mt-2 grid size-8 shrink-0 place-items-center rounded-full bg-butter text-xs font-black">{index + 1}</span><textarea id={`step-${index}`} required maxLength={5000} rows={2} value={step.instruction} onChange={(event) => setDraft((current) => ({ ...current, steps: current.steps.map((item, itemIndex) => itemIndex === index ? { instruction: event.target.value } : item) }))} className={`${inputClass} min-h-0 resize-y`} placeholder="Describe this cooking step" />{draft.steps.length > 1 && <button type="button" aria-label={`Remove step ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, steps: current.steps.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl text-lg font-bold text-[#833d32] hover:bg-[#fff0ed]">×</button>}</div>)}</div><button type="button" onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, { instruction: "" }] }))} className="mt-3 min-h-10 rounded-full px-3 text-sm font-bold underline underline-offset-4">+ Add a step</button></fieldset>
            <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-mint/60 px-4 text-sm font-bold"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))} className="size-5 accent-[#477456]" />Publish this recipe</label>
            <button type="submit" disabled={busy || draft.ingredientIds.length === 0 || draft.steps.every((step) => !step.instruction.trim())} className={`${buttonPrimary} w-full`}>{busy ? "Saving…" : draft.recipeId ? "Save changes" : "Create recipe"}</button>
          </form>
        </Panel>

        <div><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-extrabold">Recipe catalog</h2><p className="mt-1 text-sm text-[#765b4d]">{catalog.recipes.length} recipes · select one to edit</p></div></div>
          {catalog.recipes.length ? <ul className="space-y-3">{catalog.recipes.map((recipe) => <li key={recipe.recipeId} className="flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-white/75 p-4 shadow-clay sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{recipe.title}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${recipe.isPublished ? "bg-mint" : "bg-butter"}`}>{recipe.isPublished ? "Published" : "Draft"}</span></div><p className="mt-1 text-xs text-[#765b4d]">{recipe.cookingTimeMin} min · {recipe.ingredientIds.length} ingredients · {recipe.steps.length} steps</p></div><div className="flex gap-2"><button type="button" onClick={() => editRecipe(recipe)} className={buttonSecondary}>Edit</button><button type="button" disabled={busy} onClick={() => void deleteRecipe(recipe)} className="min-h-11 rounded-full border border-[#e8c2b9] px-4 text-sm font-bold text-[#833d32] hover:bg-[#fff0ed] focus-visible:outline-4 focus-visible:outline-[#833d32] disabled:opacity-50">Delete</button></div></li>)}</ul>
            : <EmptyState title="No recipes yet" description="Add your first CookMatch recipe using the form." />}
        </div>
      </div> : <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Panel><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">Catalog</p><h2 className="mt-1 text-2xl font-black">Add an ingredient</h2><form onSubmit={createIngredient} className="mt-5 space-y-4"><div><label htmlFor="ingredient-name" className="mb-1.5 block text-sm font-bold">Ingredient name</label><input id="ingredient-name" required maxLength={100} value={ingredientName} onChange={(event) => setIngredientName(event.target.value)} className={inputClass} /></div><div><label htmlFor="ingredient-aliases" className="mb-1.5 block text-sm font-bold">Aliases <span className="font-medium text-[#8b7061]">(comma separated)</span></label><input id="ingredient-aliases" value={aliasesInput} onChange={(event) => setAliasesInput(event.target.value)} className={inputClass} placeholder="e.g. cilantro, dhone pata" /></div><button disabled={busy} className={buttonPrimary}>{busy ? "Saving…" : "Add ingredient"}</button></form></Panel>
          <Panel><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">Search & matching</p><h2 className="mt-1 text-2xl font-black">Add an alias</h2><form onSubmit={createAlias} className="mt-5 space-y-4"><div><label htmlFor="alias-ingredient" className="mb-1.5 block text-sm font-bold">Ingredient</label><select id="alias-ingredient" required value={aliasIngredientId} onChange={(event) => setAliasIngredientId(event.target.value)} className={inputClass}><option value="">Choose ingredient</option>{catalog.ingredients.map((item) => <option key={item.ingredientId} value={item.ingredientId}>{item.name}</option>)}</select></div><div><label htmlFor="alias-name" className="mb-1.5 block text-sm font-bold">Alias</label><input id="alias-name" required maxLength={100} value={aliasText} onChange={(event) => setAliasText(event.target.value)} className={inputClass} /></div><button disabled={busy} className={buttonPrimary}>Add alias</button></form></Panel>
        </div>
        <div className="space-y-6">
          <Panel><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">Ingredient swaps</p><h2 className="mt-1 text-2xl font-black">Add a substitute</h2><form onSubmit={createSubstitute} className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="missing-item" className="mb-1.5 block text-sm font-bold">Ingredient to replace</label><select id="missing-item" required value={substituteIngredientId} onChange={(event) => setSubstituteIngredientId(event.target.value)} className={inputClass}><option value="">Choose ingredient</option>{catalog.ingredients.map((item) => <option key={item.ingredientId} value={item.ingredientId}>{item.name}</option>)}</select></div><div><label htmlFor="replacement-item" className="mb-1.5 block text-sm font-bold">Possible substitute</label><select id="replacement-item" required value={substituteId} onChange={(event) => setSubstituteId(event.target.value)} className={inputClass}><option value="">Choose ingredient</option>{catalog.ingredients.map((item) => <option key={item.ingredientId} value={item.ingredientId}>{item.name}</option>)}</select></div></div><div><label htmlFor="sub-note" className="mb-1.5 block text-sm font-bold">Note <span className="font-medium text-[#8b7061]">(optional)</span></label><input id="sub-note" maxLength={255} value={substituteNote} onChange={(event) => setSubstituteNote(event.target.value)} className={inputClass} placeholder="How should it be used?" /></div><button disabled={busy} className={buttonPrimary}>Add substitute</button></form>
            <div className="mt-6 border-t border-[#ead9cd] pt-5"><h3 className="font-extrabold">Current swaps</h3>{catalog.substitutes.length ? <ul className="mt-3 space-y-2">{catalog.substitutes.map((item) => <li key={`${item.ingredientId}-${item.substituteId}`} className="flex items-center justify-between gap-3 rounded-xl bg-lavender/40 px-3 py-2.5 text-sm"><span><strong>{ingredientNameById.get(item.ingredientId) ?? "Ingredient"}</strong> → {ingredientNameById.get(item.substituteId) ?? "Substitute"}{item.note && <span className="block text-xs text-[#765b4d]">{item.note}</span>}</span><button type="button" disabled={busy} aria-label={`Remove ${ingredientNameById.get(item.substituteId) ?? "substitute"}`} onClick={() => void deleteSubstitute(item)} className="min-h-10 rounded-lg px-3 font-bold text-[#833d32] hover:bg-white/70">Remove</button></li>)}</ul> : <p className="mt-2 text-sm text-[#765b4d]">No substitute mappings yet.</p>}</div>
          </Panel>
        </div>
        <Panel className="xl:col-span-2"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">Ingredient dictionary</p><h2 className="mt-1 text-2xl font-black">Ingredients and aliases</h2></div><input aria-label="Filter ingredient list" value={ingredientSearch} onChange={(event) => setIngredientSearch(event.target.value)} className={`${inputClass} max-w-sm`} placeholder="Search ingredients" /></div><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalog.ingredients.filter((item) => item.name.toLowerCase().includes(ingredientSearch.toLowerCase()) || catalog.aliases.some((alias) => alias.ingredientId === item.ingredientId && alias.alias.toLowerCase().includes(ingredientSearch.toLowerCase()))).map((item) => <li key={item.ingredientId} className="rounded-2xl bg-cream/80 p-4"><h3 className="font-extrabold">{item.name}</h3><p className="mt-1 text-xs leading-5 text-[#765b4d]">{catalog.aliases.filter((alias) => alias.ingredientId === item.ingredientId).map((alias) => alias.alias).join(" · ") || "No aliases"}</p></li>)}</ul></Panel>
      </div>}
    </>
  );
}
