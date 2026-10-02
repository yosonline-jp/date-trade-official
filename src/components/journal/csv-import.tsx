"use client";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  csvFields,
  parseCsv,
  previewImport,
  suggestMapping,
  tradeFingerprint,
  type CsvField,
  type Mapping,
} from "@/lib/journal-csv";
import { yen, type Trade } from "@/lib/journal";
import { importJournalTrades } from "@/app/actions/journal";
export default function CsvImport({
  existing,
  type,
  onClose,
  onSuccess,
}: {
  existing: Trade[];
  type: "real" | "demo";
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [csv, setCsv] = useState<ReturnType<typeof parseCsv> | null>(null),
    [mapping, setMapping] = useState<Mapping>({}),
    [kind, setKind] = useState<"completed" | "executions">("completed"),
    [visibility, setVisibility] = useState<"public" | "private">("private"),
    [encoding, setEncoding] = useState("utf-8"),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [accepted, setAccepted] = useState(false);
  const preview = useMemo(
    () =>
      csv ? previewImport(csv.rows, mapping, kind, type, visibility) : null,
    [csv, mapping, kind, type, visibility],
  );
  const selected = useMemo(() => {
    const seen = new Set(existing.map(tradeFingerprint));
    let duplicates = 0;
    const trades = (preview?.trades || []).filter((t) => {
      const key = tradeFingerprint(t);
      if (seen.has(key)) {
        duplicates++;
        return false;
      }
      seen.add(key);
      return true;
    });
    return { trades, duplicates };
  }, [preview, existing]);
  async function read(selectedFile: File | null, charset = encoding) {
    setFile(selectedFile);
    setMessage("");
    setAccepted(false);
    setCsv(null);
    if (!selectedFile) return;
    try {
      if (selectedFile.size > 5 * 1024 * 1024)
        throw new Error("CSVは5MB以下にしてください。");
      const result = parseCsv(
        new TextDecoder(charset, { fatal: true }).decode(
          await selectedFile.arrayBuffer(),
        ),
      );
      setCsv(result);
      setMapping(suggestMapping(result.headers));
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "読み取れませんでした。文字コードをご確認ください。",
      );
    }
  }
  async function save() {
    if (!selected.trades.length || busy || preview?.errors.length || !accepted)
      return;
    setBusy(true);
    setMessage("");
    let added = 0,
      skipped = selected.duplicates;
    try {
      for (let offset = 0; offset < selected.trades.length; offset += 500) {
        const result = await importJournalTrades(
          selected.trades.slice(offset, offset + 500),
        );
        added += result.added;
        skipped += result.skipped;
        setMessage(
          Math.min(offset + 500, selected.trades.length) +
            " / " +
            selected.trades.length +
            "件を処理しました。",
        );
      }
      setMessage(
        added + "件を登録しました。重複" + skipped + "件を除外しました。",
      );
      setCsv(null);
      await onSuccess();
    } catch (e) {
      setMessage(
        added +
          "件は保存済みです。" +
          (e instanceof Error ? e.message : "取り込みに失敗しました。") +
          " 再実行すると保存済みの取引は重複として除外されます。",
      );
      await onSuccess();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="profit-dialog max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSVから取引を取り込む</DialogTitle>
          <DialogDescription>
            列を割り当て、プレビューを確認してから登録します。実取引・デモの選択は現在のタブに従います。
          </DialogDescription>
        </DialogHeader>
        <div className="journal-tools">
          <fieldset disabled={busy}>
            <div className="journal-filters">
              <label>
                文字コード
                <select
                  value={encoding}
                  onChange={(e) => {
                    setEncoding(e.target.value);
                    void read(file, e.target.value);
                  }}
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="shift-jis">Shift-JIS</option>
                </select>
              </label>
              <label>
                形式
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as "completed" | "executions");
                    setAccepted(false);
                  }}
                >
                  <option value="completed">決済済み取引（買値・売値）</option>
                  <option value="executions">約定履歴（売買・単価）</option>
                </select>
              </label>
              <label>
                公開範囲
                <select
                  value={visibility}
                  onChange={(e) => {
                    setVisibility(e.target.value as "public" | "private");
                    setAccepted(false);
                  }}
                >
                  <option value="private">非公開</option>
                  <option value="public">公開</option>
                </select>
              </label>
            </div>
            <label className="journal-field">
              CSVファイル
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void read(e.target.files?.[0] || null)}
              />
            </label>
            <a href="/templates/trade-import.csv" download>
              決済済み取引のCSVテンプレート
            </a>
            {csv && (
              <>
                <div className="journal-form-grid">
                  {(Object.keys(csvFields) as CsvField[])
                    .filter((f) =>
                      kind === "completed"
                        ? !["price", "side"].includes(f)
                        : !["buy_price", "sell_price", "trade_type"].includes(
                            f,
                          ),
                    )
                    .map((f) => (
                      <label className="journal-field" key={f}>
                        {csvFields[f]}
                        <select
                          value={mapping[f] ?? ""}
                          onChange={(e) => {
                            setMapping((v) => ({
                              ...v,
                              [f]:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            }));
                            setAccepted(false);
                          }}
                        >
                          <option value="">割り当てなし</option>
                          {csv.headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                </div>
                <p className="journal-help">
                  約定履歴は古い順に、銘柄・取引区分ごとの先入先出で決済を組み合わせます。同日の行順はCSVの順です。未決済や対応する建玉のない決済は登録しません。税金は計算しません。決済済み形式の売建では「買値」列に建値、「売値」列に買返済価格を割り当ててください。
                </p>
                {preview && (
                  <>
                    <p>
                      {selected.trades.length}件を登録予定 / 重複
                      {selected.duplicates}件
                    </p>
                    {preview.errors.length > 0 && (
                      <div role="alert">
                        {preview.errors.slice(0, 20).map((e) => (
                          <p key={e}>{e}</p>
                        ))}
                      </div>
                    )}
                    {preview.unmatched.length > 0 && (
                      <div>
                        {preview.unmatched.slice(0, 20).map((e) => (
                          <p key={e}>{e}</p>
                        ))}
                      </div>
                    )}
                    <div className="cms-table-wrap">
                      <table className="cms-table">
                        <thead>
                          <tr>
                            <th>決済日</th>
                            <th>銘柄</th>
                            <th>区分</th>
                            <th>買値</th>
                            <th>売値</th>
                            <th>株数</th>
                            <th>手数料</th>
                            <th>損益</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.trades.slice(0, 50).map((t, i) => (
                            <tr key={i}>
                              <td>{t.trade_date}</td>
                              <td>
                                {t.stock_code} {t.stock_name}
                              </td>
                              <td>{t.trade_type}</td>
                              <td>{t.buy_price}</td>
                              <td>{t.sell_price}</td>
                              <td>{t.quantity}</td>
                              <td>{t.fees}</td>
                              <td>{yen(t.profit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p>
                      プレビューは先頭50件。500件ずつ保存します。途中で失敗した場合、完了したバッチは残ります。銘柄・日付・買値・売値・数量・口座・区分が同じ取引は重複扱いになります。
                    </p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                      />
                      プレビューと除外内容を確認しました
                    </label>
                    <button
                      className="terminal-button"
                      disabled={
                        !accepted ||
                        !selected.trades.length ||
                        !!preview.errors.length ||
                        busy
                      }
                      onClick={() => void save()}
                    >
                      {busy ? "登録中…" : "プレビューの取引を登録"}
                    </button>
                  </>
                )}
              </>
            )}
          </fieldset>
          {message && <p role="status">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
