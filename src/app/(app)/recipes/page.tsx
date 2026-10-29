import type { Metadata } from "next";
import { RecipesWorkspace } from "@/components/recipes-workspace";

export const metadata: Metadata = { title: "Recipes · CookMatch" };

export default function RecipesPage() {
  return <RecipesWorkspace />;
}
