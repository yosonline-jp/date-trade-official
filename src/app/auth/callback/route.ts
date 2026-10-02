import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const target = url.searchParams.get("redirect_to");
  const next =
    target?.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("\\")
      ? target
      : "/dashboard";
  const site = process.env.NEXT_PUBLIC_MAIN_URL;
  const origin = site
    ? new URL(site.startsWith("http") ? site : `https://${site}`).origin
    : url.origin;
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(
    new URL("/sign-in?error=認証リンクを確認してください", origin),
  );
}
