import { z } from "zod";

export const CommentSchema = z.object({
  comment: z
    .string()
    .min(1, "コメントを入力してください。")
    .max(250, "コメントは250文字以内で入力してください。"),
  game_id: z.string(),
});

export type CommentFormType = z.infer<typeof CommentSchema>;
