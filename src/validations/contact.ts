import { z } from "zod";
import type { FieldErrors, Resolver } from "react-hook-form";
export const ContactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "お名前を入力してください。")
      .max(80, "お名前は80文字以下で入力してください。"),
    email: z
      .string()
      .trim()
      .min(1, "メールアドレスを入力してください。")
      .email("メールアドレスの形式を確認してください。")
      .max(254, "メールアドレスは254文字以下で入力してください。"),
    email_confirm: z
      .string()
      .trim()
      .min(1, "確認用のメールアドレスを入力してください。")
      .max(254),
    title: z
      .string()
      .trim()
      .min(2, "件名は2文字以上で入力してください。")
      .max(100, "件名は100文字以下で入力してください。"),
    content: z
      .string()
      .trim()
      .min(2, "お問い合わせ内容は2文字以上で入力してください。")
      .max(5000, "お問い合わせ内容は5,000文字以下で入力してください。"),
    consent: z
      .boolean()
      .refine(
        (value) => value,
        "プライバシーポリシーを確認し、同意してください。",
      ),
    website: z.string().max(0),
  })
  .refine((value) => value.email === value.email_confirm, {
    path: ["email_confirm"],
    message: "メールアドレスが一致しません。",
  });
export type ContactInput = z.infer<typeof ContactSchema>;

// The installed generic resolver predates Zod 4; keep this flat form typed end to end.
export const contactResolver: Resolver<ContactInput> = (
  values,
  _context,
  options,
) => {
  const result = ContactSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: FieldErrors<ContactInput> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ContactInput;
    if (field && !errors[field])
      errors[field] = {
        type: issue.code,
        message: issue.message,
        ref: options.fields[field]?.ref,
      };
  }
  return { values: {}, errors };
};
