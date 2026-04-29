import { AdminSitesManager } from "@/components/dashboard/admin-sites-manager";
import { requireAuth } from "@/lib/auth";

export default async function SitesPage() {
  await requireAuth("admin");

  return <AdminSitesManager />;
}
