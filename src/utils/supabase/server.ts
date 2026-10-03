import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Components refresh through middleware. */
          }
        },
      },
    },
  );
};
/** Share verified auth only within one Server Component render request. */
export const getRequestUser = cache(async () => {
  const db = await createClient();
  return db.auth.getUser();
});
/** Server-only privileged client. Never forwards browser authentication cookies. */
export const createRoleClient = async () => {
  if (typeof window !== "undefined")
    throw new Error("Privileged Supabase client is server-only");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ROLE_KEY;
  if (!key) throw new Error("Supabaseのサーバー権限キーが設定されていません。");
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
