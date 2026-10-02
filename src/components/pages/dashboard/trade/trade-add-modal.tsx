"use client";
import TradeEditor from "@/components/journal/trade-editor";
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
  return open ? (
    <TradeEditor type={type} onClose={onClose} onSuccess={onSuccess} />
  ) : null;
}
