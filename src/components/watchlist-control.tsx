"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInUrl } from "@/lib/auth/redirect";
import type {
  WatchlistMutationResult,
  WatchlistStatus,
} from "@/lib/watchlist-action-types";
import styles from "./watchlist-control.module.css";

type Props = {
  stockCode: string;
  stockName: string;
  returnTo: string;
  checkAction: (code: string) => Promise<WatchlistStatus>;
  addAction: (stock: {
    code: string;
    name: string;
  }) => Promise<WatchlistMutationResult>;
  removeAction: (code: string) => Promise<WatchlistMutationResult>;
};
type State = WatchlistStatus | { status: "checking" };
type Feedback = { kind: "success" | "error" | "auth"; message: string };

export default function WatchlistControl({
  stockCode,
  stockName,
  returnTo,
  checkAction,
  addAction,
  removeAction,
}: Props) {
  const [state, setState] = useState<State>({ status: "checking" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const hintId = useId();

  const checkStatus = useCallback(async () => {
    const version = ++generation.current;
    inFlight.current = false;
    setBusy(false);
    setState({ status: "checking" });
    setFeedback(null);
    try {
      const result = await checkAction(stockCode);
      if (version === generation.current) setState(result);
    } catch {
      if (version === generation.current)
        setState({
          status: "error",
          message: "登録状態を確認できませんでした。再度お試しください。",
        });
    }
  }, [checkAction, stockCode]);

  const invalidateRequests = useCallback(() => {
    generation.current++;
  }, []);

  useEffect(() => {
    void checkStatus();
    return invalidateRequests;
  }, [checkStatus, invalidateRequests]);

  async function toggle() {
    if (state.status !== "ready" || inFlight.current) return;
    const version = ++generation.current;
    inFlight.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = state.isWatching
        ? await removeAction(stockCode)
        : await addAction({ code: stockCode, name: stockName });
      if (version !== generation.current) return;
      if (result.status === "auth-required") {
        setState(result);
        setFeedback({
          kind: "auth",
          message:
            "ログイン状態を確認できませんでした。ログインし直すとウォッチリストを更新できます。",
        });
      } else if (result.status === "error") {
        setFeedback({ kind: "error", message: result.message });
      } else {
        setState({ status: "ready", isWatching: result.isWatching });
        setFeedback({
          kind: "success",
          message: result.isWatching
            ? "ウォッチリストに追加しました。"
            : "ウォッチリストから削除しました。",
        });
      }
    } catch {
      if (version === generation.current)
        setFeedback({
          kind: "error",
          message: "通信に失敗しました。再度お試しください。",
        });
    } finally {
      if (version === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <div
      className={styles.control}
      role="group"
      aria-label={stockName + "のウォッチリスト"}
      aria-busy={busy || state.status === "checking"}
    >
      {state.status === "checking" ? (
        <Button
          type="button"
          variant="outline"
          disabled
          className={styles.button}
          aria-label="ウォッチリストの登録状態を確認中"
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          確認中…
        </Button>
      ) : state.status === "auth-required" ? (
        <>
          <Button asChild className={styles.button}>
            <Link
              href={signInUrl(returnTo)}
              aria-label={
                feedback?.kind === "auth"
                  ? "ログインしてウォッチリストを更新"
                  : "ログインしてウォッチリストに追加"
              }
              aria-describedby={hintId}
            >
              <Star className="w-4 h-4" aria-hidden="true" />
              {feedback?.kind === "auth"
                ? "ログインし直す"
                : "ログインして追加"}
            </Link>
          </Button>
          <p id={hintId} className={styles.hint} role="status">
            {feedback?.kind === "auth"
              ? feedback.message
              : "ウォッチリストへの登録にはログインが必要です。"}
          </p>
        </>
      ) : state.status === "error" ? (
        <>
          <p className={styles.error} role="alert">
            {state.message}
          </p>
          <Button
            type="button"
            variant="outline"
            className={styles.button}
            onClick={() => void checkStatus()}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            登録状態を再確認
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant={state.isWatching ? "secondary" : "default"}
          className={styles.button}
          onClick={() => void toggle()}
          disabled={busy}
          aria-pressed={state.isWatching}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Star
              className="w-4 h-4"
              aria-hidden="true"
              style={
                state.isWatching
                  ? { color: "#fbbf24", fill: "#fbbf24" }
                  : undefined
              }
            />
          )}
          {busy
            ? state.isWatching
              ? "削除中…"
              : "追加中…"
            : state.isWatching
              ? "ウォッチリストから削除"
              : "ウォッチリストに追加"}
        </Button>
      )}
      {state.status === "ready" && feedback && (
        <p
          className={feedback.kind === "error" ? styles.error : styles.hint}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
