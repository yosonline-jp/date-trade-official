/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type TradeRecord = {
	id: number;
	stock_code: string;
	stock_name: string;
	buy_price: number;
	sell_price: number;
	quantity: number;
	profit: number;
	trade_date: string;
	memo: string;
	trade_type: string;
	type: "real" | "demo";
	created_at: string;
	users?: {
		id: string;
		account: string;
		nickname: string | null;
		avatar: string | null;
	};
};

type WatchItem = {
	users: {
		id: string;
		account: string;
		nickname: string | null;
		avatar: string | null;
	};
};

export function TradeRecordsTab({
	initialRecords,
	watchlist,
}: {
	initialRecords: TradeRecord[];
	watchlist: WatchItem[];
}) {
	const [activeTab, setActiveTab] = useState<"real" | "demo" | "favorites">(
		"real"
	);
	return (
		<div className="mt-6">
			<Tabs
				defaultValue="real"
				onValueChange={(v) => setActiveTab(v as "real" | "demo" | "favorites")}
			>
				<TabsList className="flex justify-center mb-">
					<TabsTrigger value="real">リアルトレード</TabsTrigger>
					<TabsTrigger value="demo">デモトレード</TabsTrigger>
					<TabsTrigger value="favorites">ウォッチリスト</TabsTrigger>
				</TabsList>

				{["real", "demo"].map((type) => (
					<TabsContent key={type} value={type}>
						<TradeTable
							records={initialRecords.filter((r) => r.type === type)}
						/>
					</TabsContent>
				))}
				{activeTab === "favorites" && (
					<TabsContent value="favorites">
						{watchlist.length === 0 ? (
							<p className="text-center text-gray-500 m-12">
								ウォッチリストに登録されているトレーダーがいません
							</p>
						) : (
							<>
								{watchlist.map((record) => (
									<Card
										key={`${record.users.id}`}
										className="shadow-sm border border-gray-100 hover:shadow-md transition-all"
									>
										<CardHeader>
											<Link
												href={`/traders/${
													record.users.account || record.users.id
												}`}
											>
												<div className="flex items-center gap-3">
													<Avatar>
														<AvatarImage
															src={record.users.avatar || undefined}
														/>
														<AvatarFallback>
															{record.users.nickname?.[0] || "無"}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-semibold">
															{record.users.nickname || "ノーネーム"}
														</p>
													</div>
												</div>
											</Link>
										</CardHeader>
									</Card>
								))}
							</>
						)}
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}

function TradeTable({ records }: { records: TradeRecord[] }) {
	return (
		<div className="space-y-4 mt-4">
			{records.length === 0 && (
				<p className="text-center text-gray-500 m-12">取引記録がありません</p>
			)}
			{records.map((record) => (
				<Card
					key={`${record.id}-${record.created_at}`}
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
										{record.users?.nickname?.[0] || "無"}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-semibold">
										{record.users?.nickname || "ノーネーム"}
									</p>
									<p className="text-xs text-gray-500">
										{new Date(record.created_at).toLocaleString("ja-JP", {
											timeZone: "Asia/Tokyo",
											year: "numeric",
											month: "2-digit",
											day: "2-digit",
										})}
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
							<p className="mt-2 text-gray-700 whitespace-pre-wrap">
								{record.memo}
							</p>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
