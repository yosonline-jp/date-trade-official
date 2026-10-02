import { WorkspaceShell } from "@/components/workspace/shell";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
export const metadata = { title: "マイワークスペース | デイトレード.net" };
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await db
    .from("users")
    .select("nickname, role")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <WorkspaceShell
      signedIn
      nickname={profile?.nickname}
      admin={profile?.role === "admin"}
    >
      {children}
    </WorkspaceShell>
  );
}
