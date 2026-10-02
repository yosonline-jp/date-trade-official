"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { saveWatchlistNote } from "@/app/actions/journal";
export type WatchNote = {
  stock_code: string;
  category: string;
  note: string;
  target_price: number | null;
};
export default function WatchNoteEditor({
  code,
  name,
  initial,
  onClose,
}: {
  code: string;
  name: string;
  initial?: WatchNote;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(initial?.category || ""),
    [note, setNote] = useState(initial?.note || ""),
    [price, setPrice] = useState(
      initial?.target_price == null ? "" : String(initial.target_price),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveWatchlistNote({
        stock_code: code,
        category,
        note,
        target_price: price.trim() ? Number(price) : null,
      });
      router.refresh();
      onClose();
    } catch (e) {
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
      <DialogContent className="profit-dialog">
        <DialogHeader>
          <DialogTitle>{name}の注目メモ</DialogTitle>
          <DialogDescription>
            分類・メモ・想定価格は自分だけに表示されます。
          </DialogDescription>
        </DialogHeader>
        <form className="journal-tools" onSubmit={(e) => void save(e)}>
          <fieldset disabled={busy}>
            <label className="journal-field">
              分類
              <input
                maxLength={50}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="watch-categories"
                placeholder="例：押し目待ち"
              />
              <datalist id="watch-categories">
                {["決算待ち", "押し目待ち", "ブレイク待ち", "長期保有候補"].map(
                  (v) => (
                    <option key={v} value={v} />
                  ),
                )}
              </datalist>
            </label>
            <label className="journal-field">
              注目理由
              <textarea
                maxLength={3000}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <label className="journal-field">
              想定価格（円・任意）
              <input
                type="number"
                min="0.01"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <div className="journal-actions">
              <button
                className="terminal-button secondary"
                type="button"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button className="terminal-button" type="submit">
                {busy ? "保存中…" : "メモを保存"}
              </button>
            </div>
          </fieldset>
          {error && <p role="alert">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
