import { SavedRecipes } from "@/components/saved-recipes";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.saved");

export default function SavedPage() {
  return <SavedRecipes />;
}
