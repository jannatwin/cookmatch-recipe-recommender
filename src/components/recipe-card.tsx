import Link from "next/link";
import { RecipeImage } from "@/components/ui";

export type MissingIngredient = {
  ingredientId: number | null;
  name: string;
  substitutes?: Array<{ ingredientId: number; name: string; note: string | null }>;
};

export type RecipeSummary = {
  href: string;
  title: string;
  imageUrl: string | null;
  cuisine?: string | null;
  cookingTimeMin?: number | null;
  dietaryTags?: string[];
  matchScore: number;
  requiredCount: number;
  haveCount: number;
  missingCount: number;
  expiringCount?: number;
  almostAchievable?: boolean;
  missingIngredients: MissingIngredient[];
  providerLabel?: string;
};

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const matched = recipe.matchScore >= 80;
  return (
    <article className="group overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/80 shadow-clay transition duration-200 hover:-translate-y-1 hover:shadow-[14px_16px_30px_rgb(120_70_50_/_20%)] motion-reduce:transition-none">
      <Link href={recipe.href} className="block rounded-[1.8rem] focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-cocoa">
        <div className="relative h-48 sm:h-52">
          <div className="absolute inset-0 transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"><RecipeImage src={recipe.imageUrl} alt={recipe.title} className="size-full" /></div>
          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black shadow-sm">{recipe.providerLabel ?? "CookMatch recipe"}</div>
          <div className={`absolute right-3 top-3 min-w-14 rounded-2xl border-2 px-2.5 py-2 text-center shadow-sm ${matched ? "border-[#71ad87] bg-mint" : "border-[#d5a461] bg-butter"}`}>
            <span className="block text-lg font-black leading-none">{Math.round(recipe.matchScore)}%</span><span className="mt-1 block text-[9px] font-extrabold uppercase tracking-wide">match</span>
          </div>
          {recipe.almostAchievable && <div className="absolute bottom-3 left-3 rounded-full bg-butter px-3 py-1.5 text-xs font-extrabold shadow-sm">Almost there · {recipe.missingCount} missing</div>}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="line-clamp-2 text-xl font-black leading-tight">{recipe.title}</h2><p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[#765b4d]">
              {recipe.cuisine && <span>{recipe.cuisine}</span>}{recipe.cookingTimeMin && <span>{recipe.cookingTimeMin} min</span>}
            </p></div>
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-coral/25 text-lg transition group-hover:bg-coral">→</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold">
            <span className="rounded-full bg-mint px-3 py-1">Have {recipe.haveCount}/{recipe.requiredCount}</span>
            <span className={`rounded-full px-3 py-1 ${recipe.missingCount ? "bg-peach" : "bg-[#e8f6eb]"}`}>{recipe.missingCount ? `Missing ${recipe.missingCount}` : "All ingredients"}</span>
          </div>
          {recipe.missingIngredients.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.missingIngredients.slice(0, 3).map((item) => <span key={`${item.ingredientId ?? item.name}-${item.name}`} className="rounded-full bg-[#fff0ed] px-2.5 py-1 text-xs font-bold text-[#793d32]">{item.name}</span>)}
            {recipe.missingIngredients.length > 3 && <span className="px-1 py-1 text-xs font-bold text-[#765b4d]">+{recipe.missingIngredients.length - 3} more</span>}
          </div>}
          {recipe.expiringCount ? <p className="mt-3 text-xs font-bold text-[#765b4d]">◷ Uses {recipe.expiringCount} ingredient{recipe.expiringCount === 1 ? "" : "s"} expiring soon</p> : null}
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{recipe.dietaryTags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-lavender/60 px-2.5 py-1 text-[11px] font-bold">{tag}</span>)}</div>}
        </div>
      </Link>
    </article>
  );
}
