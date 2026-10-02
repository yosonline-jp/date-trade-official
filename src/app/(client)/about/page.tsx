import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LineChart, Brain, Users, Rocket } from "lucide-react";

export const metadata = {
	title: "デイトレード.netとは？ | デイトレード.net",
	description:
		"デイトレード.netは、個人トレーダーの成長を支援する学習・分析・記録プラットフォームです。取引履歴や心理状態の可視化、データ分析、コミュニティ連携を通じて、トレードスキルの向上をサポートします。",
};

export default function AboutPage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			{/* ヘッダー */}
			<h1 className="text-3xl font-bold mb-6 text-center">
				デイトレード.netとは？
			</h1>
			<p className="text-center text-muted-foreground mb-12 leading-relaxed">
				「デイトレード.net」は、個人トレーダーの成長をサポートするために設計された
				学習・分析・記録プラットフォームです。
				トレードの「記録・分析・メンタル管理」をワンストップで行い、
				あなたのトレードスキルを継続的に進化させます。
			</p>

			{/* ミッション */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<Rocket className="w-6 h-6 text-blue-500" />
					<CardTitle>ミッション：トレーダーの「成長」を支える</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						デイトレードは「才能」ではなく「習慣」で結果が決まります。
						デイトレード.netは、日々の学びと振り返りをシステム化し、
						誰でも継続的に上達できる環境を提供します。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>取引履歴・勝率・心理状態を自動で可視化</li>
						<li>データに基づく自己分析で「感覚トレード」から卒業</li>
						<li>初心者でも理解しやすい基礎知識コンテンツを提供</li>
					</ul>
				</CardContent>
			</Card>

			{/* 特徴 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<LineChart className="w-6 h-6 text-green-500" />
					<CardTitle>特徴：トレードを「見える化」する</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						デイトレード.netの最大の特徴は、取引と心理の両方を記録・分析できる点です。
						感情や判断の傾向を数値化し、成功と失敗のパターンを明確にします。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>トレード履歴をグラフや統計で自動可視化</li>
						<li>心理ログによるメンタル分析機能</li>
						<li>データに基づいた改善提案（AI分析機能も開発予定）</li>
					</ul>
				</CardContent>
			</Card>

			{/* コミュニティビジョン */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<Users className="w-6 h-6 text-orange-500" />
					<CardTitle>ビジョン：一人でも孤独にならないトレード環境を</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						トレードは孤独な作業ですが、学びはチームで行う方が早く、深く身につきます。
						今後は、他のトレーダーと匿名で実績を共有したり、
						成長の過程を比較できる機能を順次追加予定です。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>コミュニティ連携による知識共有</li>
						<li>勝率や取引傾向を匿名比較</li>
						<li>上級者のトレード戦略を参考にできる分析ページ</li>
					</ul>
				</CardContent>
			</Card>

			{/* 開発背景 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<Brain className="w-6 h-6 text-purple-500" />
					<CardTitle>開発背景</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						開発者自身もトレード経験者であり、
						「感情のコントロール」「データ管理」「学びの継続」の難しさを痛感してきました。
						その経験をもとに、トレーダーがより合理的に成長できるツールを目指して開発しています。
					</p>
					<p>
						シンプルで使いやすいUIと、
						本当に役立つ機能だけを厳選して提供することを大切にしています。
					</p>
				</CardContent>
			</Card>

			{/* 区切り */}
			<Separator className="my-12" />

			{/* フッター */}
			<div className="text-center space-y-3">
				<h2 className="text-2xl font-bold">
					あなたのトレードを「習慣化」しよう
				</h2>
				<p className="text-sm text-muted-foreground">
					デイトレード.netは、ただの記録アプリではなく、
					あなたの成長を支える「相棒」です。
					毎日の小さな一歩が、確かなスキルへとつながります。
				</p>
			</div>
		</div>
	);
}
