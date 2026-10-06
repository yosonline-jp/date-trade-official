export const MAX_STOCK_COMMENT_LENGTH = 250;

export type StockCommentResult = {
  status: "success" | "error" | "auth-required";
  message: string;
};
