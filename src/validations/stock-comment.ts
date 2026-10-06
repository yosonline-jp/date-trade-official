import { z } from "zod";

import { MAX_STOCK_COMMENT_LENGTH } from "@/lib/stock-comment";

export const StockCommentSchema = z.object({
  stockCode: z
    .string()
    .regex(/^[0-9A-Z]{4,5}$/, "銘柄コードを確認してください。"),
  comment: z
    .string()
    .trim()
    .min(1, "コメントを入力してください。")
    .max(MAX_STOCK_COMMENT_LENGTH, "コメントは250文字以内で入力してください。"),
});
