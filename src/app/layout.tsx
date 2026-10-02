/* eslint-disable */
import { GoogleAnalytics } from "@next/third-parties/google";
import { maru, marubold } from "@/utils/fonts";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import type { Viewport } from "next";


const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "";

const defaultUrl = process.env.NEXT_PUBLIC_MAIN_URL
	? (process.env.NEXT_PUBLIC_MAIN_URL.startsWith("http") ? process.env.NEXT_PUBLIC_MAIN_URL : `https://${process.env.NEXT_PUBLIC_MAIN_URL}`)
	: "http://localhost:3000";

const metadata = {
	metadataBase: new URL(defaultUrl),
	title: "デイトレード.net - あなたのデイトレ実績を記録・分析できるアプリ",
	description:
		"デイトレード.netは、毎日のデイトレード結果を簡単に記録・管理できるアプリです。損益の推移、勝率、取引メモなどを自動で整理し、あなたのトレードを次のレベルへ。無料で使える日本株データも搭載！",
	keywords:
		"デイトレード, デイトレ, 株式投資, トレード記録, 投資管理, 日本株, チャート, 株価, トレーダー, 投資分析",
};

const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	
	
};

export { metadata, viewport };

export default async function ClientLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="ja"
			className={`${maru.variable} ${marubold.variable}`}
			suppressHydrationWarning
		>
			{/* <head>
				<script
					data-name="BMC-Widget"
					data-cfasync="false"
					src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
					data-id="godottu"
					data-description="Support me on Buy me a coffee!"
					data-message="サポートする！"
					data-color="#5F7FFF"
					data-position="Right"
					data-x_margin="18"
					data-y_margin="18"
				></script>
			</head> */}
			<GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem={false}
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
				<Toaster />
				
			</body>
		</html>
	);
}

