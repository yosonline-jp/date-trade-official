"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Stock {
	id: number;
	code: string;
	name: string;
	market: string;
	industry: string;
}

export default function StockListPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// URLパラメータから初期値を取得
	const initialPage = parseInt(searchParams.get("page") || "1");
	const initialSearch = searchParams.get("search") || "";

	const [stocks, setStocks] = useState<Stock[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(initialPage);
	const [search, setSearch] = useState(initialSearch);
	const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

	const limit = 20;

	// 🔹 入力が止まって500ms経過したらdebouncedSearchに反映
	useEffect(() => {
		if (search === debouncedSearch) return;
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1); // 新しい検索時はリセット
			updateUrl(1, search);
		}, 500);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	// 🔹 ページまたは検索が変わるたびにAPI呼び出し
	useEffect(() => {
		fetchStocks();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, debouncedSearch]);

	// 🔹 URLを更新（状態保持のため）
	function updateUrl(p: number, s: string) {
		const params = new URLSearchParams();
		params.set("page", p.toString());
		if (s) params.set("search", s);
		router.replace(`/dashboard/stocks?${params.toString()}`);
	}

	async function fetchStocks() {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/stocks?page=${page}&search=${encodeURIComponent(debouncedSearch)}`
			);
			if (!res.ok) throw new Error("APIエラー");
			const data = await res.json();
			setStocks(data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}

	// 🔹 ページ変更時にURL更新
	function handlePageChange(newPage: number) {
		setPage(newPage);
		updateUrl(newPage, debouncedSearch);
	}

	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">日本株一覧</h1>

			{/* 🔍 検索フォーム */}
			<div className="flex justify-center gap-2 mb-6">
				<Input
					type="text"
					placeholder="銘柄名 または 銘柄コードで検索"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>
				<Button
					type="button"
					onClick={() => {
						setDebouncedSearch(search);
						setPage(1);
						updateUrl(1, search);
					}}
				>
					検索
				</Button>
			</div>

			{/* 📊 テーブル */}
			<div className="border rounded-md overflow-hidden">
				{loading ? (
					<div className="flex justify-center py-20">
						<Loader2 className="animate-spin w-6 h-6" />
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-24">銘柄コード</TableHead>
								<TableHead>銘柄名</TableHead>
								<TableHead>市場</TableHead>
								<TableHead>業種</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{stocks.length > 0 ? (
								stocks.map((stock) => (
									<TableRow
										key={stock.code}
										className="cursor-pointer hover:bg-accent"
										onClick={() =>
											router.push(`/dashboard/stocks/${stock.code}`)
										}
									>
										<TableCell>{stock.code}</TableCell>
										<TableCell>{stock.name}</TableCell>
										<TableCell>{stock.market}</TableCell>
										<TableCell>{stock.industry}</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center py-8 text-muted-foreground"
									>
										データが見つかりませんでした
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				)}
			</div>

			{/* ⏩ ページネーション */}
			<div className="flex justify-center items-center gap-4 mt-8">
				<Button
					variant="outline"
					disabled={page === 1}
					onClick={() => handlePageChange(Math.max(1, page - 1))}
				>
					前へ
				</Button>
				<span className="text-sm">ページ {page}</span>
				<Button
					variant="outline"
					disabled={stocks.length < limit}
					onClick={() => handlePageChange(page + 1)}
				>
					次へ
				</Button>
			</div>
		</div>
	);
}
