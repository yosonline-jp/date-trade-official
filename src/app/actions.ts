"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SignupSchema } from "@/validations/signup";
import { safeRedirectPath, signInUrl } from "@/lib/auth/redirect";




export const signUpAction = async (formData: z.infer<typeof SignupSchema>) => {
	const email = formData.email.toString();
	const password = formData.password.password.toString();
	const nickname = formData.nickname.toString();
	const supabase = await createClient();
	const origin = (await headers()).get("origin");

	if (!email || !password || !nickname) {
		return encodedRedirect("error", "/sign-up", "全ての項目を入力してください");
	}

	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: { full_name: nickname },
			emailRedirectTo: `${origin}/auth/callback`,
		},
	});

	if (error) {
		let errorText = "予期せぬエラーが発生しました。";
		switch (error.code) {
			// エラーメッセージは日本語でお願いします
			case "email_exists":
				errorText = "既に登録されているメールアドレスです。";
				break;
			case "email_address_invalid":
				errorText = "メールアドレスの形式で入力してください";
				break;
			default:
				errorText = "予期せぬエラーが発生しました。";
				break;
		}
		return encodedRedirect("error", "/sign-up", errorText);
	} else {
		return encodedRedirect(
			"success",
			"/sign-up",
			"登録完了しました。メールを確認してください。"
		);
	}
};

export const signInAction = async (formData: FormData) => {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const redirectTo = safeRedirectPath(formData.get("redirect_to"));
	const supabase = await createClient();

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		let errorText = "予期せぬエラーが発生しました。";
		switch (error.message) {
			case "Invalid login credentials":
				errorText = "メールアドレスまたはパスワードが間違っています";
				break;
			case "Too many login attempts":
				errorText =
					"ログイン試行回数が多すぎます。数時間後に再試行してください";
				break;
			case "Email not confirmed":
				errorText = "ユーザーを認証できませんでした";
				break;
			default:
				errorText = error.message;
				break;
		}
		return redirect(signInUrl(redirectTo, errorText));
	}

	return redirect(redirectTo);
};

export const forgotPasswordAction = async (formData: FormData) => {
	const email = formData.get("email")?.toString();
	const supabase = await createClient();
	const origin = (await headers()).get("origin");
	const callbackUrl = formData.get("callbackUrl")?.toString();

	if (!email) {
		return encodedRedirect(
			"error",
			"/forgot-password",
			"メールアドレスを入力してください"
		);
	}

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${origin}/auth/callback?redirect_to=/reset-password`,
	});

	if (error) {
		console.error(error.message);
		return encodedRedirect(
			"error",
			"/forgot-password",
			"パスワードをリセットできませんでした"
		);
	}

	if (callbackUrl) {
		return redirect(callbackUrl);
	}

	return encodedRedirect(
		"success",
		"/forgot-password",
		"パスワードをリセットするためのリンクをメールで送信しました。"
	);
};

export const resetPasswordAction = async (formData: FormData) => {
	const supabase = await createClient();

	const password = formData.get("password") as string;
	const confirmPassword = formData.get("confirmPassword") as string;

	if (!password || !confirmPassword) {
		encodedRedirect(
			"error",
			"/reset-password",
			"パスワードと確認用パスワードを入力してください"
		);
	}

	if (password !== confirmPassword) {
		encodedRedirect("error", "/reset-password", "パスワードが一致しません");
	}

	const { error } = await supabase.auth.updateUser({
		password: password,
	});

	if (error) {
		encodedRedirect(
			"error",
			"/reset-password",
			"パスワードを更新できませんでした"
		);
	}

	encodedRedirect("success", "/reset-password", "パスワードを更新しました");
};

export const signOutAction = async () => {
	const supabase = await createClient();
	await supabase.auth.signOut();
	return redirect("/sign-in");
};


