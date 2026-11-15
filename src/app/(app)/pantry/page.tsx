import { PantryWorkspace } from "@/components/pantry-workspace";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.pantry");

export default function PantryPage() {
  return <PantryWorkspace />;
}
