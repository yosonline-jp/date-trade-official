"use client";
import { useState } from "react";
import {
  saveJournalTrade,
  uploadTradeScreenshot,
  removeTradeScreenshot,
} from "@/app/actions/journal";
import { tradeProfit, todayKey, yen, type Trade } from "@/lib/journal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StockSearchField } from "@/components/pages/dashboard/trade/stock-search-field";
export default function TradeEditor({
  record,
  type,
  onClose,
  onSuccess,
}: {
  record?: Trade;
  type: "real" | "demo";
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [stock, setStock] = useState({
      code: record?.stock_code || "",
      name: record?.stock_name || "",
    }),
    [date, setDate] = useState(record?.trade_date || todayKey()),
    [direction, setDirection] = useState(record?.trade_type || "現物");
  const [buy, setBuy] = useState(String(record?.buy_price || "")),
    [sell, setSell] = useState(String(record?.sell_price || "")),
    [quantity, setQuantity] = useState(String(record?.quantity || "")),
    [fees, setFees] = useState(String(record?.fees || 0));
  const [memo, setMemo] = useState(record?.memo || ""),
    [entry, setEntry] = useState(record?.entry_reason || ""),
    [reflection, setReflection] = useState(record?.reflection || ""),
    [tags, setTags] = useState(record?.tags?.join(", ") || ""),
    [visibility, setVisibility] = useState(record?.visibility || "private");
  const [file, setFile] = useState<File | null>(null),
    [removeImage, setRemoveImage] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const profit = tradeProfit({
    buy_price: Number(buy),
    sell_price: Number(sell),
    quantity: Number(quantity),
    fees: Number(fees),
    trade_type: direction,
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    let uploaded: string | null = null;
    let saved = false;
    try {
      if (file) {
        const form = new FormData();
        form.set("file", file);
        uploaded = await uploadTradeScreenshot(form);
      }
      await saveJournalTrade(
        {
          stock_code: stock.code,
          stock_name: stock.name,
          trade_date: date,
          buy_price: Number(buy),
          sell_price: Number(sell),
          quantity: Number(quantity),
          fees: Number(fees),
          trade_type: direction,
          type,
          memo,
          entry_reason: entry,
          reflection,
          tags: [
            ...new Set(
              tags
                .split(/[,、]/)
                .map((t) => t.trim())
                .filter(Boolean),
            ),
          ],
          visibility,
          screenshot_path:
            uploaded || (removeImage ? null : record?.screenshot_path || null),
        },
        record?.id,
      );
      saved = true;
      if (record?.screenshot_path && (uploaded || removeImage))
        await removeTradeScreenshot(record.screenshot_path).catch(() => {});
      onClose();
      await onSuccess();
    } catch (e) {
      if (uploaded && !saved)
        await removeTradeScreenshot(uploaded).catch(() => {});
      setError(e instanceof Error ? e.message : "保存できませんでした。");
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
      <DialogContent
        className="profit-dialog max-w-3xl max-h-[90dvh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {record ? "取引と振り返りを編集" : "取引を記録"}
          </DialogTitle>
          <DialogDescription>
            {type === "real" ? "実取引" : "デモ取引"} ·
            損益は手数料控除後に計算します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void save(e)} className="journal-tools">
          <fieldset disabled={busy}>
            <div className="journal-form-grid">
              <div className="journal-field">
                <label>銘柄</label>
                <StockSearchField onSelect={setStock} />
                <p>
                  {stock.code} {stock.name}
                </p>
              </div>
              <label className="journal-field">
                決済日
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="journal-field">
                取引区分
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  {["現物", "買建", "売建"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {[
                [
                  direction === "売建" ? "建値・売建（円）" : "買値（円）",
                  buy,
                  setBuy,
                ],
                [
                  direction === "売建" ? "決済値・買返済（円）" : "売値（円）",
                  sell,
                  setSell,
                ],
                ["数量（株）", quantity, setQuantity],
                ["手数料等（円）", fees, setFees],
              ].map(([label, value, setter], i) => (
                <label className="journal-field" key={String(label)}>
                  {String(label)}
                  <input
                    type="number"
                    required
                    min={i === 3 ? "0" : "0.01"}
                    step={i === 2 ? "1" : "any"}
                    value={value as string}
                    onChange={(e) =>
                      (setter as (v: string) => void)(e.target.value)
                    }
                  />
                </label>
              ))}
              <label className="journal-field">
                公開範囲
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as "public" | "private")
                  }
                >
                  <option value="private">非公開（自分だけ）</option>
                  <option value="public">公開（メモ・画像も公開）</option>
                </select>
              </label>
            </div>
            <p className="journal-help">
              手数料控除後の損益: {Number.isFinite(profit) ? yen(profit) : "—"}
            </p>
            <label className="journal-field">
              エントリー理由
              <textarea
                maxLength={5000}
                rows={2}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
              />
            </label>
            <label className="journal-field">
              反省点・次回への気づき
              <textarea
                maxLength={5000}
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </label>
            <label className="journal-field">
              その他のメモ
              <textarea
                maxLength={5000}
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </label>
            <label className="journal-field">
              タグ（カンマ区切り・12個まで）
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="順張り, 押し目, ルール違反"
              />
            </label>
            <label className="journal-field">
              チャート画像（PNG・JPEG・WebP、3MBまで）
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setRemoveImage(false);
                }}
              />
            </label>
            {record?.screenshot_path && !removeImage && (
              <>
                <a
                  href={"/api/journal/image/" + record.id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  保存済みのチャート画像を見る
                </a>
                <button
                  type="button"
                  className="terminal-button secondary"
                  onClick={() => {
                    setRemoveImage(true);
                    setFile(null);
                  }}
                >
                  保存時に画像を削除
                </button>
              </>
            )}
            <div className="journal-actions">
              <button
                type="button"
                className="terminal-button secondary"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button className="terminal-button" type="submit">
                {busy ? "保存中…" : "記録を保存"}
              </button>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="data-notice">
              {error}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
