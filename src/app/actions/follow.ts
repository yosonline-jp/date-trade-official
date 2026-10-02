"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * フォロー追加
 */
export async function followUser(targetUserId: string) {
	const supabase = await createClient();
	const {
		data: { user },
		error: sessionError,
	} = await supabase.auth.getUser();

	if (sessionError || !user) throw new Error("認証が必要です");
	if (user.id === targetUserId) throw new Error("自分自身はフォローできません");

	const { error } = await supabase
		.from("follows")
		.insert({ follower_id: user.id, following_id: targetUserId });

	if (error) throw error;

	revalidatePath(`/traders/${targetUserId}`);
}

/**
 * フォロー解除
 */
export async function unfollowUser(targetUserId: string) {
	const supabase = await createClient();
	const {
		data: { user },
		error: sessionError,
	} = await supabase.auth.getUser();

	if (sessionError || !user) throw new Error("認証が必要です");

	const { error } = await supabase
		.from("follows")
		.delete()
		.eq("follower_id", user.id)
		.eq("following_id", targetUserId);

	if (error) throw error;

	revalidatePath(`/traders/${targetUserId}`);
}

/**
 * フォロー状態を取得
 */
export async function isFollowing(targetUserId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return false;

	const { data } = await supabase
		.from("follows")
		.select("id")
		.eq("follower_id", user.id)
		.eq("following_id", targetUserId)
		.single();

	return !!data;
}
