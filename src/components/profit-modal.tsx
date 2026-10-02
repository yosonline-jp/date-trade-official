"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Check,
  Loader2,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  addProfit,
  updateProfit,
  deleteProfit,
  saveProfitAdjustment,
} from "@/app/actions/profit";
import { toDateKey } from "@/utils/utils";
import { toast } from "@/hooks/use-toast";

import { yen, type Trade } from "@/lib/journal";
import Link from "next/link";
export type ProfitRecord = {
  id: number | null;
  date: string;
  amount: number;
  adjustment?: number;
  tradeTotal?: number;
};

export default function ProfitModal({
  record,
  date,
  open,
  onClose,
  updateCalendar,
  source = "manual",
  trades = [],
}: {
  source?: "manual" | "trades";
  trades?: Trade[];
  record: ProfitRecord | null;
  date: Date;
  open: boolean;
  onClose: () => void;
  updateCalendar: () => void;
}) {
  const [value, setValue] = useState(
    source === "trades"
      ? String(record?.adjustment || 0)
      : record
        ? String(record.amount)
        : "",
  );
  const [operation, setOperation] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amount = Number(value);
  const valid =
    value.trim() !== "" && Number.isFinite(amount) && Math.abs(amount) <= 1e12;
  const tone = valid
    ? amount > 0
      ? "positive"
      : amount < 0
        ? "negative"
        : "neutral"
    : "neutral";
  const busy = operation !== null;
  const dateLabel = date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!valid) {
      setError("収支を正しい円単位で入力してください。");
      return;
    }
    setError("");
    setOperation("save");
    try {
      if (source === "trades")
        await saveProfitAdjustment(toDateKey(date), amount);
      else if (record?.id) await updateProfit(record.id, amount);
      else await addProfit(toDateKey(date), amount);
      updateCalendar();
      onClose();
      toast({ title: "収支を保存しました", description: dateLabel });
    } catch {
      setError(
        "保存できませんでした。入力内容を確認して、もう一度お試しください。",
      );
    } finally {
      setOperation(null);
    }
  }
  async function remove() {
    if (!record?.id || busy) return;
    setError("");
    setOperation("delete");
    try {
      await deleteProfit(record.id);
      setConfirmDelete(false);
      updateCalendar();
      onClose();
      toast({ title: "収支を削除しました", description: dateLabel });
    } catch {
      setConfirmDelete(false);
      setError("削除できませんでした。もう一度お試しください。");
    } finally {
      setOperation(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        className="profit-dialog"
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader className="profit-dialog-heading">
          <span className="profit-dialog-icon">
            <CalendarDays size={25} />
          </span>
          <p className="eyebrow">DAILY PROFIT</p>
          <DialogTitle>
            {source === "trades"
              ? "取引と収支調整"
              : record
                ? "収支を編集"
                : "収支を記録"}
          </DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>
        {source === "trades" && (
          <div className="journal-day-trades">
            <p>
              取引損益 {yen(record?.tradeTotal || 0)} / 合計{" "}
              {yen((record?.tradeTotal || 0) + (valid ? amount : 0))}
            </p>
            {trades.length ? (
              trades.map((t) => (
                <p key={t.id}>
                  <Link
                    href={"/dashboard/trade-records?date=" + toDateKey(date)}
                  >
                    {t.stock_code} {t.stock_name} · {t.trade_type}
                  </Link>
                  <strong>{yen(Number(t.profit))}</strong>
                </p>
              ))
            ) : (
              <p>この日の実取引はありません。</p>
            )}
          </div>
        )}
        <form onSubmit={save}>
          <label className="profit-amount-label" htmlFor="profit-amount">
            {source === "trades" ? "収支の調整額" : "この日の損益"}
            <span>JPY / 円</span>
          </label>
          <div className={"profit-amount-input " + tone}>
            <span aria-hidden="true">¥</span>
            <Input
              id="profit-amount"
              type="number"
              step="0.01"
              required
              value={value}
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? "profit-input-help profit-input-error"
                  : "profit-input-help"
              }
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="0"
            />
          </div>
          <p className="profit-input-help" id="profit-input-help">
            {source === "trades"
              ? "追加費用はマイナス、その他の利益はプラス。取引登録済みの手数料は再入力不要です。"
              : "利益はプラス、損失はマイナスの金額を入力してください。"}
          </p>
          <div className={"profit-amount-preview " + tone}>
            {valid ? (
              <>
                {amount < 0 ? (
                  <TrendingDown size={18} />
                ) : (
                  <TrendingUp size={18} />
                )}
                <span>
                  {amount > 0 ? "利益" : amount < 0 ? "損失" : "収支ゼロ"}
                </span>
                <strong>
                  {amount > 0 ? "+" : amount < 0 ? "−" : ""}¥
                  {Math.abs(amount).toLocaleString("ja-JP")}
                </strong>
              </>
            ) : (
              <span>金額を入力すると、ここで確認できます。</span>
            )}
          </div>
          {error && (
            <p
              id="profit-input-error"
              className="profit-form-error"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="profit-dialog-actions">
            {record?.id && source === "manual" && (
              <AlertDialog
                open={confirmDelete}
                onOpenChange={(next) => {
                  if (!busy) setConfirmDelete(next);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="profit-delete-button"
                    disabled={busy}
                  >
                    <Trash2 size={15} />
                    削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="profit-dialog profit-delete-dialog">
                  <AlertDialogHeader>
                    <span className="profit-delete-icon">
                      <Trash2 size={23} />
                    </span>
                    <AlertDialogTitle>
                      この日の収支を削除しますか？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {dateLabel}の記録を削除します。この操作は取り消せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>
                      キャンセル
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="profit-confirm-delete"
                      disabled={busy}
                      onClick={(e) => {
                        e.preventDefault();
                        void remove();
                      }}
                    >
                      {operation === "delete" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                className="profit-primary-button"
                disabled={busy || !valid}
              >
                {operation === "save" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {operation === "save" ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
