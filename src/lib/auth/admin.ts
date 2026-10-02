import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
export async function requireAdmin() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile, error } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin")
    throw new Error("コンテンツ管理には管理者権限が必要です。");
  return { db, user };
}
