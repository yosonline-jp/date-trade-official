"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Database, RefreshCw, Search } from "lucide-react";
import { syncStockMaster } from "@/app/actions/stock-master";
import type { JpxStock } from "@/lib/jpx/parse";

export type MasterRow = JpxStock & {
  state: "new" | "changed" | "unchanged";
  fields: string[];
};

export function StockMasterManager({
  rows,
  existingCount,
  sourceDate,
  importedAt,
  removed,
  history,
  canUpdate,
}: {
  rows: MasterRow[];
  existingCount: number;
  sourceDate: string | null;
  importedAt: string | null;
  removed: Array<{ code: string; name: string }>;
  history: Array<{ name: string; createdAt: string | null }>;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("すべて");
  const [status, setStatus] = useState("すべて");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const added = rows.filter((row) => row.state === "new").length;
  const changed = rows.filter((row) => row.state === "changed").length;
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (market === "すべて" || row.market === market) &&
          (status === "すべて" || row.state === status) &&
          `${row.code} ${row.name} ${row.sector}`
            .toLocaleLowerCase("ja-JP")
            .includes(query.toLocaleLowerCase("ja-JP").trim()),
      ),
    [rows, market, status, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const visible = filtered.slice(
    (Math.min(page, pages) - 1) * 50,
    Math.min(page, pages) * 50,
  );
  function update() {
    setMessage("");
    setError(false);
    startTransition(async () => {
      try {
        const result = await syncStockMaster();
        setMessage(
          `${result.total.toLocaleString()}銘柄を確認し、新規${result.added}件・変更${result.changed}件を反映しました。`,
        );
        router.refresh();
      } catch (cause) {
        setError(true);
        setMessage(
          cause instanceof Error ? cause.message : "更新できませんでした。",
        );
      }
    });
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">JAPAN EQUITY MASTER / ADMIN</p>
          <h1>
            日本株マスタ<span className="heading-dot">.</span>
          </h1>
          <p>JPXの上場株式を基準に、銘柄名・市場・業種を管理します。</p>
        </div>
        <button
          className="terminal-button"
          type="button"
          onClick={update}
          disabled={pending || !canUpdate}
        >
          <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
          {pending ? "差分を反映中…" : "JPXの最新一覧に更新"}
        </button>
      </div>
      <div className="market-meta">
        <span>JPX基準日 {sourceDate ?? "取得できません"}</span>
        <span>
          最終同期{" "}
          {importedAt
            ? new Date(importedAt).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })
            : "未実施"}
        </span>
      </div>
      {message && (
        <p className="data-notice" role={error ? "alert" : "status"}>
          {message}
        </p>
      )}
      <section
        className="index-grid master-stats"
        aria-label="銘柄マスタの状態"
      >
        <div className="index-card">
          <div>JPX上場株式</div>
          <strong>{rows.length.toLocaleString()}</strong>
          <p>今回の公式一覧</p>
        </div>
        <div className="index-card">
          <div>Supabase全銘柄</div>
          <strong>{existingCount.toLocaleString()}</strong>
          <p>ETF等も含む保存済み件数</p>
        </div>
        <div className="index-card">
          <div>新規登録</div>
          <strong>{added}</strong>
          <p>未登録の上場株式</p>
        </div>
        <div className="index-card">
          <div>情報変更</div>
          <strong>{changed}</strong>
          <p>名称・市場・業種の差分</p>
        </div>
      </section>
      {removed.length > 0 && (
        <div className="data-notice" role="status">
          前回の株式一覧から外れた銘柄が{removed.length}
          件あります。更新時は市場を「上場廃止」に変更し、株価や取引履歴は保持します。
          <details>
            <summary>対象銘柄を見る</summary>
            <p>
              {removed
                .slice(0, 40)
                .map((item) => `${item.code} ${item.name}`)
                .join("、")}
              {removed.length > 40 ? " ほか" : ""}
            </p>
          </details>
        </div>
      )}
      <div className="master-context">
        <Database size={18} />
        <p>
          ここでは日本株全体の基本情報を更新します。
          <Link href="/dashboard/nikkei225">
            日経225管理 <ArrowUpRight size={13} />
          </Link>
          は指数の構成銘柄だけを管理します。
        </p>
      </div>
      <div className="cms-search master-filters">
        <label className="sr-only" htmlFor="master-search">
          銘柄を検索
        </label>
        <div className="nikkei-search-wrap">
          <Search size={17} />
          <input
            id="master-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="コード・銘柄名・業種で検索"
          />
        </div>
        <label className="sr-only" htmlFor="master-market">
          市場
        </label>
        <select
          id="master-market"
          value={market}
          onChange={(event) => {
            setMarket(event.target.value);
            setPage(1);
          }}
        >
          {[
            "すべて",
            "プライム",
            "スタンダード",
            "グロース",
            "TOKYO PRO Market",
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="master-status">
          差分
        </label>
        <select
          id="master-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="すべて">すべての状態</option>
          <option value="new">新規</option>
          <option value="changed">変更あり</option>
          <option value="unchanged">登録済み</option>
        </select>
      </div>
      <section className="terminal-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">LISTED EQUITIES</p>
            <h2>上場株式一覧</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} / {rows.length.toLocaleString()}
            件
          </span>
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table master-table">
            <thead>
              <tr>
                <th>コード</th>
                <th>銘柄名</th>
                <th>市場</th>
                <th>業種</th>
                <th>差分</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.code}>
                  <td className="tabular-nums">{row.code}</td>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{row.market}</td>
                  <td>{row.sector}</td>
                  <td>
                    <span
                      className={`nikkei-state ${row.state === "unchanged" ? "ready" : "pending"}`}
                    >
                      {row.state === "new"
                        ? "新規"
                        : row.state === "changed"
                          ? row.fields.join("・")
                          : "登録済み"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <p className="empty-copy">該当する銘柄はありません。</p>
        )}
        {pages > 1 && (
          <div className="master-pagination">
            <button
              type="button"
              className="terminal-button secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              前へ
            </button>
            <span>
              {Math.min(page, pages)} / {pages}
            </span>
            <button
              type="button"
              className="terminal-button secondary"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              次へ
            </button>
          </div>
        )}
      </section>
      <p className="chart-footnote">
        JPXの公開一覧に含まれる上場中の株式が対象です。ETF・REITなどや過去の株価・取引履歴は変更しません。
      </p>
      <a
        className="text-link text-xs mt-4"
        href="https://clientportal.jpx.co.jp/ClientPortal/s/Issue?language=ja"
        target="_blank"
        rel="noreferrer"
      >
        JPXデータポータルで確認 <ArrowUpRight size={14} />
      </a>
      {history.length > 0 && (
        <section className="terminal-panel nikkei-history mt-8">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SYNC HISTORY</p>
              <h2>更新履歴</h2>
            </div>
          </div>
          <ol>
            {history.map((item) => (
              <li key={item.name}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })
                  : item.name}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
