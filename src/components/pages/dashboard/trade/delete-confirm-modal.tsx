"use client";

import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	record: {
		stock_name: string;
		trade_date: string;
	};
}

export function DeleteConfirmModal({
	open,
	onClose,
	onConfirm,
	record,
}: DeleteConfirmModalProps) {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="text-red-500 w-5 h-5" />
						トレード削除の確認
					</DialogTitle>
				</DialogHeader>

				<p className="text-sm text-muted-foreground mb-4">
					<span className="font-semibold">{record.stock_name}</span>（
					{record.trade_date}）の記録を削除しますか？ この操作は取り消せません。
				</p>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						キャンセル
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						削除する
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
