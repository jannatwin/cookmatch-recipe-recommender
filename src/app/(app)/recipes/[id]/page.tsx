import { RecipeDetail } from "@/components/recipe-detail";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.recipe");

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipeDetail source="cookmatch" id={id} />;
}
