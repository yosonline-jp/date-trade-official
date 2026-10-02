"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Footer = () => {
	const pathname = usePathname();
	const isDashboard = pathname.includes("/dashboard");

	if (isDashboard) {
		return null;
	}

	return (
		<footer className="mx-auto px-4 font-sans md:px-8">
			<div className="mb-16 grid grid-cols-2 gap-12 border-t pt-10 md:grid-cols-4 lg:grid-cols-6 lg:gap-8 lg:pt-12">
				{/* ロゴと説明 */}
				<div className="col-span-full lg:col-span-2">
					<div className="mb-4 lg:-mt-2">
						<Link
							href="/"
							className="relative inline-flex items-center gap-2 text-xl font-bold md:text-2xl"
							aria-label="logo"
						>
							デイトレード.net
						</Link>
					</div>

					<p className="mb-6 text-sm sm:pr-8 text-muted-foreground">
						デイトレード.netは、あなたの毎日のトレード結果を簡単に記録・分析できる投資管理アプリです。
						収支の可視化、勝率の分析、取引メモの保存など、すべてをシンプルに。
					</p>
				</div>

				{/* About */}
				<div>
					<div className="mb-4 font-bold uppercase tracking-widest">About</div>
					<nav className="flex flex-col gap-4 text-sm">
						<div>
							<Link
								href="/about"
								className="transition duration-100 hover:underline"
							>
								デイトレード.netとは？
							</Link>
						</div>
						<div>
							<Link
								href="/features"
								className="transition duration-100 hover:underline"
							>
								機能紹介
							</Link>
						</div>
					</nav>
				</div>

				{/* Support */}
				<div>
					<div className="mb-4 font-bold uppercase tracking-widest">
						Support
					</div>
					<nav className="flex flex-col gap-4 text-sm">
						<div>
							<Link
								href="/contact"
								className="transition duration-100 hover:underline"
							>
								お問い合わせ
							</Link>
						</div>
						<div>
							<Link
								href="/faq"
								className="transition duration-100 hover:underline"
							>
								よくある質問
							</Link>
						</div>
					</nav>
				</div>

				{/* Legal */}
				<div>
					<div className="mb-4 font-bold uppercase tracking-widest">Legal</div>
					<nav className="flex flex-col gap-4 text-sm">
						<div>
							<Link
								href="/terms-of-service"
								className="transition duration-100 hover:underline"
							>
								利用規約
							</Link>
						</div>
						<div>
							<Link
								href="/privacy-policy"
								className="transition duration-100 hover:underline"
							>
								プライバシーポリシー
							</Link>
						</div>
						<div>
							<Link
								href="/disclaimer"
								className="transition duration-100 hover:underline"
							>
								免責事項
							</Link>
						</div>
					</nav>
				</div>
			</div>

			{/* コピーライト */}
			<div className="border-t py-8 text-center text-sm text-muted-foreground">
				© {new Date().getFullYear()} デイトレード.net. All rights reserved.{" "}
				<span className="hidden sm:inline">|</span>{" "}
				<Link
					href="https://www.yosonline.jp"
					className="underline hover:text-foreground"
					target="_blank"
				>
					Made by YOSONLINE
				</Link>
			</div>
		</footer>
	);
};

export default Footer;
