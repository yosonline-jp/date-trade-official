"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import WatchlistControl from "@/components/watchlist-control";
import type {
  WatchlistMutationResult,
  WatchlistStatus,
} from "@/lib/watchlist-action-types";

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 350));
const ready = (isWatching: boolean): WatchlistStatus => ({
  status: "ready",
  isWatching,
});
const success = (isWatching: boolean): WatchlistMutationResult => ({
  status: "success",
  isWatching,
});

function Scenario({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      style={{
        minWidth: 0,
        padding: 18,
        border: "1px solid var(--dt-border)",
        borderRadius: 12,
        background: "var(--dt-surface)",
      }}
    >
      <h2 style={{ marginBottom: 12, fontSize: 18 }}>{label}</h2>
      {children}
    </section>
  );
}

function MutationScenario({
  mode,
}: {
  mode: "normal" | "auth-lost" | "add-error" | "remove-network";
}) {
  const initial = mode === "remove-network";
  const watching = useRef(initial);
  const attempts = useRef({ add: 0, remove: 0 });
  const [counts, setCounts] = useState({ add: 0, remove: 0 });
  const checkAction = useCallback(async () => ready(watching.current), []);
  const addAction = useCallback(async (): Promise<WatchlistMutationResult> => {
    attempts.current.add++;
    setCounts({ ...attempts.current });
    await delay();
    if (mode === "auth-lost") return { status: "auth-required" };
    if (mode === "add-error" && attempts.current.add === 1)
      return { status: "error", message: "登録を保存できませんでした。" };
    watching.current = true;
    return success(true);
  }, [mode]);
  const removeAction =
    useCallback(async (): Promise<WatchlistMutationResult> => {
      attempts.current.remove++;
      setCounts({ ...attempts.current });
      await delay();
      if (mode === "remove-network" && attempts.current.remove === 1)
        throw new Error("private-backend-connection-detail");
      watching.current = false;
      return success(false);
    }, [mode]);
  const labels = {
    normal: "通常の登録・削除",
    "auth-lost": "セッション失効",
    "add-error": "登録失敗後の再試行",
    "remove-network": "削除通信エラー後の再試行",
  };
  return (
    <Scenario label={labels[mode]}>
      <WatchlistControl
        stockCode="285A"
        stockName="テスト銘柄"
        returnTo="/stocks/285A/trades#stock-trade-records"
        checkAction={checkAction}
        addAction={addAction}
        removeAction={removeAction}
      />
      <p>
        追加呼び出し: <span data-testid="add-count">{counts.add}</span> /
        削除呼び出し: <span data-testid="remove-count">{counts.remove}</span>
      </p>
    </Scenario>
  );
}

function DeferredCheckScenario() {
  const pending = useRef<Array<(result: WatchlistStatus) => void>>([]);
  const checkAction = useCallback(
    () =>
      new Promise<WatchlistStatus>((resolve) => pending.current.push(resolve)),
    [],
  );
  const addAction = useCallback(async () => success(true), []);
  const removeAction = useCallback(async () => success(false), []);
  return (
    <Scenario label="初期登録状態の確認中">
      <WatchlistControl
        stockCode="285A"
        stockName="確認中の銘柄"
        returnTo="/stocks/285A"
        checkAction={checkAction}
        addAction={addAction}
        removeAction={removeAction}
      />
      <button
        type="button"
        onClick={() => {
          const resolvers = pending.current.splice(0);
          resolvers.forEach((resolve) => resolve(ready(false)));
        }}
      >
        登録状態の読み込みを完了
      </button>
    </Scenario>
  );
}

function FailedCheckScenario() {
  const canCheckSucceed = useRef(false);
  const calls = useRef(0);
  const [count, setCount] = useState(0);
  const checkAction = useCallback(async (): Promise<WatchlistStatus> => {
    calls.current++;
    setCount(calls.current);
    return canCheckSucceed.current
      ? ready(false)
      : { status: "error", message: "登録状態を取得できませんでした。" };
  }, []);
  const addAction = useCallback(async () => success(true), []);
  const removeAction = useCallback(async () => success(false), []);
  return (
    <Scenario label="初期状態の取得失敗">
      <WatchlistControl
        stockCode="285A"
        stockName="再確認の銘柄"
        returnTo="/stocks/285A"
        checkAction={checkAction}
        addAction={addAction}
        removeAction={removeAction}
      />
      <button
        type="button"
        onClick={() => {
          canCheckSucceed.current = true;
        }}
      >
        登録状態の再確認を許可
      </button>
      <p>
        確認呼び出し: <span data-testid="check-count">{count}</span>
      </p>
    </Scenario>
  );
}

function StaleCheckScenario() {
  const [code, setCode] = useState("285A");
  const pending = useRef<Array<(result: WatchlistStatus) => void>>([]);
  const checkAction = useCallback(
    (stockCode: string) =>
      stockCode === "285A"
        ? new Promise<WatchlistStatus>((resolve) =>
            pending.current.push(resolve),
          )
        : Promise.resolve(ready(true)),
    [],
  );
  const addAction = useCallback(async () => success(true), []);
  const removeAction = useCallback(async () => success(false), []);
  return (
    <Scenario label="古い銘柄の応答を無視">
      <p data-testid="selected-code">{code}</p>
      <WatchlistControl
        stockCode={code}
        stockName={code === "285A" ? "以前の銘柄" : "新しい銘柄"}
        returnTo={"/stocks/" + code}
        checkAction={checkAction}
        addAction={addAction}
        removeAction={removeAction}
      />
      <button type="button" onClick={() => setCode("7203")}>
        銘柄を7203に切り替える
      </button>
      <button
        type="button"
        onClick={() => {
          const resolvers = pending.current.splice(0);
          resolvers.forEach((resolve) => resolve(ready(false)));
        }}
      >
        古い285Aの応答を完了
      </button>
    </Scenario>
  );
}

/** Local action doubles only: no production mutation or database access. */
export default function WatchlistUiFixture() {
  return (
    <main
      style={{
        maxWidth: 1200,
        minWidth: 0,
        padding: 16,
        display: "grid",
        gap: 16,
      }}
    >
      <h1>ウォッチリスト操作の検証</h1>
      <MutationScenario mode="normal" />
      <MutationScenario mode="auth-lost" />
      <MutationScenario mode="add-error" />
      <MutationScenario mode="remove-network" />
      <DeferredCheckScenario />
      <FailedCheckScenario />
      <StaleCheckScenario />
    </main>
  );
}
