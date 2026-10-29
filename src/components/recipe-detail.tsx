"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { buttonSecondary, EmptyState, Panel, RecipeImage } from "@/components/ui";

type Ingredient = { ingredientId: number | null; name: string; inPantry: boolean; amount?: string | null; unit?: string | null; substitutes?: Array<{ ingredientId: number; name: string; note: string | null }> };
type RecipeDetailData = {
  recipeId?: number;
  source?: string;
  sourceId?: string;
  title: string;
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
};

export function RecipeDetail({ source, id }: { source: "cookmatch" | "spoonacular"; id: string }) {
  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cooking, setCooking] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const path = source === "cookmatch" ? `/api/v1/recipes/${encodeURIComponent(id)}` : `/api/v1/providers/recipes/${source}/${encodeURIComponent(id)}`;
    apiRequest<RecipeDetailData>(path)
      .then((data) => { if (active) { setRecipe(data); setError(""); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the recipe."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [source, id]);

  if (loading) return <div role="status" className="rounded-3xl bg-white/60 px-5 py-12 text-center font-semibold">Opening the recipe…</div>;
  if (error || !recipe) return <EmptyState title="We couldn’t open that recipe" description={error || "It may have been removed or is no longer available."} action={<Link href="/recipes" className={buttonSecondary}>Back to recipes</Link>} />;

  const currentStep = recipe.steps[stepIndex];
  return (
    <>
      <div className="mb-5"><Link href="/recipes" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-extrabold text-[#765b4d] hover:bg-white/70 focus-visible:outline-4 focus-visible:outline-cocoa">← Back to recipes</Link></div>
      <section className="overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/80 shadow-clay">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <RecipeImage src={recipe.imageUrl} alt={recipe.title} className="min-h-64 w-full sm:min-h-80 lg:min-h-[28rem]" />
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#8b604d]">{source === "spoonacular" ? "Spoonacular recipe" : "CookMatch recipe"}</p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{recipe.title}</h1>
            {recipe.description && <p className="mt-4 leading-7 text-[#765b4d]">{recipe.description}</p>}
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
              <span className="rounded-full bg-mint px-3 py-2">{Math.round(recipe.matchScore)}% pantry match</span>
              {recipe.missingCount > 0 && <span className="rounded-full bg-peach px-3 py-2">{recipe.missingCount} missing</span>}
              {recipe.cookingTimeMin && <span className="rounded-full bg-butter px-3 py-2">{recipe.cookingTimeMin} min</span>}
              {recipe.cuisine && <span className="rounded-full bg-lavender px-3 py-2">{recipe.cuisine}</span>}
            </div>
            {recipe.dietaryTags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{recipe.dietaryTags.map((tag) => <span key={tag} className="rounded-full border border-[#d5c9e8] px-3 py-1.5 text-xs font-bold">{tag}</span>)}</div>}
            {recipe.steps.length > 0 && <button type="button" onClick={() => { setCooking((value) => !value); setStepIndex(0); }} className="mt-7 min-h-12 w-fit rounded-full bg-coral px-6 py-3 text-sm font-extrabold shadow-[0_5px_0_#db6e58] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa">
              {cooking ? "Close cooking mode" : "Start cooking"}
            </button>}
          </div>
        </div>
      </section>

      {cooking && currentStep && <Panel className="mt-6 border-[#edcf8a] bg-[#fff4ce]">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#86642d]">Cooking mode</p><h2 className="mt-1 text-lg font-extrabold">Step {stepIndex + 1} of {recipe.steps.length}</h2></div><progress className="h-3 w-full max-w-48 overflow-hidden rounded-full accent-[#d96f58]" value={stepIndex + 1} max={recipe.steps.length} aria-label={`Step ${stepIndex + 1} of ${recipe.steps.length}`} /></div>
        <p className="my-7 max-w-3xl text-2xl font-bold leading-relaxed">{currentStep.instruction}</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))} className={buttonSecondary}>Previous step</button><button type="button" onClick={() => stepIndex === recipe.steps.length - 1 ? setCooking(false) : setStepIndex((value) => value + 1)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-cocoa px-5 py-2.5 text-sm font-extrabold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa">{stepIndex === recipe.steps.length - 1 ? "Finish cooking" : "Next step"}</button></div>
      </Panel>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">Gather these</p><h2 className="mt-1 text-2xl font-black">Ingredients</h2></div><span className="rounded-full bg-mint px-3 py-1.5 text-sm font-black">{recipe.ingredients.filter((item) => item.inPantry).length}/{recipe.ingredients.length} have</span></div>
          {recipe.ingredients.length ? <ul className="space-y-3">{recipe.ingredients.map((item, index) => <li key={`${item.ingredientId ?? item.name}-${index}`} className="rounded-2xl bg-cream/80 p-3.5">
            <div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${item.inPantry ? "bg-mint" : "bg-peach"}`}>{item.inPantry ? "✓" : "·"}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3"><span className="font-bold">{item.name}</span><span className="text-xs font-medium text-[#765b4d]">{item.amount}{item.unit ? ` ${item.unit}` : ""}</span></div><span className={`mt-1 block text-xs font-bold ${item.inPantry ? "text-[#477456]" : "text-[#8b493d]"}`}>{item.inPantry ? "In your pantry" : "Missing"}</span>
              {!item.inPantry && item.substitutes?.map((substitute) => <p key={substitute.ingredientId} className="mt-2 rounded-xl bg-lavender/50 px-3 py-2 text-xs leading-5"><strong>Possible substitute: {substitute.name}.</strong>{substitute.note ? ` ${substitute.note}` : ""}</p>)}
            </div></div>
          </li>)}</ul> : <p className="text-sm text-[#765b4d]">Ingredient information is not available for this recipe.</p>}
        </Panel>

        <Panel>
          <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.15em] text-[#8b604d]">Take it one step at a time</p><h2 className="mt-1 text-2xl font-black">Cooking instructions</h2></div>
          {recipe.steps.length ? <ol className="space-y-4">{recipe.steps.map((step) => <li key={step.stepNumber} className="flex gap-4 rounded-2xl bg-cream/80 p-4 sm:p-5"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral font-black">{step.stepNumber}</span><p className="pt-1 leading-7">{step.instruction}</p></li>)}</ol>
            : <div className="rounded-2xl bg-butter/60 p-5"><p className="font-extrabold">Instructions aren’t available from this source.</p><p className="mt-1 text-sm leading-6 text-[#765b4d]">We won’t make up cooking steps. Check the original recipe if a source link is available.</p></div>}
          {recipe.attribution && <p className="mt-5 text-xs leading-5 text-[#765b4d]">{recipe.attribution}</p>}
          {recipe.sourceUrl && <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center font-bold text-[#6a4d9b] underline decoration-lavender decoration-2 underline-offset-4 focus-visible:outline-4 focus-visible:outline-cocoa">View original recipe <span className="sr-only">(opens in a new tab)</span></a>}
        </Panel>
      </div>
    </>
  );
}
