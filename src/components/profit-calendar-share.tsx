"use client";
import { useRef, useState, type RefObject } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { yen } from "@/lib/journal";
export default function ProfitCalendarShare({
  target,
  disabled,
  year,
  month,
  total,
  label = "収支カレンダー",
  filenamePrefix = "profit-calendar",
}: {
  target: RefObject<HTMLElement | null>;
  disabled: boolean;
  year: number;
  month: number;
  total: number;
  label?: string;
  filenamePrefix?: string;
}) {
  const [open, setOpen] = useState(false),
    [generating, setGenerating] = useState(false),
    [hideMoney, setHideMoney] = useState(false),
    [capital, setCapital] = useState(""),
    [error, setError] = useState("");
  const [image, setImage] = useState<{
    url: string;
    filename: string;
    text: string;
  } | null>(null);
  const operation = useRef(false);
  const validCapital = Number(capital) > 0 && Number.isFinite(Number(capital));
  async function capture() {
    if (!target.current || disabled || operation.current) return;
    operation.current = true;
    setGenerating(true);
    setError("");
    try {
      const element = target.current;
      const { default: html2canvas } = await import("html2canvas");
      await document.fonts.ready;
      const canvas = await html2canvas(element, {
        backgroundColor: "#111e2c",
        scale: 2,
        logging: false,
        onclone: (_doc, clone) => {
          clone.style.width = "960px";
          clone.style.maxWidth = "none";
          clone
            .querySelectorAll<HTMLElement>(".profit-day-amount")
            .forEach((amount) => {
              amount.style.lineHeight = "1.6";
              amount.style.minHeight = "24px";
              amount.style.overflow = "visible";
              amount.style.setProperty("font-size", "14px", "important");
            });
          clone
            .querySelectorAll<HTMLElement>(".journal-stat-grid")
            .forEach((grid) => {
              grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
            });
          clone
            .querySelectorAll<HTMLElement>(".profit-calendar-body")
            .forEach((e) => {
              e.style.overflow = "visible";
            });
          clone
            .querySelectorAll<HTMLElement>(".profit-day-add")
            .forEach((e) => {
              e.style.visibility = "hidden";
            });
          clone
            .querySelectorAll<HTMLElement>("[data-share-summary]")
            .forEach((e) => {
              e.hidden = false;
            });
          if (hideMoney) {
            clone
              .querySelectorAll<HTMLElement>(
                "[data-share-money],.profit-day-amount",
              )
              .forEach((e) => {
                e.textContent = "非表示";
              });
            clone
              .querySelectorAll<HTMLElement>("[data-share-summary]")
              .forEach((e) => {
                e.textContent =
                  label +
                  " · デイトレード.net" +
                  (validCapital
                    ? " — 損益率 " +
                      ((total / Number(capital)) * 100).toFixed(2) +
                      "%"
                    : " — 金額非表示");
              });
          }
        },
      });
      const result = hideMoney
        ? validCapital
          ? "損益率 " + ((total / Number(capital)) * 100).toFixed(2) + "%"
          : "金額非表示"
        : yen(total);
      setImage({
        url: canvas.toDataURL("image/png"),
        filename:
          filenamePrefix +
          "-" +
          year +
          "-" +
          String(month + 1).padStart(2, "0") +
          ".png",
        text:
          year +
          "年" +
          (month + 1) +
          "月 " +
          label +
          " " +
          result +
          "\n#収支カレンダー #デイトレード",
      });
    } catch {
      setError("画像を作成できませんでした。もう一度お試しください。");
    } finally {
      setGenerating(false);
      operation.current = false;
    }
  }
  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = image.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setImage(null);
          setError("");
          setOpen(true);
        }}
      >
        <Share2 size={16} />
        シェア
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!generating) setOpen(value);
        }}
      >
        <DialogContent className="profit-dialog max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{label}をシェア</DialogTitle>
            <DialogDescription>
              画像を保存して、Xの投稿画面で添付してください。共有前にプレビューをご確認ください。
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hideMoney}
              disabled={generating}
              onChange={(e) => {
                setHideMoney(e.target.checked);
                setImage(null);
              }}
            />
            金額を非表示にする
          </label>
          {hideMoney && (
            <label className="journal-field">
              運用元本（円・任意）
              <input
                type="number"
                min="0.01"
                step="any"
                value={capital}
                disabled={generating}
                onChange={(e) => {
                  setCapital(e.target.value);
                  setImage(null);
                }}
                placeholder="入力すると損益率だけ表示"
              />
              <small>
                損益率 = 期間の損益 ÷
                入力した元本。元本は共有画像に含まれません。
              </small>
            </label>
          )}
          <Button
            disabled={generating || disabled}
            onClick={() => void capture()}
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}{" "}
            {generating
              ? "画像を作成中…"
              : image
                ? "画像を再作成"
                : "プレビューを作成"}
          </Button>
          {error && <p role="alert">{error}</p>}
          {image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={label + "の共有プレビュー"}
                className="w-full rounded-lg"
              />
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={download}>
                  <Download size={16} />
                  画像を保存
                </Button>
                <Button asChild>
                  <a
                    href={
                      "https://x.com/intent/post?text=" +
                      encodeURIComponent(image.text)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={download}
                  >
                    画像を保存してXで投稿
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Xで保存したPNG画像を添付してください。画像は自動添付されません。メモに書いた金額は自動で隠れません。
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
