import { WorkspaceShell } from "@/components/workspace/shell";
import { createClient } from "@/utils/supabase/server";
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const profile = user
    ? (
        await db
          .from("users")
          .select("nickname, role")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : null;
  return (
    <WorkspaceShell
      signedIn={!!user}
      nickname={profile?.nickname}
      admin={profile?.role === "admin"}
    >
      {children}
    </WorkspaceShell>
  );
}
