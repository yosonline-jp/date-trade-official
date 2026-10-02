"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchStocksAction } from "@/app/actions/stocks"; // ← Server Action を読み込み

interface Stock {
	id: number;
	code: string;
	name: string;
	market: string;
}

export function StockSearchField({
	onSelect,
}: {
	onSelect: (stock: Stock) => void;
}) {
	const [query, setQuery] = useState("");
	const [stocks, setStocks] = useState<Stock[]>([]);
	const [focused, setFocused] = useState(false);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!query) {
			setStocks([]);
			return;
		}

		const timer = setTimeout(() => {
			startTransition(async () => {
				const res = await searchStocksAction(query);
				setStocks(res);
			});
		}, 400);

		return () => clearTimeout(timer);
	}, [query]);

	return (
		<div className="relative">
			<div className="flex items-center">
				<Search className="w-4 h-4 text-muted-foreground mr-2" />
				<Input
					type="text"
					placeholder="銘柄名またはコードで検索"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={() => setTimeout(() => setFocused(false), 150)}
				/>
			</div>

			{focused && stocks.length > 0 && (
				<div
					className={cn(
						"absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
					)}
				>
					{isPending ? (
						<div className="flex justify-center py-4">
							<Loader2 className="animate-spin w-5 h-5" />
						</div>
					) : (
						stocks.map((stock) => (
							<div
								key={stock.code}
								className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
								onMouseDown={() => onSelect(stock)}
							>
								<div className="font-medium">{stock.name}</div>
								<div className="text-xs text-muted-foreground">
									{stock.code}・{stock.market}
								</div>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
