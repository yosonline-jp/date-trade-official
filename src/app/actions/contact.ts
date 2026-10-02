"use server";
import { ContactSchema } from "@/validations/contact";
import { createClient } from "@/utils/supabase/server";
export async function submitContact(input: unknown) {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "入力内容とプライバシーポリシーへの同意をご確認ください。",
    };
  const { name, email, title, content } = parsed.data;
  try {
    // Public contact forms use INSERT-only permissions, never a privileged key.
    const db = await createClient();
    const { error } = await db
      .from("contact")
      .insert({ name, email, title, content });
    if (error)
      return {
        ok: false as const,
        error:
          "送信できませんでした。入力内容は残っています。時間をおいて再度お試しください。",
      };
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error:
        "通信に失敗しました。入力内容は残っています。時間をおいて再度お試しください。",
    };
  }
}
