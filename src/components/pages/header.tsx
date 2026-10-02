import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarImage } from "@/components/plate-ui/avatar";
import { ThemeSwitcher } from "../theme-switcher";
import SheetMenu from "./sheet-menu";

export function Header({
	isLogin,
	avatar,
	nickname,
}: {
	isLogin: boolean;
	avatar: string | undefined;
	nickname: string | null;
}) {
	return (
		<nav className="fixed left-0 top-0 z-[100] flex h-16 w-full justify-center border-b border-b-foreground/10 bg-white dark:bg-black">
			<div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
				{/* モバイルメニュー */}
				<SheetMenu isLogin={isLogin} />

				{/* デスクトップメニュー */}
				<NavigationMenu className="hidden lg:block">
					<NavigationMenuList>
						{/* ロゴ */}
						{/* flex の影響でアイコンが小さくなってしまうので対応をお願いします */}
						<NavigationMenuItem className="w-8">
							<Link href="/" className="">
								<Image
									src="/logo-dt.png"
									alt="DayTrade.net Logo"
									width={32}
									height={32}
									className="cursor-pointer rounded-md"
								/>
							</Link>
						</NavigationMenuItem>

						{/* ホーム */}
						<NavigationMenuItem>
							<Link href="/" className={navigationMenuTriggerStyle()}>
								ホーム
							</Link>
						</NavigationMenuItem>

						{/* 株価 */}
						<NavigationMenuItem>
							<NavigationMenuTrigger>株価</NavigationMenuTrigger>
							<NavigationMenuContent>
								<ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
									<ListItem href="/stocks" title="日本株一覧">
										主要銘柄や市場別の株価一覧をチェック
									</ListItem>
									<ListItem href="/ranking" title="ランキング">
										{/* 値上がり率・出来高などのランキングを確認 */}
										株式ランキング（総合）
									</ListItem>
									<ListItem href="/watchlist" title="ウォッチリスト">
										お気に入り銘柄を登録して監視
									</ListItem>
									<ListItem
										href="/fundamental-analysis"
										title="ファンダメンタル分析"
									>
										企業の業績や財務データを分析
									</ListItem>
								</ul>
							</NavigationMenuContent>
						</NavigationMenuItem>

						{/* デイトレーダー */}
						<NavigationMenuItem>
							<Link href="/traders" className={navigationMenuTriggerStyle()}>
								デイトレーダー
							</Link>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<Link href="/trades" className={navigationMenuTriggerStyle()}>
								みんなのトレード
							</Link>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<Link href="/bot-trades" className={navigationMenuTriggerStyle()}>
								Botモニター
							</Link>
						</NavigationMenuItem>

						{/* テクニカル */}
						<NavigationMenuItem>
							<Link href="/technicals" className={navigationMenuTriggerStyle()}>
								テクニカル分析
							</Link>
						</NavigationMenuItem>

						{/* チャート */}
						<NavigationMenuItem>
							<Link href="/chart" className={navigationMenuTriggerStyle()}>
								チャート
							</Link>
						</NavigationMenuItem>

						{/* ニュース */}
						<NavigationMenuItem>
							<Link href="/news" className={navigationMenuTriggerStyle()}>
								ニュース
							</Link>
						</NavigationMenuItem>

						{/* 学ぶ */}
						<NavigationMenuItem>
							<NavigationMenuTrigger>学ぶ</NavigationMenuTrigger>
							<NavigationMenuContent>
								<ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-1">
									<ListItem href="/learn/basics" title="デイトレード基礎">
										初心者向けの基礎知識を学ぼう
									</ListItem>
									<ListItem href="/learn/strategies" title="トレード戦略">
										スキャルピングや順張りなど実践的な戦略
									</ListItem>
									<ListItem href="/learn/psychology" title="メンタル管理">
										デイトレに必要な心理面を鍛える
									</ListItem>
								</ul>
							</NavigationMenuContent>
						</NavigationMenuItem>
						{/* ログインまたはダッシュボード */}
						<NavigationMenuItem>
							{isLogin ? (
								<NavigationMenuLink
									href="/dashboard"
									className={navigationMenuTriggerStyle()}
								>
									<Avatar className="h-7 w-7 shrink-0">
										<AvatarImage src={avatar} />
										<AvatarFallback>
											{nickname?.substring(0, 1) || "無"}
										</AvatarFallback>
									</Avatar>
								</NavigationMenuLink>
							) : (
								<NavigationMenuLink
									href="/sign-in"
									className={navigationMenuTriggerStyle()}
								>
									ログイン
								</NavigationMenuLink>
							)}
						</NavigationMenuItem>

						{/* テーマ切り替え */}
						<NavigationMenuItem className="z-[51]">
							<ThemeSwitcher />
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
			</div>
		</nav>
	);
}

// 共通リンク要素
const ListItem = React.forwardRef<
	React.ElementRef<"a">,
	React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
	return (
		<li>
			<NavigationMenuLink asChild>
				<Link
					ref={ref}
					className={cn(
						"block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
						className
					)}
					href={props.href ?? "#"}
					{...props}
				>
					<div className="text-sm font-bold leading-none">{title}</div>
					<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
						{children}
					</p>
				</Link>
			</NavigationMenuLink>
		</li>
	);
});
ListItem.displayName = "ListItem";
