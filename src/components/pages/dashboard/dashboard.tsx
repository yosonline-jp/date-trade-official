"use client";

import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	ArrowLeft,
	Home,
	Newspaper,
	TableProperties,
	Star,
	ChartCandlestick,
	TrendingUpDown,
	UserRound,
	UserRoundCheck,
	CircleUserRound,
	CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarImage } from "@/components/plate-ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserType } from "@/validations/profile";

export function SidebarDashboard({
	children,
	user,
}: Readonly<{
	children: React.ReactNode;
	user: UserType;
}>) {
	const [open, setOpen] = useState(false);

	return (
		<div
			className={cn(
				"mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
				"h-screen"
			)}
		>
			<Sidebar open={open} setOpen={setOpen}>
				<SidebarBody className="justify-between gap-10">
					<div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
						{open ? <Logo /> : <LogoIcon />}
						<div className="mt-8 flex flex-col gap-2">
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "ダッシュボード",
									href: "/dashboard",
									icon: (
										<Home className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							{/* 日本株一覧 */}
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "日本株一覧",
									href: "/dashboard/stocks",
									icon: (
										<TableProperties className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							{/* ウォッチリスト */}
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "ウォッチリスト",
									href: "/dashboard/watchlist",
									icon: (
										<Star className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							{/* デイトレード管理 */}
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "デイトレード記録",
									href: "/dashboard/trade-records",
									icon: (
										<TrendingUpDown className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							{/* 収支カレンダー */}
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "収支カレンダー",
									href: "/dashboard/profit-calendar",
									icon: (
										<CalendarDays className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							{/* フォロワー */}
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "フォロワー",
									href: "/dashboard/followers",
									icon: (
										<UserRound className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							{/* フォロー中 */}
							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "フォロー中",
									href: "/dashboard/following",
									icon: (
										<UserRoundCheck className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>

							{user.role === "admin" && (
								<SidebarLink
									onClick={() => setOpen(!open)}
									link={{
										label: "テクニカル管理",
										href: "/dashboard/technical",
										icon: (
											<ChartCandlestick className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
										),
									}}
								/>
							)}

							{user.role === "admin" && (
								<SidebarLink
									onClick={() => setOpen(!open)}
									link={{
										label: "ニュース管理",
										href: "/dashboard/news",
										icon: (
											<Newspaper className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
										),
									}}
								/>
							)}

							<SidebarLink
								onClick={() => setOpen(!open)}
								link={{
									label: "プロフィール",
									href: "/dashboard/profile",
									icon: (
										<CircleUserRound className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
									),
								}}
							/>
							<Separator className="dark:bg-white bg-neutral-200" />
							<Button
								className={cn(
									"flex items-center justify-start gap-2 group/sidebar py-2 px-0"
								)}
								variant={"ghost"}
								onClick={signOutAction}
							>
								<ArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200 ml-1" />
								{open && (
									<motion.span
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
									>
										ログアウト
									</motion.span>
								)}
							</Button>
						</div>
					</div>
					<div>
						<ThemeSwitcher />
						<SidebarLink
							link={{
								label: user.nickname,
								href: "/dashboard/profile",
								icon: (
									<Avatar className="h-7 w-7 shrink-0">
										<AvatarImage src={user.avatar} />
										<AvatarFallback>
											{user.nickname?.substring(0, 1) || "無"}
										</AvatarFallback>
									</Avatar>
								),
							}}
						/>
					</div>
				</SidebarBody>
			</Sidebar>
			<div className="flex flex-1">
				<div className="fixed overflow-auto flex h-full w-full flex-1 flex-col gap-2 rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
					{children}
				</div>
			</div>
		</div>
	);
}
export const Logo = () => {
	return (
		<Link
			href="/"
			className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
		>
			<Image
				src="/logo-dt.png"
				alt="Godot Tutorial Logo"
				width={25}
				height={25}
				className="cursor-pointer rounded"
			/>
			<motion.span
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="font-medium whitespace-pre text-black dark:text-white"
			>
				デイトレード.net
			</motion.span>
		</Link>
	);
};
export const LogoIcon = () => {
	return (
		<Link
			href="/"
			className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
		>
			<Image
				src="/logo-dt.png"
				alt="Godot Tutorial Logo"
				width={25}
				height={25}
				className="cursor-pointer rounded"
			/>
		</Link>
	);
};
