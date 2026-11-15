import type { Metadata } from "next";
import { PantryWorkspace } from "@/components/pantry-workspace";

export const metadata: Metadata = { title: "My pantry · CookMatch" };

export default function PantryPage() {
  return <PantryWorkspace />;
}
