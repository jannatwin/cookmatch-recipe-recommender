import { RecipesWorkspace } from "@/components/recipes-workspace";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.recipes");

export default function RecipesPage() {
  return <RecipesWorkspace />;
}
