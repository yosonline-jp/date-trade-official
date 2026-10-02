"use client";

import React, { useEffect, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	addToWatchlist,
	removeFromWatchlist,
	checkWatchlist,
} from "@/app/actions/watchlist";
import { Loader2, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
	stockCode: string;
	stockName: string;
}

export default function WatchlistButton({ stockCode, stockName }: Props) {
	const [isWatching, setIsWatching] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		async function fetchWatchStatus() {
			const result = await checkWatchlist(stockCode);
			setIsWatching(result);
			setLoading(false);
		}
		fetchWatchStatus();
	}, [stockCode]);

	const toggleWatchlist = async () => {
		startTransition(async () => {
			try {
				if (isWatching) {
					await removeFromWatchlist(stockCode);
					setIsWatching(false);
				} else {
					await addToWatchlist({ code: stockCode, name: stockName });
					setIsWatching(true);
				}
				toast({
					title: "成功",
					description: isWatching
						? "ウォッチリストから削除しました"
						: "ウォッチリストに追加しました",
				});
			} catch (err) {
				console.error(err);
				toast({
					title: "エラー",
					description: isWatching
						? "ウォッチリストからの削除に失敗しました"
						: "ウォッチリストへの追加に失敗しました",
					variant: "destructive",
				});
			}
		});
	};

	if (loading) {
		return (
			<Button disabled variant="outline">
				<Loader2 className="w-4 h-4 animate-spin" />
			</Button>
		);
	}

	return (
		<Button
			variant={isWatching ? "secondary" : "default"}
			onClick={toggleWatchlist}
			disabled={isPending}
		>
			<Star
				className={isPending ? "w-4 h-4 animate-spin" : "w-4 h-4"}
				style={
					isWatching
						? { color: "#fbbf24", fill: "#fbbf24" }
						: { color: "#a1a1aa" }
				}
			/>
			{isPending ? (
				<Loader2 className="w-4 h-4 animate-spin" />
			) : isWatching ? (
				"ウォッチリストから削除"
			) : (
				"ウォッチリストに追加"
			)}
		</Button>
	);
}
