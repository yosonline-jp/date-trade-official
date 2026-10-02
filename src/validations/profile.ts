import { z } from "zod";

export type UserType = {
	id: string;
	created_at: string;
	nickname: string;
	email: string;
	bio: string;
	web_url: string;
	x_url: string;
	instagram_url: string;
	account: string;
	avatar: string;
	role: "user" | "admin";
	header: string;
};

export const ProfileSchema = z.object({
	nickname: z
		.string()
		.min(1, {
			message: "ニックネームを入力してください",
		})
		.max(20, {
			message: "ニックネームは20文字以内で入力してください",
		}),
	bio: z.string().max(300, {
		message: "自己紹介は300文字以内で入力してください",
	}),
	web_url: z.string().max(100, {
		message: "ウェブサイトは100文字以内で入力してください",
	}),
	x_url: z.string().max(50, {
		message: "Xは50文字以内で入力してください",
	}),
	instagram_url: z.string().max(50, {
		message: "インスタグラムは50文字以内で入力してください",
	}),
	account: z
		.string()
		.refine((value) => value === "" || value.length >= 5, {
			message: "アカウントは5文字以上で入力してください",
		})
		.refine((value) => value === "" || value.length <= 10, {
			message: "アカウントは10文字以内で入力してください",
		})
		.refine((value) => value === "" || /^[a-zA-Z0-9_]*$/.test(value), {
			message: "アカウントは半角英数字(_)で入力してください",
		}),
});

export type ProfileFormType = z.infer<typeof ProfileSchema>;
