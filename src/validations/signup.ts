import { z } from "zod";

export const SignupSchema = z.object({
  nickname: z
    .string()
    .min(3, "ニックネームを3文字以上で入力してください。")
    .max(12, "ニックネームは12文字以内で入力してください。"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください。")
    .email("メールアドレスの形式で入力してください"),
  password: z
    .object({
      password: z
        .string()
        .min(8, "パスワードを8文字以上で入力してください。")
        .max(12, "パスワードは12文字以内で入力してください。"),
      password_confirm: z
        .string()
        .min(8, "確認用のパスワードを8文字以上で入力してください。")
        .max(12, "確認用のパスワードは12文字以内で入力してください。"),
    })
    .superRefine(({ password, password_confirm }, ctx) => {
      if (password !== password_confirm) {
        ctx.addIssue({
          path: ["password_confirm"],
          code: "custom",
          message: "パスワードが一致しません。",
        });
      }
    }),
});
