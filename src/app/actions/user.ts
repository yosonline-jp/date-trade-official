"use server";

import { createClient, createRoleClient } from "@/utils/supabase/server";
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
			"ユーザーを更新できませんでした"
		);
	}
	revalidatePath(`/dashboard`);
	// redirect(`/dashboard/profile`);
};

export const deleteUser = async () => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect("/sign-in");
	}

	await supabase.auth.signOut();
	const admin = await createRoleClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

	if (error) {
		encodedRedirect(
			"error",
			`/dashboard/profile`,
			"ユーザーを削除できませんでした"
		);
	}

	return redirect("/");
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
			"ユーザーの権限を変更できませませんでした"
		);
	}

	revalidatePath(`/dashboard`);
};

