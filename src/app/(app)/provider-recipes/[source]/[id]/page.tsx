import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/recipe-detail";

export const metadata: Metadata = { title: "Provider recipe · CookMatch" };

export default async function ProviderRecipePage({ params }: { params: Promise<{ source: string; id: string }> }) {
  const { source, id } = await params;
  if (source !== "spoonacular") notFound();
  return <RecipeDetail source="spoonacular" id={id} />;
}
