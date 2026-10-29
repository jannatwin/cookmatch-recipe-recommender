import type { Metadata } from "next";
import { RecipeDetail } from "@/components/recipe-detail";

export const metadata: Metadata = { title: "Recipe · CookMatch" };

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipeDetail source="cookmatch" id={id} />;
}
