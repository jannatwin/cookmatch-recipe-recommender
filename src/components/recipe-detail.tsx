"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { useI18n } from "@/components/locale-provider";
import { linkify } from "@/lib/linkify";
import { browserStore, rememberRecentRecipe } from "@/lib/recent-recipes";
import { buttonSecondary, EmptyState, Panel, RecipeImage } from "@/components/ui";

type Ingredient = {
  ingredientId: number | null;
  name: string;
  inPantry: boolean;
  staple?: boolean;
  amount?: string | null;
  unit?: string | null;
  substitutes?: Array<{ ingredientId: number; name: string; note: string | null }>;
};
type RecipeDetailData = {
  recipeId?: number;
  source?: string;
  sourceId?: string;
  title: string;
  titleEn?: string;
  titleBn?: string | null;
  description?: string | null;
  cuisine?: string | null;
  cookingTimeMin?: number | null;
  imageUrl: string | null;
  sourceUrl?: string | null;
  attribution?: string | null;
  dietaryTags: string[];
  ingredients: Ingredient[];
  steps: Array<{ stepNumber: number; instruction: string }>;
  matchScore: number;
  missingCount: number;
  guest?: boolean;
  saved?: boolean;
};

export function RecipeDetail({ source, id }: { source: "cookmatch" | "spoonacular"; id: string }) {
  const { t, errorText, digits, locale } = useI18n();
  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cooking, setCooking] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    const path =
      source === "cookmatch"
        ? `/api/v1/recipes/${encodeURIComponent(id)}`
        : `/api/v1/providers/recipes/${source}/${encodeURIComponent(id)}`;
    apiRequest<RecipeDetailData>(path)
      .then((data) => {
        if (!active) return;
        setRecipe(data);
        setSaved(Boolean(data.saved));
        setError("");
        if (source === "cookmatch" && data.recipeId) {
          rememberRecentRecipe(browserStore(), {
            recipeId: data.recipeId,
            title: data.titleEn ?? data.title,
            titleBn: data.titleBn ?? null,
            imageUrl: data.imageUrl,
          });
        }
      })
      .catch((cause) => {
        if (active) setError(errorText(cause, "detail.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [source, id, errorText]);

  async function toggleSaved() {
    if (!recipe?.recipeId) return;
    setSaving(true);
    setSaveError("");
    try {
      await apiRequest<unknown>(`/api/v1/favorites/${recipe.recipeId}`, { method: saved ? "DELETE" : "PUT" });
      setSaved(!saved);
    } catch (cause) {
      setSaveError(errorText(cause, "detail.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div role="status" className="rounded-3xl bg-white/60 px-5 py-12 text-center font-semibold">
        {t("detail.opening")}
      </div>
    );
  if (error || !recipe)
    return (
      <EmptyState
        title={t("detail.errorTitle")}
        description={error || t("detail.errorDescription")}
        action={
          <Link href="/recipes" className={buttonSecondary}>
            {t("detail.back")}
          </Link>
        }
      />
    );

  const currentStep = recipe.steps[stepIndex];
  return (
    <>
      <div className="mb-5">
        <Link
          href="/recipes"
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-extrabold text-muted hover:bg-white/70 focus-visible:outline-4 focus-visible:outline-cocoa"
        >
          ← {t("detail.back")}
        </Link>
      </div>
      <section className="overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/80 shadow-clay">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            noImageLabel={t("common.noImage", { title: recipe.title })}
            className="min-h-64 w-full sm:min-h-80 lg:min-h-[28rem]"
          />
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-clay">
              {source === "spoonacular" ? t("detail.sourceSpoonacular") : t("detail.sourceCookmatch")}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {recipe.title}
            </h1>
            {recipe.description && <p className="mt-4 leading-7 text-muted">{recipe.description}</p>}
            {source === "spoonacular" && locale !== "en" && (
              <p className="mt-3 text-sm font-semibold text-plum">{t("detail.providerLanguage")}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
              {!recipe.guest && (
                <span className="rounded-full bg-mint px-3 py-2">
                  {t("detail.pantryMatch", { count: Math.round(recipe.matchScore) })}
                </span>
              )}
              {!recipe.guest && recipe.missingCount > 0 && (
                <span className="rounded-full bg-peach px-3 py-2">
                  {t("detail.missingCount", { count: recipe.missingCount })}
                </span>
              )}
              {recipe.cookingTimeMin && (
                <span className="rounded-full bg-butter px-3 py-2">
                  {t("common.minutes", { count: recipe.cookingTimeMin })}
                </span>
              )}
              {recipe.cuisine && <span className="rounded-full bg-lavender px-3 py-2">{recipe.cuisine}</span>}
            </div>
            {recipe.dietaryTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-lavender-line px-3 py-1.5 text-xs font-bold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {recipe.steps.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCooking((value) => !value);
                  setStepIndex(0);
                }}
                className="mt-7 min-h-12 w-fit rounded-full bg-coral px-6 py-3 text-sm font-extrabold shadow-button-lg transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa"
              >
                {cooking ? t("detail.closeCooking") : t("detail.startCooking")}
              </button>
            )}
            {source === "cookmatch" &&
              (recipe.guest ? (
                <Link
                  href={`/login?next=${encodeURIComponent(`/recipes/${id}`)}`}
                  className="mt-3 w-fit text-sm font-bold underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-cocoa"
                >
                  {t("detail.signInToSave")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void toggleSaved()}
                  disabled={saving}
                  aria-pressed={saved}
                  className={`${buttonSecondary} mt-3 w-fit`}
                >
                  <span aria-hidden="true" className="mr-2">
                    {saved ? "♥" : "♡"}
                  </span>
                  {saving ? t("common.saving") : saved ? t("detail.saved") : t("detail.saveRecipe")}
                </button>
              ))}
            {saveError && (
              <p role="alert" className="mt-2 text-sm font-semibold text-danger">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </section>

      {cooking && currentStep && (
        <Panel className="mt-6 border-honey-line bg-butter-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-honey">
                {t("detail.cookingMode")}
              </p>
              <h2 className="mt-1 text-lg font-extrabold">
                {t("detail.stepOf", { current: stepIndex + 1, total: recipe.steps.length })}
              </h2>
            </div>
            <progress
              className="h-3 w-full max-w-48 overflow-hidden rounded-full accent-coral-deep"
              value={stepIndex + 1}
              max={recipe.steps.length}
              aria-label={t("detail.stepOf", { current: stepIndex + 1, total: recipe.steps.length })}
            />
          </div>
          <p className="my-7 max-w-3xl text-2xl font-bold leading-relaxed">{currentStep.instruction}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
              className={buttonSecondary}
            >
              {t("detail.previousStep")}
            </button>
            <button
              type="button"
              onClick={() =>
                stepIndex === recipe.steps.length - 1 ? setCooking(false) : setStepIndex((value) => value + 1)
              }
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-cocoa px-5 py-2.5 text-sm font-extrabold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa"
            >
              {stepIndex === recipe.steps.length - 1 ? t("detail.finishCooking") : t("detail.nextStep")}
            </button>
          </div>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">{t("detail.gather")}</p>
              <h2 className="mt-1 text-2xl font-black">{t("detail.ingredients")}</h2>
            </div>
            {recipe.guest ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/recipes/${id}`)}`}
                className="text-sm font-bold underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-cocoa"
              >
                {t("detail.signInToCheck")}
              </Link>
            ) : (
              <span className="rounded-full bg-mint px-3 py-1.5 text-sm font-black">
                {t("detail.haveCount", {
                  have: recipe.ingredients.filter((item) => item.inPantry).length,
                  total: recipe.ingredients.length,
                })}
              </span>
            )}
          </div>
          {recipe.ingredients.length ? (
            <ul className="space-y-3">
              {recipe.ingredients.map((item, index) => (
                <li
                  key={`${item.ingredientId ?? item.name}-${index}`}
                  className="rounded-2xl bg-cream/80 p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${item.inPantry ? "bg-mint" : "bg-peach"}`}
                    >
                      {item.inPantry ? "✓" : "·"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-bold">{item.name}</span>
                        <span className="text-xs font-medium text-muted">
                          {item.amount ? digits(item.amount) : ""}
                          {item.unit ? ` ${digits(item.unit)}` : ""}
                        </span>
                      </div>
                      {!recipe.guest && (
                        <span
                          className={`mt-1 block text-xs font-bold ${item.inPantry ? "text-success" : "text-danger"}`}
                        >
                          {item.inPantry ? t("detail.inPantry") : t("detail.missing")}
                          {item.staple && (
                            <span className="font-semibold text-muted">{t("detail.staple")}</span>
                          )}
                        </span>
                      )}
                      {!item.inPantry &&
                        item.substitutes?.map((substitute) => (
                          <p
                            key={substitute.ingredientId}
                            className="mt-2 rounded-xl bg-lavender/50 px-3 py-2 text-xs leading-5"
                          >
                            <strong>{t("detail.substitute", { name: substitute.name })}</strong>
                            {substitute.note ? ` ${substitute.note}` : ""}
                          </p>
                        ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t("detail.noIngredients")}</p>
          )}
        </Panel>

        <Panel>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-clay">
              {t("detail.stepsEyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-black">{t("detail.instructions")}</h2>
          </div>
          {recipe.steps.length ? (
            <ol className="space-y-4">
              {recipe.steps.map((step) => (
                <li key={step.stepNumber} className="flex gap-4 rounded-2xl bg-cream/80 p-4 sm:p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral font-black">
                    {digits(step.stepNumber)}
                  </span>
                  <p className="pt-1 leading-7">{step.instruction}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl bg-butter/60 p-5">
              <p className="font-extrabold">{t("detail.noSteps")}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{t("detail.noStepsHelp")}</p>
            </div>
          )}
          {recipe.attribution && (
            <p className="mt-5 break-words text-xs leading-5 text-muted">
              {linkify(recipe.attribution).map((part, index) =>
                part.href ? (
                  <a
                    key={index}
                    href={part.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline underline-offset-2"
                  >
                    {part.href.includes("wikimedia.org") ? t("detail.photoSource") : part.text}
                    <span className="sr-only"> {t("common.opensNewTab")}</span>
                  </a>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </p>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center font-bold text-grape underline decoration-lavender decoration-2 underline-offset-4 focus-visible:outline-4 focus-visible:outline-cocoa"
            >
              {t("detail.viewOriginal")} <span className="sr-only">{t("common.opensNewTab")}</span>
            </a>
          )}
        </Panel>
      </div>
    </>
  );
}
