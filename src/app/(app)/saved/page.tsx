import type { Metadata } from "next";
import { SavedRecipes } from "@/components/saved-recipes";

export const metadata: Metadata = { title: "Saved recipes · CookMatch" };

export default function SavedPage() {
  return <SavedRecipes />;
}
