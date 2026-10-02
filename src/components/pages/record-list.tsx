/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type TradeRecord = {
	id: number;
	type: "real" | "demo";
	stock_code: string;
	stock_name: string;
	buy_price: number;
	sell_price: number;
	quantity: number;
	profit: number;
	memo: string | null;
	trade_type: string;
	trade_date: string;
	created_at: string;
	nickname: string;
	avatar: string | null;
	users?: {
		id: string;
		account: string;
		nickname: string | null;
		avatar: string | null;
	};
};

export default function RecordList() {
	const [records, setRecords] = useState<TradeRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);

	const supabase = createClient();
	const observer = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const isInitialized = useRef(false); // Track initialization

	useEffect(() => {
		return () => {
			setRecords([]);
			setPage(0);
			setHasMore(true);
		};
	}, []);

	// Fetch trades
	const fetchTrades = async (pageNumber: number) => {
		if (loading || !hasMore) return;
		setLoading(true);

		const { data, error } = await supabase
			.from("trade_records")
			.select(
				"id, type, stock_code, stock_name, buy_price, sell_price, quantity, profit, memo, trade_date, trade_type, created_at, users(id, account,nickname, avatar)"
			)
			.order("created_at", { ascending: false })
			.range(pageNumber * 20, pageNumber * 20 + 19);

		if (error) {
			console.error(error);
			setLoading(false);
			return;
		}

		if (data.length < 20) setHasMore(false);
		setRecords(data as any[]);
		setLoading(false);
	};

	// Infinite scroll observer
	const lastElementRef = useCallback(
		(node: HTMLDivElement | null) => {
			if (loading) return;
			if (observer.current) observer.current.disconnect();

			observer.current = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting && hasMore) {
					setPage((prev) => prev + 1);
				}
			});

			if (node) observer.current.observe(node);
		},
		[loading, hasMore]
	);

	// Fetch data on page change
	useEffect(() => {
		if (isInitialized.current) return; // Prevent multiple calls
		isInitialized.current = true;
		fetchTrades(page);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	return (
		<>
			<div className="space-y-4 mt-12">
				{records.map((record, index) => (
					<Card
						key={`${record.id}-${record.created_at}`}
						ref={index === records.length - 1 ? lastElementRef : null}
						className="shadow-sm border border-gray-100 hover:shadow-md transition-all"
					>
						<CardHeader>
							<Link
								href={`/traders/${record.users?.account || record.users?.id}`}
							>
								<div className="flex items-center gap-3">
									<Avatar>
										<AvatarImage src={record.users?.avatar || undefined} />
										<AvatarFallback>
											{record.users?.nickname?.[0] || "?"}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-semibold">
											{record.users?.nickname || "匿名トレーダー"}
										</p>
										<p className="text-xs">
											{new Date(record.created_at).toLocaleString()}
										</p>
									</div>
								</div>
							</Link>
						</CardHeader>
						<CardContent>
							<Link
								href={`/stocks/${record.stock_code}`}
								className="text-blue-500 font-semibold text-lg"
							>
								<div className="flex flex-row items-center space-x-2">
									<Badge
										className={
											record.type == "real"
												? "bg-green-100 text-green-800"
												: "bg-blue-100 text-blue-800"
										}
									>
										{record.type == "real" ? "リアル" : "デモ"}
									</Badge>
									<p className="font-bold text-lg">
										{record.stock_name} ({record.stock_code})
									</p>
								</div>
							</Link>
							<p className="text-sm mt-2">
								買値：{record.buy_price.toLocaleString()}円 ／ 売値：
								{record.sell_price.toLocaleString()}円
							</p>
							<p className="text-sm">
								数量：{record.quantity}株 ／ 損益：
								<span
									className={`font-bold ${
										record.profit >= 0 ? "text-red-500" : "text-blue-500"
									}`}
								>
									{record.profit >= 0 ? "+" : ""}
									{record.profit.toLocaleString()}円
								</span>
							</p>
							<div className="text-sm my-1">
								取引区分:{" "}
								<Badge
									className={
										record.trade_type == "売建"
											? "bg-red-100 text-red-800"
											: "bg-blue-100 text-blue-800"
									}
								>
									{record.trade_type}
								</Badge>
							</div>
							<p className="text-sm">
								取引日:{" "}
								{new Date(record.trade_date).toLocaleDateString("ja-JP", {
									year: "numeric",
									month: "2-digit",
									day: "2-digit",
								})}
							</p>
							{record.memo && (
								<p className="mt-2 whitespace-pre-wrap p-2 border rounded-md text-sm">
									{record.memo}
								</p>
							)}
						</CardContent>
					</Card>
				))}
			</div>

			{loading && (
				<div className="flex justify-center py-6">
					<Loader2 className="w-6 h-6 animate-spin" />
				</div>
			)}

			<div ref={loadMoreRef} className="h-12" />
		</>
	);
}
