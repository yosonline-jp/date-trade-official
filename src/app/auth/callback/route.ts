import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { safeRedirectPath, signInUrl } from "@/lib/auth/redirect";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("redirect_to"));
  const site = process.env.NEXT_PUBLIC_MAIN_URL;
  const origin = site
    ? new URL(site.startsWith("http") ? site : `https://${site}`).origin
    : url.origin;
  if (code) {
    try {
      const db = await createClient();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch {
      // Return to login with the destination intact if the exchange is unavailable.
    }
  }
  return NextResponse.redirect(
    new URL(signInUrl(next, "認証リンクを確認してください"), origin),
  );
}
