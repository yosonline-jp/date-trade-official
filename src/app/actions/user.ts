"use server";

import { createClient, createRoleClient } from "@/utils/supabase/server";
import { removeAccount } from "@/lib/account-deletion";
import { encodedRedirect } from "@/utils/utils";
import { ProfileFormType } from "@/validations/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const updateUser = async (data: ProfileFormType) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }
  const { nickname, bio, web_url, x_url, instagram_url, account } = data;
  const { error } = await supabase
    .from("users")
    .update({
      nickname,
      bio,
      web_url,
      x_url,
      instagram_url,
      account,
    })
    .match({ id: user.id });

  console.log(error);

  if (error) {
    encodedRedirect(
      "error",
      `/dashboard/profile`,
      "ユーザーを更新できませんでした",
    );
  }
  revalidatePath(`/dashboard`);
  // redirect(`/dashboard/profile`);
};

// The target ID always comes from the verified session, never from the browser.
export const deleteUser = async (confirmation: unknown) => {
  if (confirmation !== "削除する") {
    return { error: "確認欄に「削除する」と入力してください。" };
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: "ログイン状態を確認できませんでした。再ログインしてください。",
    };
  }
  try {
    const admin = await createRoleClient();
    const result = await removeAccount(admin, user.id);
    if (result.error) return result;
  } catch {
    return {
      error:
        "アカウントを削除できませんでした。時間をおいて再度お試しください。",
    };
  }
  // Auth deletion revokes refresh tokens; only now clear this browser's cookies.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  revalidatePath("/", "layout");
  return { success: true as const };
};

export const changeUserType = async (type: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { error } = await supabase
    .from("users")
    .update({ type, first: false })
    .eq("id", user.id);

  if (error) {
    encodedRedirect(
      "error",
      `/dashboard`,
      "ユーザーの権限を変更できませませんでした",
    );
  }

  revalidatePath(`/dashboard`);
};
