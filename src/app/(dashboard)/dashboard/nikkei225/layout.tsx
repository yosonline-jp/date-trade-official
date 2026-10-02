import { requireAdmin } from "@/lib/auth/admin";
export default async function NikkeiAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
