"use client";

import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DevNoticeModal() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		// Cookieが存在するか確認
		const hasAccepted = document.cookie
			.split("; ")
			.find((row) => row.startsWith("dev_notice_seen="));

		if (!hasAccepted) {
			setOpen(true);
		}
	}, []);

	const handleClose = () => {
		setOpen(false);

		// ✅ 1日（24時間）有効なCookieを設定
		const expires = new Date();
		expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
		document.cookie = `dev_notice_seen=true; expires=${expires.toUTCString()}; path=/`;
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-xl font-bold text-center">
						🚧 デイトレード.netは現在開発中です
					</DialogTitle>
				</DialogHeader>
				<div className="text-sm leading-relaxed text-center">
					<p className="mb-3">
						現在、本サイトはベータ版（開発中）です。
						<br />
						システムエラーやデータ不具合が発生する可能性があります。
					</p>
					<p className="font-semibold">
						取引・投資判断は必ず自己責任でお願いいたします。
					</p>
				</div>
				<div className="flex justify-center mt-6">
					<Button onClick={handleClose}>理解しました</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
