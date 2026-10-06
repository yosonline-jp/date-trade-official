/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { addComment } from "@/app/actions/stock-comments";
import CommentCard from "../comment-card";
import StockCommentForm from "../stock-comment-form";
import { signInUrl } from "@/lib/auth/redirect";

export async function CommentList({
  comments,
  user,
}: {
  comments: any[];
  user: any;
}) {
  return (
    <div className="space-y-4 mt-6">
      <h2 className="text-xl font-bold">コメント一覧</h2>
      {comments?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          まだコメントはありません。
        </p>
      )}
      {comments?.map((c) => (
        <CommentCard key={c.id} comment={c} owner={user?.id === c.user_id.id} />
      ))}
    </div>
  );
}

export function CommentForm({
  stockCode,
  isAuthenticated,
  returnTo = "/stocks/" + stockCode + "#stock-comments",
}: {
  stockCode: string;
  isAuthenticated: boolean;
  returnTo?: string;
}) {
  const loginHref = signInUrl(returnTo);
  if (!isAuthenticated) {
    return (
      <div className="mt-6 space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          コメントを投稿するにはログインが必要です。
        </p>
        <Link href={loginHref} className="terminal-button secondary">
          ログインしてコメントする
        </Link>
      </div>
    );
  }
  return (
    <StockCommentForm
      key={stockCode}
      submitCommentAction={addComment.bind(null, stockCode)}
      loginHref={loginHref}
    />
  );
}
