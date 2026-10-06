"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import {
  MAX_STOCK_COMMENT_LENGTH,
  type StockCommentResult,
} from "@/lib/stock-comment";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type FormState = StockCommentResult | { status: "idle"; message: string };
const initialState: FormState = { status: "idle", message: "" };

export default function StockCommentForm({
  submitCommentAction,
  loginHref,
}: {
  submitCommentAction: (comment: string) => Promise<StockCommentResult>;
  loginHref: string;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [state, submit, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      try {
        const value = formData.get("comment");
        const result = await submitCommentAction(
          typeof value === "string" ? value : "",
        );
        if (result.status === "success") setDraft("");
        return result;
      } catch {
        return {
          status: "error",
          message:
            "通信に失敗しました。入力内容を確認して、再度お試しください。",
        };
      }
    },
    initialState,
  );

  return (
    <form action={submit} className="mt-6 space-y-3 px-0.5" aria-busy={pending}>
      <Label htmlFor={inputId}>コメント</Label>
      <Textarea
        id={inputId}
        name="comment"
        placeholder="コメントを入力"
        className="min-h-[80px]"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MAX_STOCK_COMMENT_LENGTH}
        required
        disabled={pending}
        aria-describedby={inputId + "-hint"}
      />
      <p id={inputId + "-hint"} className="text-xs text-muted-foreground">
        {draft.length} / {MAX_STOCK_COMMENT_LENGTH}文字
      </p>
      {!pending && state.status !== "idle" && (
        <div
          role={state.status === "success" ? "status" : "alert"}
          className={
            state.status === "error" ? "text-sm text-destructive" : "text-sm"
          }
        >
          <p>{state.message}</p>
          {state.status === "auth-required" && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                入力内容はこのタブに残っています。ログイン後にこのタブへ戻って再度投稿してください。
              </p>
              <Link
                href={loginHref}
                target="_blank"
                rel="noopener noreferrer"
                className="terminal-button secondary mt-3"
              >
                別のタブでログインする
              </Link>
            </>
          )}
        </div>
      )}
      <Button type="submit" disabled={pending || !draft.trim()}>
        {pending ? "投稿中…" : "コメントする"}
      </Button>
    </form>
  );
}
