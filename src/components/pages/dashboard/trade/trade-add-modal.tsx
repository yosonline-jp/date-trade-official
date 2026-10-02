"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { addTradeRecord } from "@/app/actions/trades";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StockSearchField } from "./stock-search-field";
import "./trade-add-modal.css";

export function TradeAddModal({
  open,
  onClose,
  onSuccess,
  type,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  type: "real" | "demo";
}) {
  const [viewport, setViewport] = useState<{
    height: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const view = window.visualViewport;
    const update = () =>
      setViewport({ height: view.height, top: view.offsetTop });
    update();
    view.addEventListener("resize", update);
    view.addEventListener("scroll", update);
    return () => {
      view.removeEventListener("resize", update);
      view.removeEventListener("scroll", update);
    };
  }, [open]);
  const [stockCode, setStockCode] = useState("");
  const [stockName, setStockName] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");
  const [tradeDate, setTradeDate] = useState<Date | undefined>(new Date());
  const [tradeType, setTradeType] = useState("現物");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const estimatedProfit =
    (tradeType === "売建"
      ? Number(buyPrice) - Number(sellPrice)
      : Number(sellPrice) - Number(buyPrice)) * Number(quantity);
  const showEstimate =
    Number(buyPrice) > 0 && Number(sellPrice) > 0 && Number(quantity) > 0;

  async function handleSubmit() {
    const buy = Number(buyPrice);
    const sell = Number(sellPrice);
    const shares = Number(quantity);
    if (
      !stockCode ||
      !tradeDate ||
      !Number.isFinite(buy) ||
      buy <= 0 ||
      !Number.isFinite(sell) ||
      sell <= 0 ||
      !Number.isInteger(shares) ||
      shares <= 0
    ) {
      toast.error("銘柄・日付・正しい価格と株数を入力してください。");
      return;
    }
    setLoading(true);
    try {
      await addTradeRecord({
        stock_code: stockCode,
        stock_name: stockName,
        buy_price: buy,
        sell_price: sell,
        quantity: shares,
        type,
        trade_type: tradeType,
        trade_date: format(tradeDate, "yyyy-MM-dd"),
        memo: memo.trim(),
      });
      toast.success("取引を記録しました。");
      onClose();
      setStockCode("");
      setStockName("");
      setBuyPrice("");
      setSellPrice("");
      setQuantity("");
      setMemo("");
      setTradeDate(new Date());
      setTradeType("現物");
      await onSuccess();
    } catch (error) {
      console.error("Failed to add trade record:", error);
      toast.error("登録に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) onClose();
      }}
    >
      <DialogContent
        className="trade-add-dialog"
        style={
          viewport
            ? ({
                "--trade-viewport-height": `${viewport.height}px`,
                "--trade-viewport-top": `${viewport.top}px`,
              } as CSSProperties)
            : undefined
        }
      >
        <DialogHeader className="trade-add-header">
          <p className="eyebrow">
            NEW TRADE <span>{type === "real" ? "REAL" : "DEMO"}</span>
          </p>
          <DialogTitle>取引を記録</DialogTitle>
          <DialogDescription>
            約定情報と振り返りを、ひとつの記録に。
          </DialogDescription>
        </DialogHeader>
        <div className="trade-add-form">
          <section className="trade-form-section" aria-label="取引の基本情報">
            <h3>
              <span>01</span> 基本情報
            </h3>
            <div className="trade-form-basics">
              <div className="trade-form-field">
                <Label>銘柄</Label>
                <StockSearchField
                  onSelect={(stock) => {
                    setStockCode(stock.code);
                    setStockName(stock.name);
                  }}
                />
                {stockCode && (
                  <p className="trade-selected-stock">
                    {stockName} <span>{stockCode}</span>
                  </p>
                )}
              </div>
              <div className="trade-form-field">
                <Label htmlFor="trade-date">取引日</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="trade-date"
                      variant="outline"
                      className="trade-date-trigger"
                    >
                      <CalendarIcon size={16} />
                      {tradeDate
                        ? format(tradeDate, "yyyy/MM/dd", { locale: ja })
                        : "日付を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={tradeDate}
                      onSelect={(date) => {
                        setTradeDate(date);
                        setCalendarOpen(false);
                      }}
                      locale={ja}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="trade-form-field">
              <Label>取引区分</Label>
              <RadioGroup
                value={tradeType}
                onValueChange={setTradeType}
                className="trade-type-options"
              >
                {[
                  ["現物", "spot"],
                  ["買建", "long"],
                  ["売建", "short"],
                ].map(([value, id]) => (
                  <div key={value}>
                    <RadioGroupItem value={value} id={`trade-${id}`} />
                    <Label htmlFor={`trade-${id}`}>{value}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </section>
          <section className="trade-form-section" aria-label="約定情報">
            <h3>
              <span>02</span> 約定情報
            </h3>
            <div className="trade-form-prices">
              <div className="trade-form-field">
                <Label htmlFor="trade-buy">
                  買値 <span>円</span>
                </Label>
                <Input
                  id="trade-buy"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={buyPrice}
                  onChange={(event) => setBuyPrice(event.target.value)}
                  placeholder="例：2,450"
                />
              </div>
              <div className="trade-form-field">
                <Label htmlFor="trade-sell">
                  売値 <span>円</span>
                </Label>
                <Input
                  id="trade-sell"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={sellPrice}
                  onChange={(event) => setSellPrice(event.target.value)}
                  placeholder="例：2,520"
                />
              </div>
              <div className="trade-form-field">
                <Label htmlFor="trade-quantity">
                  株数 <span>株</span>
                </Label>
                <Input
                  id="trade-quantity"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="例：100"
                />
              </div>
            </div>
          </section>
          <section
            className="trade-form-section trade-memo-section"
            aria-label="振り返り"
          >
            <div className="trade-form-field">
              <Label htmlFor="trade-memo">
                トレードメモ <span>任意</span>
              </Label>
              <textarea
                id="trade-memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="エントリーの理由、決済の判断、次回に活かしたい気づきなど"
                rows={3}
              />
            </div>
          </section>
        </div>
        <div className="trade-add-footer">
          <div className="trade-profit-preview" aria-live="polite">
            <span>概算損益</span>
            <strong
              className={
                showEstimate && estimatedProfit < 0 ? "negative" : "positive"
              }
            >
              {showEstimate
                ? `${estimatedProfit > 0 ? "+" : estimatedProfit < 0 ? "−" : ""}¥${Math.abs(estimatedProfit).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`
                : "—"}
            </strong>
          </div>
          <div className="trade-form-actions">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Plus size={16} /> {loading ? "登録中…" : "記録を保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
