import { requireAdmin } from "@/lib/auth/admin";
export default async function StockMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
