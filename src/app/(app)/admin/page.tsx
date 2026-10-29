import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin-workspace";

export const metadata: Metadata = { title: "Kitchen admin · CookMatch" };

export default function AdminPage() {
  return <AdminWorkspace />;
}
