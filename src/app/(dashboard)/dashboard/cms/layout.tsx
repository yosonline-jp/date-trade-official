import { requireAdmin } from "@/lib/auth/admin";
export default async function ContentAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
