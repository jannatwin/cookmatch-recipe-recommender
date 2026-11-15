import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/recipe-detail";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.providerRecipe");

export default async function ProviderRecipePage({
  params,
}: {
  params: Promise<{ source: string; id: string }>;
}) {
  const { source, id } = await params;
  if (source !== "spoonacular") notFound();
  return <RecipeDetail source="spoonacular" id={id} />;
}
