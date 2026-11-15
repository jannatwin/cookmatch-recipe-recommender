"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/client-api";
import { useI18n } from "@/components/locale-provider";
import type { MessageKey } from "@/lib/i18n/translate";
import { buttonPrimary, buttonSecondary, EmptyState, inputClass, PageHeading, Panel } from "@/components/ui";

// The catalog is edited in its canonical English form, with the optional Bangla text beside it.
type Ingredient = { ingredientId: number; name: string; nameBn?: string | null; isStaple?: boolean };
type Alias = { aliasId: number; ingredientId: number; alias: string };
type Option = { cuisineId: number; name: string; nameBn?: string | null };
type Tag = { tagId: number; name: string; nameBn?: string | null };
type Substitute = { ingredientId: number; substituteId: number; note: string | null; noteBn?: string | null };
type Step = { instruction: string; instructionBn: string };
type EditableRecipe = {
  recipeId: number;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  cuisineId: number | null;
  cookingTimeMin: number;
  imageUrl: string;
  isPublished: boolean;
  ingredientIds: number[];
  dietaryTagIds: number[];
  steps: Step[];
};
type Catalog = {
  recipes: EditableRecipe[];
  ingredients: Ingredient[];
  aliases: Alias[];
  cuisines: Option[];
  dietaryTags: Tag[];
  substitutes: Substitute[];
};
type RecipeDraft = Omit<EditableRecipe, "recipeId"> & { recipeId: number | null };

const newRecipe = (): RecipeDraft => ({
  recipeId: null,
  title: "",
  titleBn: "",
  description: "",
  descriptionBn: "",
  cuisineId: null,
  cookingTimeMin: 30,
  imageUrl: "",
  isPublished: false,
  ingredientIds: [],
  dietaryTagIds: [],
  steps: [{ instruction: "", instructionBn: "" }],
});

export function AdminWorkspace() {
  const { t, errorText, digits } = useI18n();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"recipes" | "ingredients">("recipes");
  const [draft, setDraft] = useState<RecipeDraft>(newRecipe());
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientNameBn, setIngredientNameBn] = useState("");
  const [aliasesInput, setAliasesInput] = useState("");
  const [aliasIngredientId, setAliasIngredientId] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [substituteIngredientId, setSubstituteIngredientId] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [substituteNote, setSubstituteNote] = useState("");
  const [substituteNoteBn, setSubstituteNoteBn] = useState("");
  const [labelKind, setLabelKind] = useState<"cuisines" | "dietary-tags">("cuisines");
  const [labelName, setLabelName] = useState("");
  const [labelNameBn, setLabelNameBn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalog = useCallback(async () => {
    try {
      const result = await apiRequest<Catalog>("/api/v1/admin/catalog");
      setCatalog(result);
      setError("");
    } catch (cause) {
      setError(errorText(cause, "admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [errorText]);

  useEffect(() => {
    apiRequest<Catalog>("/api/v1/admin/catalog")
      .then((result) => {
        setCatalog(result);
        setError("");
      })
      .catch((cause: unknown) => setError(errorText(cause, "admin.loadError")))
      .finally(() => setLoading(false));
  }, [errorText]);

  function editRecipe(recipe: EditableRecipe) {
    setDraft({
      ...recipe,
      ingredientIds: [...recipe.ingredientIds],
      dietaryTagIds: [...recipe.dietaryTagIds],
      steps: recipe.steps.length
        ? recipe.steps.map((step) => ({ ...step }))
        : [{ instruction: "", instructionBn: "" }],
    });
    setTab("recipes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleId(key: "ingredientIds" | "dietaryTagIds", id: number) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id],
    }));
  }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = {
        ...draft,
        cuisineId: draft.cuisineId || null,
        cookingTimeMin: Number(draft.cookingTimeMin),
        steps: draft.steps.filter((step) => step.instruction.trim()),
      };
      const path = draft.recipeId ? `/api/v1/recipes/${draft.recipeId}` : "/api/v1/recipes";
      await apiRequest(path, { method: draft.recipeId ? "PUT" : "POST", body: JSON.stringify(body) });
      setNotice(draft.recipeId ? t("admin.recipeUpdated") : t("admin.recipeCreated"));
      setDraft(newRecipe());
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, "admin.recipeSaveError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecipe(recipe: EditableRecipe) {
    if (!window.confirm(t("admin.confirmDeleteRecipe", { title: recipe.title }))) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`/api/v1/recipes/${recipe.recipeId}`, { method: "DELETE" });
      setNotice(t("admin.deleted", { title: recipe.title }));
      if (draft.recipeId === recipe.recipeId) setDraft(newRecipe());
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, "admin.recipeDeleteError"));
    } finally {
      setBusy(false);
    }
  }

  async function createIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/v1/ingredients", {
        method: "POST",
        body: JSON.stringify({
          name: ingredientName,
          nameBn: ingredientNameBn,
          aliases: aliasesInput
            .split(",")
            .map((alias) => alias.trim())
            .filter(Boolean),
        }),
      });
      setIngredientName("");
      setIngredientNameBn("");
      setAliasesInput("");
      setNotice(t("admin.ingredientAdded"));
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, "admin.ingredientAddError"));
    } finally {
      setBusy(false);
    }
  }

  async function createAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/v1/ingredients/${aliasIngredientId}/aliases`, {
        method: "POST",
        body: JSON.stringify({ alias: aliasText }),
      });
      setAliasText("");
      setNotice(t("admin.aliasAdded"));
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, "admin.aliasAddError"));
    } finally {
      setBusy(false);
    }
  }

  async function createSubstitute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/v1/substitutes", {
        method: "POST",
        body: JSON.stringify({
          ingredientId: Number(substituteIngredientId),
          substituteId: Number(substituteId),
          note: substituteNote,
          noteBn: substituteNoteBn,
        }),
      });
      setSubstituteNote("");
      setSubstituteNoteBn("");
      setNotice(t("admin.substituteAdded"));
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, "admin.substituteAddError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubstitute(item: Substitute) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<void>("/api/v1/substitutes", {
        method: "DELETE",
        body: JSON.stringify({ ingredientId: item.ingredientId, substituteId: item.substituteId }),
      });
      setNotice(t("admin.substituteRemoved"));
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, "admin.substituteRemoveError"));
    } finally {
      setBusy(false);
    }
  }

  // Shared wrapper for the small catalog mutations below.
  async function mutate(action: () => Promise<unknown>, done: string, failed: MessageKey) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(done);
      await loadCatalog();
    } catch (cause) {
      setError(errorText(cause, failed));
    } finally {
      setBusy(false);
    }
  }

  function renameIngredient(item: Ingredient) {
    const name = window.prompt(t("admin.renamePrompt", { name: item.name }), item.name)?.trim();
    if (!name || name === item.name) return;
    void mutate(
      () =>
        apiRequest(`/api/v1/ingredients/${item.ingredientId}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }),
      t("admin.renamed"),
      "admin.renameError",
    );
  }

  function setBanglaName(item: Ingredient) {
    const nameBn = window.prompt(t("admin.banglaPrompt", { name: item.name }), item.nameBn ?? "")?.trim();
    if (nameBn === undefined || nameBn === (item.nameBn ?? "")) return;
    void mutate(
      () =>
        apiRequest(`/api/v1/ingredients/${item.ingredientId}`, {
          method: "PATCH",
          body: JSON.stringify({ nameBn }),
        }),
      t("admin.banglaSaved"),
      "admin.ingredientUpdateError",
    );
  }

  // Staples (salt, oil…) count a quarter as much as other ingredients in the match score.
  function toggleStaple(item: Ingredient) {
    void mutate(
      () =>
        apiRequest(`/api/v1/ingredients/${item.ingredientId}`, {
          method: "PATCH",
          body: JSON.stringify({ isStaple: !item.isStaple }),
        }),
      item.isStaple ? t("admin.stapleOff") : t("admin.stapleOn"),
      "admin.ingredientUpdateError",
    );
  }

  function deleteIngredient(item: Ingredient) {
    if (!window.confirm(t("admin.confirmDeleteIngredient", { name: item.name }))) return;
    void mutate(
      () => apiRequest<void>(`/api/v1/ingredients/${item.ingredientId}`, { method: "DELETE" }),
      t("admin.deleted", { title: item.name }),
      "admin.ingredientDeleteError",
    );
  }

  function deleteAlias(alias: Alias) {
    void mutate(
      () =>
        apiRequest<void>(`/api/v1/ingredients/${alias.ingredientId}/aliases/${alias.aliasId}`, {
          method: "DELETE",
        }),
      t("admin.aliasRemoved", { alias: alias.alias }),
      "admin.aliasRemoveError",
    );
  }

  function createLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate(
      async () => {
        await apiRequest(`/api/v1/${labelKind}`, {
          method: "POST",
          body: JSON.stringify({ name: labelName, nameBn: labelNameBn }),
        });
        setLabelName("");
        setLabelNameBn("");
      },
      labelKind === "cuisines" ? t("admin.cuisineAdded") : t("admin.tagAdded"),
      "admin.labelAddError",
    );
  }

  function updateStep(index: number, change: Partial<Step>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item, itemIndex) => (itemIndex === index ? { ...item, ...change } : item)),
    }));
  }

  // Ingredient filters match the English or the Bangla name.
  function matchesSearch(item: Ingredient) {
    const search = ingredientSearch.trim().toLowerCase();
    return item.name.toLowerCase().includes(search) || Boolean(item.nameBn?.includes(search));
  }

  const ingredientNameById = new Map(
    (catalog?.ingredients ?? []).map((item) => [item.ingredientId, item.name]),
  );
  if (loading && !catalog)
    return (
      <div role="status" className="rounded-3xl bg-white/60 px-5 py-12 text-center font-semibold">
        {t("admin.loading")}
      </div>
    );
  if (!catalog)
    return (
      <EmptyState
        title={t("admin.unavailableTitle")}
        description={error || t("admin.unavailableDescription")}
      />
    );

  return (
    <>
      <PageHeading
        eyebrow={t("admin.eyebrow")}
        title={t("admin.title")}
        description={t("admin.description")}
      />
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-5 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold">
          {notice}
        </p>
      )}
      <div
        role="tablist"
        aria-label={t("admin.sections")}
        className="mb-6 flex w-fit gap-2 rounded-full bg-line p-1.5"
      >
        {(["recipes", "ingredients"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`min-h-11 rounded-full px-5 text-sm font-extrabold capitalize ${tab === value ? "bg-white shadow-sm" : "text-muted"}`}
          >
            {value === "recipes" ? t("admin.tabRecipes") : t("admin.tabIngredients")}
          </button>
        ))}
      </div>

      {tab === "recipes" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
          <Panel>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
                  {draft.recipeId ? t("admin.editRecipe") : t("admin.newRecipe")}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {draft.recipeId ? t("admin.updateDish") : t("admin.addDish")}
                </h2>
              </div>
              {draft.recipeId && (
                <button
                  type="button"
                  onClick={() => setDraft(newRecipe())}
                  className="text-sm font-bold underline underline-offset-4"
                >
                  {t("admin.cancelEdit")}
                </button>
              )}
            </div>
            <form onSubmit={saveRecipe} className="space-y-4">
              <div>
                <label htmlFor="recipe-title" className="mb-1.5 block text-sm font-bold">
                  {t("admin.recipeTitle")}
                </label>
                <input
                  id="recipe-title"
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="recipe-title-bn" className="mb-1.5 block text-sm font-bold">
                  {t("admin.recipeTitleBn")}{" "}
                  <span className="font-medium text-subtle">{t("common.optional")}</span>
                </label>
                <input
                  id="recipe-title-bn"
                  lang="bn"
                  maxLength={200}
                  value={draft.titleBn}
                  onChange={(event) => setDraft((current) => ({ ...current, titleBn: event.target.value }))}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs leading-5 text-muted">{t("admin.banglaHelp")}</p>
              </div>
              <div>
                <label htmlFor="recipe-description" className="mb-1.5 block text-sm font-bold">
                  {t("admin.recipeDescription")}
                </label>
                <textarea
                  id="recipe-description"
                  maxLength={5000}
                  rows={3}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div>
                <label htmlFor="recipe-description-bn" className="mb-1.5 block text-sm font-bold">
                  {t("admin.recipeDescriptionBn")}{" "}
                  <span className="font-medium text-subtle">{t("common.optional")}</span>
                </label>
                <textarea
                  id="recipe-description-bn"
                  lang="bn"
                  maxLength={5000}
                  rows={3}
                  value={draft.descriptionBn}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, descriptionBn: event.target.value }))
                  }
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="recipe-cuisine" className="mb-1.5 block text-sm font-bold">
                    {t("admin.cuisine")}
                  </label>
                  <select
                    id="recipe-cuisine"
                    value={draft.cuisineId ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        cuisineId: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">{t("admin.notSpecified")}</option>
                    {catalog.cuisines.map((item) => (
                      <option key={item.cuisineId} value={item.cuisineId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="recipe-time" className="mb-1.5 block text-sm font-bold">
                    {t("admin.minutes")}
                  </label>
                  <input
                    id="recipe-time"
                    type="number"
                    min={1}
                    max={1440}
                    required
                    value={draft.cookingTimeMin}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, cookingTimeMin: Number(event.target.value) }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="recipe-image" className="mb-1.5 block text-sm font-bold">
                  {t("admin.imageUrl")}{" "}
                  <span className="font-medium text-subtle">{t("common.optional")}</span>
                </label>
                <input
                  id="recipe-image"
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))}
                  className={inputClass}
                  placeholder="https://…"
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-extrabold">
                  {t("admin.ingredients")}{" "}
                  <span className="font-medium text-subtle">
                    {t("admin.selectedCount", { count: draft.ingredientIds.length })}
                  </span>
                </legend>
                <input
                  aria-label={t("admin.searchIngredients")}
                  value={ingredientSearch}
                  onChange={(event) => setIngredientSearch(event.target.value)}
                  className={`${inputClass} mb-2`}
                  placeholder={t("admin.filterIngredients")}
                />
                <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-2xl bg-cream/70 p-2">
                  {catalog.ingredients
                    .filter((item) => matchesSearch(item))
                    .map((item) => (
                      <label
                        key={item.ingredientId}
                        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={draft.ingredientIds.includes(item.ingredientId)}
                          onChange={() => toggleId("ingredientIds", item.ingredientId)}
                          className="size-4 accent-coral-deep"
                        />
                        {item.name}
                      </label>
                    ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-extrabold">{t("admin.dietaryTags")}</legend>
                <div className="flex flex-wrap gap-2">
                  {catalog.dietaryTags.map((tag) => (
                    <label
                      key={tag.tagId}
                      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-bold ${draft.dietaryTagIds.includes(tag.tagId) ? "bg-lavender" : "bg-cream"}`}
                    >
                      <input
                        type="checkbox"
                        checked={draft.dietaryTagIds.includes(tag.tagId)}
                        onChange={() => toggleId("dietaryTagIds", tag.tagId)}
                        className="size-4 accent-grape"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-extrabold">{t("admin.instructions")}</legend>
                <div className="space-y-2">
                  {draft.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-2 grid size-8 shrink-0 place-items-center rounded-full bg-butter text-xs font-black"
                      >
                        {digits(index + 1)}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <label className="sr-only" htmlFor={`step-${index}`}>
                          {t("admin.stepLabel", { count: index + 1 })}
                        </label>
                        <textarea
                          id={`step-${index}`}
                          required
                          maxLength={5000}
                          rows={2}
                          value={step.instruction}
                          onChange={(event) => updateStep(index, { instruction: event.target.value })}
                          className={`${inputClass} min-h-0 resize-y`}
                          placeholder={t("admin.stepPlaceholder")}
                        />
                        <label className="sr-only" htmlFor={`step-bn-${index}`}>
                          {t("admin.stepLabelBn", { count: index + 1 })}
                        </label>
                        <textarea
                          id={`step-bn-${index}`}
                          lang="bn"
                          maxLength={5000}
                          rows={2}
                          value={step.instructionBn}
                          onChange={(event) => updateStep(index, { instructionBn: event.target.value })}
                          className={`${inputClass} min-h-0 resize-y`}
                          placeholder={t("admin.stepPlaceholderBn")}
                        />
                      </div>
                      {draft.steps.length > 1 && (
                        <button
                          type="button"
                          aria-label={t("admin.removeStep", { count: index + 1 })}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              steps: current.steps.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                          className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl text-lg font-bold text-danger hover:bg-blush"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      steps: [...current.steps, { instruction: "", instructionBn: "" }],
                    }))
                  }
                  className="mt-3 min-h-10 rounded-full px-3 text-sm font-bold underline underline-offset-4"
                >
                  {t("admin.addStep")}
                </button>
              </fieldset>
              <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-mint/60 px-4 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isPublished: event.target.checked }))
                  }
                  className="size-5 accent-success"
                />
                {t("admin.publish")}
              </label>
              <button
                type="submit"
                disabled={
                  busy ||
                  draft.ingredientIds.length === 0 ||
                  draft.steps.every((step) => !step.instruction.trim())
                }
                className={`${buttonPrimary} w-full`}
              >
                {busy ? t("common.saving") : draft.recipeId ? t("admin.saveChanges") : t("admin.createRecipe")}
              </button>
            </form>
          </Panel>

          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{t("admin.catalogTitle")}</h2>
                <p className="mt-1 text-sm text-muted">
                  {t("admin.catalogCount", { count: catalog.recipes.length })}
                </p>
              </div>
            </div>
            {catalog.recipes.length ? (
              <ul className="space-y-3">
                {catalog.recipes.map((recipe) => (
                  <li
                    key={recipe.recipeId}
                    className="flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-white/75 p-4 shadow-clay sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold">{recipe.title}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${recipe.isPublished ? "bg-mint" : "bg-butter"}`}
                        >
                          {recipe.isPublished ? t("admin.published") : t("admin.draft")}
                        </span>
                      </div>
                      {recipe.titleBn && (
                        <p lang="bn" className="mt-0.5 text-sm font-semibold text-muted">
                          {recipe.titleBn}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        {t("admin.recipeMeta", {
                          minutes: recipe.cookingTimeMin,
                          ingredients: recipe.ingredientIds.length,
                          steps: recipe.steps.length,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`/recipes/${recipe.recipeId}`} className={buttonSecondary}>
                        {t("admin.preview")}
                      </a>
                      <button type="button" onClick={() => editRecipe(recipe)} className={buttonSecondary}>
                        {t("admin.edit")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteRecipe(recipe)}
                        className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-bold text-danger hover:bg-blush focus-visible:outline-4 focus-visible:outline-danger disabled:opacity-50"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title={t("admin.noRecipesTitle")}
                description={t("admin.noRecipesDescription")}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <Panel>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
                {t("admin.catalogEyebrow")}
              </p>
              <h2 className="mt-1 text-2xl font-black">{t("admin.addIngredient")}</h2>
              <form onSubmit={createIngredient} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="ingredient-name" className="mb-1.5 block text-sm font-bold">
                    {t("admin.ingredientName")}
                  </label>
                  <input
                    id="ingredient-name"
                    required
                    maxLength={100}
                    value={ingredientName}
                    onChange={(event) => setIngredientName(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ingredient-name-bn" className="mb-1.5 block text-sm font-bold">
                    {t("admin.ingredientNameBn")}{" "}
                    <span className="font-medium text-subtle">{t("common.optional")}</span>
                  </label>
                  <input
                    id="ingredient-name-bn"
                    lang="bn"
                    maxLength={100}
                    value={ingredientNameBn}
                    onChange={(event) => setIngredientNameBn(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ingredient-aliases" className="mb-1.5 block text-sm font-bold">
                    {t("admin.aliases")}{" "}
                    <span className="font-medium text-subtle">{t("admin.commaSeparated")}</span>
                  </label>
                  <input
                    id="ingredient-aliases"
                    value={aliasesInput}
                    onChange={(event) => setAliasesInput(event.target.value)}
                    className={inputClass}
                    placeholder={t("admin.aliasesPlaceholder")}
                  />
                </div>
                <button disabled={busy} className={buttonPrimary}>
                  {busy ? t("common.saving") : t("admin.addIngredientButton")}
                </button>
              </form>
            </Panel>
            <Panel>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
                {t("admin.searchEyebrow")}
              </p>
              <h2 className="mt-1 text-2xl font-black">{t("admin.addAlias")}</h2>
              <form onSubmit={createAlias} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="alias-ingredient" className="mb-1.5 block text-sm font-bold">
                    {t("admin.ingredient")}
                  </label>
                  <select
                    id="alias-ingredient"
                    required
                    value={aliasIngredientId}
                    onChange={(event) => setAliasIngredientId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">{t("admin.chooseIngredient")}</option>
                    {catalog.ingredients.map((item) => (
                      <option key={item.ingredientId} value={item.ingredientId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="alias-name" className="mb-1.5 block text-sm font-bold">
                    {t("admin.alias")}
                  </label>
                  <input
                    id="alias-name"
                    required
                    maxLength={100}
                    value={aliasText}
                    onChange={(event) => setAliasText(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <button disabled={busy} className={buttonPrimary}>
                  {t("admin.addAliasButton")}
                </button>
              </form>
            </Panel>
            <Panel>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
                {t("admin.filtersEyebrow")}
              </p>
              <h2 className="mt-1 text-2xl font-black">{t("admin.addLabel")}</h2>
              <form onSubmit={createLabel} className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="label-kind" className="mb-1.5 block text-sm font-bold">
                      {t("admin.type")}
                    </label>
                    <select
                      id="label-kind"
                      value={labelKind}
                      onChange={(event) => setLabelKind(event.target.value as typeof labelKind)}
                      className={inputClass}
                    >
                      <option value="cuisines">{t("admin.typeCuisine")}</option>
                      <option value="dietary-tags">{t("admin.typeTag")}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="label-name" className="mb-1.5 block text-sm font-bold">
                      {t("admin.name")}
                    </label>
                    <input
                      id="label-name"
                      required
                      maxLength={50}
                      value={labelName}
                      onChange={(event) => setLabelName(event.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="label-name-bn" className="mb-1.5 block text-sm font-bold">
                    {t("admin.ingredientNameBn")}{" "}
                    <span className="font-medium text-subtle">{t("common.optional")}</span>
                  </label>
                  <input
                    id="label-name-bn"
                    lang="bn"
                    maxLength={50}
                    value={labelNameBn}
                    onChange={(event) => setLabelNameBn(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <p className="text-xs leading-5 text-muted">
                  {t("admin.existing")}{" "}
                  {[...catalog.cuisines, ...catalog.dietaryTags].map((item) => item.name).join(" · ") ||
                    t("admin.noneYet")}
                </p>
                <button disabled={busy} className={buttonPrimary}>
                  {t("admin.add")}
                </button>
              </form>
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
                {t("admin.swapsEyebrow")}
              </p>
              <h2 className="mt-1 text-2xl font-black">{t("admin.addSubstitute")}</h2>
              <form onSubmit={createSubstitute} className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="missing-item" className="mb-1.5 block text-sm font-bold">
                      {t("admin.toReplace")}
                    </label>
                    <select
                      id="missing-item"
                      required
                      value={substituteIngredientId}
                      onChange={(event) => setSubstituteIngredientId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t("admin.chooseIngredient")}</option>
                      {catalog.ingredients.map((item) => (
                        <option key={item.ingredientId} value={item.ingredientId}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="replacement-item" className="mb-1.5 block text-sm font-bold">
                      {t("admin.possibleSubstitute")}
                    </label>
                    <select
                      id="replacement-item"
                      required
                      value={substituteId}
                      onChange={(event) => setSubstituteId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t("admin.chooseIngredient")}</option>
                      {catalog.ingredients.map((item) => (
                        <option key={item.ingredientId} value={item.ingredientId}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="sub-note" className="mb-1.5 block text-sm font-bold">
                    {t("admin.note")} <span className="font-medium text-subtle">{t("common.optional")}</span>
                  </label>
                  <input
                    id="sub-note"
                    maxLength={255}
                    value={substituteNote}
                    onChange={(event) => setSubstituteNote(event.target.value)}
                    className={inputClass}
                    placeholder={t("admin.notePlaceholder")}
                  />
                </div>
                <div>
                  <label htmlFor="sub-note-bn" className="mb-1.5 block text-sm font-bold">
                    {t("admin.noteBn")} <span className="font-medium text-subtle">{t("common.optional")}</span>
                  </label>
                  <input
                    id="sub-note-bn"
                    lang="bn"
                    maxLength={255}
                    value={substituteNoteBn}
                    onChange={(event) => setSubstituteNoteBn(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <button disabled={busy} className={buttonPrimary}>
                  {t("admin.addSubstituteButton")}
                </button>
              </form>
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="font-extrabold">{t("admin.currentSwaps")}</h3>
                {catalog.substitutes.length ? (
                  <ul className="mt-3 space-y-2">
                    {catalog.substitutes.map((item) => (
                      <li
                        key={`${item.ingredientId}-${item.substituteId}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-lavender/40 px-3 py-2.5 text-sm"
                      >
                        <span>
                          <strong>
                            {ingredientNameById.get(item.ingredientId) ?? t("admin.fallbackIngredient")}
                          </strong>{" "}
                          → {ingredientNameById.get(item.substituteId) ?? t("admin.fallbackSubstitute")}
                          {item.note && <span className="block text-xs text-muted">{item.note}</span>}
                          {item.noteBn && (
                            <span lang="bn" className="block text-xs text-muted">
                              {item.noteBn}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={t("admin.removeNamed", {
                            name: ingredientNameById.get(item.substituteId) ?? t("admin.fallbackSubstitute"),
                          })}
                          onClick={() => void deleteSubstitute(item)}
                          className="min-h-10 rounded-lg px-3 font-bold text-danger hover:bg-white/70"
                        >
                          {t("common.remove")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">{t("admin.noSubstitutes")}</p>
                )}
              </div>
            </Panel>
          </div>
          <Panel className="xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
                  {t("admin.dictionaryEyebrow")}
                </p>
                <h2 className="mt-1 text-2xl font-black">{t("admin.dictionaryTitle")}</h2>
              </div>
              <input
                aria-label={t("admin.filterIngredients")}
                value={ingredientSearch}
                onChange={(event) => setIngredientSearch(event.target.value)}
                className={`${inputClass} max-w-sm`}
                placeholder={t("admin.searchIngredients")}
              />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.ingredients
                .filter(
                  (item) =>
                    matchesSearch(item) ||
                    catalog.aliases.some(
                      (alias) =>
                        alias.ingredientId === item.ingredientId &&
                        alias.alias.toLowerCase().includes(ingredientSearch.toLowerCase()),
                    ),
                )
                .map((item) => (
                  <li key={item.ingredientId} className="rounded-2xl bg-cream/80 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 break-words font-extrabold">
                        {item.name}
                        {item.isStaple && (
                          <span className="ml-2 rounded-full bg-butter px-2 py-0.5 text-[11px] font-bold">
                            {t("admin.staple")}
                          </span>
                        )}
                      </h3>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleStaple(item)}
                          aria-pressed={Boolean(item.isStaple)}
                          aria-label={t(item.isStaple ? "admin.unmarkStaple" : "admin.markStaple", {
                            name: item.name,
                          })}
                          className="min-h-11 rounded-lg px-2 text-xs font-bold underline underline-offset-4 hover:bg-white focus-visible:outline-4 focus-visible:outline-cocoa disabled:opacity-50"
                        >
                          {item.isStaple ? t("admin.notStaple") : t("admin.staple")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => renameIngredient(item)}
                          aria-label={t("admin.renameNamed", { name: item.name })}
                          className="min-h-11 rounded-lg px-2 text-xs font-bold underline underline-offset-4 hover:bg-white focus-visible:outline-4 focus-visible:outline-cocoa disabled:opacity-50"
                        >
                          {t("admin.rename")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setBanglaName(item)}
                          aria-label={t("admin.banglaNamed", { name: item.name })}
                          className="min-h-11 rounded-lg px-2 text-xs font-bold underline underline-offset-4 hover:bg-white focus-visible:outline-4 focus-visible:outline-cocoa disabled:opacity-50"
                        >
                          {t("admin.bangla")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deleteIngredient(item)}
                          aria-label={t("admin.deleteNamed", { name: item.name })}
                          className="min-h-11 rounded-lg px-2 text-xs font-bold text-danger hover:bg-blush focus-visible:outline-4 focus-visible:outline-danger disabled:opacity-50"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </div>
                    <p lang={item.nameBn ? "bn" : undefined} className="text-sm font-semibold text-muted">
                      {item.nameBn || t("admin.noBangla")}
                    </p>
                    {catalog.aliases.some((alias) => alias.ingredientId === item.ingredientId) ? (
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {catalog.aliases
                          .filter((alias) => alias.ingredientId === item.ingredientId)
                          .map((alias) => (
                            <li
                              key={alias.aliasId}
                              className="flex items-center rounded-full bg-white pl-2.5 text-xs font-semibold text-muted"
                            >
                              {alias.alias}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => deleteAlias(alias)}
                                aria-label={t("admin.removeAlias", { alias: alias.alias })}
                                className="grid size-8 place-items-center rounded-full font-bold text-danger hover:bg-blush focus-visible:outline-4 focus-visible:outline-danger disabled:opacity-50"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs leading-5 text-muted">{t("admin.noAliases")}</p>
                    )}
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
