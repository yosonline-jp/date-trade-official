import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, BookOpen, LineChart, Brain, User } from "lucide-react";

export const metadata = {
	title: "機能紹介 | デイトレード.net",
	description:
		"デイトレード.netの機能紹介ページです。トレード記録、日本株データ閲覧、基礎学習、戦略分析、メンタル管理など、トレーダーを支援する多彩な機能を提供します。",
};

export default function FeaturesPage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			<h1 className="text-3xl font-bold mb-6 text-center">機能紹介</h1>
			<p className="text-center mb-12">
				デイトレード.netは、あなたのデイトレードを「記録・分析・成長」へと導くトレーダー支援プラットフォームです。
				初心者から上級者まで、あらゆるトレーダーが使いやすい設計を目指しています。
			</p>

			{/* 機能1：トレード記録 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<LineChart className="w-6 h-6 text-blue-500" />
					<CardTitle>トレード記録機能</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						その日の取引結果を簡単に記録できる機能です。銘柄コード・取引時間・購入／売却価格・損益などを登録できます。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>日ごとの損益を自動集計</li>
						<li>勝率・平均利益・平均損失などの統計データを可視化</li>
						<li>月間・年間単位での分析にも対応</li>
					</ul>
				</CardContent>
			</Card>

			{/* 機能2：日本株データ閲覧 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<BarChart3 className="w-6 h-6 text-green-500" />
					<CardTitle>日本株データ一覧</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						日本株の基本情報を閲覧できる一覧ページを用意。銘柄コードや会社名で検索でき、
						チャート分析やトレード対象選定のサポートを行います。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>20件ごとのページネーション付き一覧表示</li>
						<li>名前・銘柄コードによる高速検索機能</li>
						{/* <li>リアルタイム更新に対応（今後拡張予定）</li> */}
					</ul>
				</CardContent>
			</Card>

			{/* 機能3：デイトレ基礎学習 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<BookOpen className="w-6 h-6 text-yellow-500" />
					<CardTitle>デイトレ基礎講座</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						初心者でも理解しやすいように、デイトレードの基本を学べるコンテンツを用意しています。
						チャートの読み方、リスク管理、資金配分など、トレードを始めるための土台をしっかり作れます。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>初心者向けの用語解説</li>
						<li>基本戦略とリスクの理解</li>
						<li>トレード日誌の活用法</li>
					</ul>
				</CardContent>
			</Card>

			{/* 機能4：トレード戦略分析 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<Brain className="w-6 h-6 text-purple-500" />
					<CardTitle>トレード戦略分析</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						自分の取引履歴をもとに「どの戦略が自分に合っているか」を分析できます。
						スキャルピング・順張り・逆張りなど、手法別の勝率を可視化します。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						<li>トレードスタイルごとの損益推移</li>
						<li>過去データの分析と改善提案</li>
						{/* <li>バックテスト機能（今後追加予定）</li> */}
					</ul>
				</CardContent>
			</Card>

			{/* 機能5：メンタル・習慣管理 */}
			<Card className="mb-10">
				<CardHeader className="flex flex-row items-center gap-3">
					<User className="w-6 h-6 text-red-500" />
					<CardTitle>メンタル・習慣サポート</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-relaxed space-y-3">
					<p>
						デイトレでは「心の安定」が最も重要です。感情の揺れを記録し、
						日ごとに自分の心理状態を把握することで、冷静な判断を保つサポートをします。
					</p>
					<ul className="list-disc pl-6 space-y-1">
						{/* <li>感情ログ機能（焦り・恐怖・自信など）</li> */}
						<li>毎日のトレード反省メモ</li>
						<li>トレードルールチェックリスト</li>
					</ul>
				</CardContent>
			</Card>

			{/* 今後のアップデート予定 */}
			{/* <Separator className="my-12" />
			<div className="text-center space-y-3">
				<h2 className="text-2xl font-bold">今後のアップデート予定</h2>
				<p className="text-sm">
					デイトレード.netは、今後も継続的に機能を追加予定です。
				</p>
				<ul className="list-disc inline-block text-left pl-6 text-sm">
					<li>リアルタイム株価チャート</li>
					<li>AIによるトレード傾向分析</li>
					<li>他トレーダーとの比較機能</li>
					<li>有料プレミアプランでの高精度データ提供</li>
				</ul>
			</div> */}
		</div>
	);
}
