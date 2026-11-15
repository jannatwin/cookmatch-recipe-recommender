import { AdminWorkspace } from "@/components/admin-workspace";
import { pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.admin");

export default function AdminPage() {
  return <AdminWorkspace />;
}
