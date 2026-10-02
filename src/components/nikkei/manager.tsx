"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, RefreshCw, Search } from "lucide-react";
import { syncNikkei225 } from "@/app/actions/nikkei225";
import type { NikkeiComponent } from "@/lib/nikkei/parse";

type Row = NikkeiComponent & {
  state: "マスタ未登録" | "登録済み" | "確認できません";
};
export function NikkeiManager({
  rows,
  removed,
  importedAt,
  sourceDate,
  canUpdate,
}: {
  rows: Row[];
  removed: { code: string; name: string }[];
  importedAt: string | null;
  sourceDate: string | null;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("すべて");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const sectors = useMemo(
    () => ["すべて", ...new Set(rows.map((row) => row.sector))],
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (sector === "すべて" || row.sector === sector) &&
          `${row.code} ${row.name} ${row.companyName}`
            .toLocaleLowerCase("ja-JP")
            .includes(query.toLocaleLowerCase("ja-JP").trim()),
      ),
    [rows, query, sector],
  );
  const missing = rows.filter((row) => row.state === "マスタ未登録").length;
  const update = () =>
    startTransition(async () => {
      setMessage("");
      try {
        const result = await syncNikkei225();
        setMessage(
          `日経225の構成銘柄を保存しました。追加${result.added}件・除外${result.removed}件。公式更新日：${result.sourceDate}。`,
        );
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "更新できませんでした。",
        );
      }
    });
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INDEX CONSTITUENTS / ADMIN</p>
          <h1>
            日経225 銘柄管理<span className="heading-dot">.</span>
          </h1>
          <p>
            日経公式の構成銘柄と入替履歴を管理します。銘柄の基本情報は日本株マスタで更新します。
          </p>
        </div>
        <button
          className="terminal-button"
          onClick={update}
          disabled={pending || !canUpdate}
        >
          <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
          {pending ? "更新中…" : "構成リストを更新"}
        </button>
      </div>
      <div className="market-meta">
        <span>公式一覧 {sourceDate ?? "取得できません"}</span>
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
        <p role="status" className="data-notice">
          {message}
        </p>
      )}
      <section className="index-grid nikkei-stats">
        <div className="index-card">
          <div>構成銘柄</div>
          <strong>{rows.length}</strong>
          <p>公式リストの銘柄数</p>
        </div>
        <div className="index-card">
          <div>日本株マスタに未登録</div>
          <strong>{missing}</strong>
          <p>基本情報の更新が必要</p>
        </div>
        <div className="index-card">
          <div>前回からの除外</div>
          <strong>{removed.length}</strong>
          <p>株価・履歴は維持</p>
        </div>
      </section>
      {removed.length > 0 && (
        <div className="data-notice">
          前回の日経225リストから除外された銘柄：
          {removed.map((item) => `${item.code} ${item.name}`).join("、")}
          。株式テーブルや過去データには触れません。
        </div>
      )}
      <div className="cms-search">
        <label htmlFor="nikkei-search" className="sr-only">
          銘柄を検索
        </label>
        <div className="nikkei-search-wrap">
          <Search size={17} />
          <input
            id="nikkei-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="銘柄コード・社名で検索"
          />
        </div>
        <label htmlFor="nikkei-sector" className="sr-only">
          業種で絞り込み
        </label>
        <select
          id="nikkei-sector"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
        >
          {sectors.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>
      <section className="terminal-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CURRENT COMPONENTS</p>
            <h2>日経225 構成銘柄</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {rows.length}件
          </span>
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>コード</th>
                <th>銘柄名</th>
                <th>業種</th>
                <th>Supabase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.code}>
                  <td className="tabular-nums">{item.code}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <p>{item.companyName}</p>
                  </td>
                  <td>{item.sector}</td>
                  <td>
                    <span
                      className={`nikkei-state ${item.state === "登録済み" ? "ready" : "pending"}`}
                    >
                      {item.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="empty-copy">該当する銘柄はありません。</p>
        )}
      </section>
      <p className="chart-footnote">
        この更新は日経225の構成リストと履歴のみを非公開のSupabase
        Storageに保存します。銘柄名・市場・業種は日本株マスタから更新してください。
      </p>
      <Link className="text-link text-xs mt-4" href="/dashboard/stock-master">
        日本株マスタを開く <ArrowRight size={14} />
      </Link>
      <a
        className="text-link text-xs mt-4"
        href="https://indexes.nikkei.co.jp/nkave/index/component?idx=nk225"
        target="_blank"
        rel="noreferrer"
      >
        日経公式の構成銘柄を見る <ArrowRight size={14} />
      </a>
    </div>
  );
}
