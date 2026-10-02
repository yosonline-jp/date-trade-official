"use client";

import { Menu } from "lucide-react";
import { SHOW_BOT_MONITOR } from "@/lib/features";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import Image from "next/image";
import { Separator } from "../ui/separator";

const SheetMenu = ({ isLogin }: { isLogin: boolean }) => {
	const router = useRouter();
	const [open, setOpen] = useState(false);

	const goLink = (link: string) => {
		router.push(link);
		setOpen(false);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Menu className="mr-6 flex lg:hidden" />
			</SheetTrigger>

			<DialogTitle className="hidden text-center">メニュー</DialogTitle>

			<SheetContent className="z-[110]">
				<DialogDescription className="hidden" />

				<div className="mr-4 flex flex-col font-maru">
					<div className="flex flex-col space-y-1">
						{/* ロゴ */}
						<Button
							className="font-bold"
							onClick={() => goLink("/")}
							variant="link"
						>
							<Image
								src="/logo-dt.png"
								alt="デイトレード.net ロゴ"
								width={30}
								height={30}
							/>
						</Button>

						{/* メニュー項目 */}
						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/")}
							variant="link"
						>
							ホーム
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/stocks")}
							variant="link"
						>
							日本株一覧
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/ranking")}
							variant="link"
						>
							ランキング
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/watchlist")}
							variant="link"
						>
							ウォッチリスト
						</Button>

						<Separator />

						{/* デイトレーダー */}
						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/traders")}
							variant="link"
						>
							デイトレーダー
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/trades")}
							variant="link"
						>
							みんなのトレード
						</Button>

						{SHOW_BOT_MONITOR && (
							<Button
								className="w-full p-0 font-bold"
								onClick={() => goLink("/bot-trades")}
								variant="link"
							>
								Botモニター
							</Button>
						)}

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/technicals")}
							variant="link"
						>
							テクニカル分析
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/fundamental-analysis")}
							variant="link"
						>
							ファンダメンタル分析
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/chart")}
							variant="link"
						>
							チャート
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/news")}
							variant="link"
						>
							ニュース
						</Button>

						<Separator />

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/learn/basics")}
							variant="link"
						>
							デイトレード基礎
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/learn/strategies")}
							variant="link"
						>
							トレード戦略
						</Button>

						<Button
							className="w-full p-0 font-bold"
							onClick={() => goLink("/learn/psychology")}
							variant="link"
						>
							メンタル管理
						</Button>

						<Separator />

						{/* ログイン／ダッシュボード */}
						{isLogin ? (
							<Button
								className="w-full p-0 font-bold"
								onClick={() => goLink("/dashboard")}
								variant="link"
							>
								ダッシュボード
							</Button>
						) : (
							<Button
								onClick={() => goLink("/sign-in")}
								className="w-full p-0 font-bold"
								variant="link"
							>
								ログイン
							</Button>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default SheetMenu;
