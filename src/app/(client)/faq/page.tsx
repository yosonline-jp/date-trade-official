import React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

export const metadata = {
	title: "よくある質問 | デイトレード.net",
	description:
		"デイトレード.netのよくある質問ページです。基本機能、登録方法、サポート体制など、ユーザーから寄せられる質問とその回答をまとめています。",
};

export default function FAQPage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			<h1 className="text-3xl font-bold mb-6 text-center">よくある質問</h1>
			<p className="text-center text-muted-foreground mb-10">
				デイトレード.netをご利用いただく中でよく寄せられる質問をまとめました。
				ここで解決しない場合は、お問い合わせフォームよりお気軽にご連絡ください。
			</p>

			<Card className="p-6">
				<Accordion type="single" collapsible className="w-full space-y-3">
					{/* Q1 */}
					<AccordionItem value="item-1">
						<AccordionTrigger>
							デイトレード.netは無料で使えますか？
						</AccordionTrigger>
						<AccordionContent>
							基本機能はすべて無料でご利用いただけます。
							{/* プレミアプランにアップグレードすることで、リアルタイム株価データ、詳細分析、AIトレード診断などの拡張機能をご利用いただけます。 */}
						</AccordionContent>
					</AccordionItem>

					{/* Q2 */}
					{/* <AccordionItem value="item-2">
						<AccordionTrigger>
							プレミアプランと法人プランの違いは何ですか？
						</AccordionTrigger>
						<AccordionContent>
							プレミアプランは個人トレーダー向けの上位プランで、高頻度データや追加分析機能を提供します。
							法人プランは企業や投資チーム向けで、API利用やデータ共有、チーム分析などビジネス利用を前提としています。
						</AccordionContent>
					</AccordionItem> */}

					{/* Q3 */}
					<AccordionItem value="item-3">
						<AccordionTrigger>登録に必要なものはありますか？</AccordionTrigger>
						<AccordionContent>
							メールアドレスとパスワードのみで簡単に登録できます。
							または、GoogleやXアカウントを使ったワンクリック登録も可能です。
							{/* 法人プランをご希望の場合は、法人名・担当者情報の入力が必要になります。 */}
						</AccordionContent>
					</AccordionItem>

					{/* Q4 */}
					<AccordionItem value="item-4">
						<AccordionTrigger>
							株価データの更新頻度はどのくらいですか？
						</AccordionTrigger>
						<AccordionContent>
							更新頻度は1日1回の更新となります。
							{/* プレミアプランでは数分単位での更新データをご利用いただけます。 */}
							{/* 今後、リアルタイムデータ対応も予定しています。 */}
						</AccordionContent>
					</AccordionItem>

					{/* Q5 */}
					<AccordionItem value="item-5">
						<AccordionTrigger>どのような分析ができますか？</AccordionTrigger>
						<AccordionContent>
							株価チャート、出来高推移、テクニカル指標（移動平均・RSIなど）に加え、
							あなたの取引履歴から勝率や損益傾向、感情ログなどを自動分析します。
							さらにAIによるトレード傾向診断機能を順次追加予定です。
						</AccordionContent>
					</AccordionItem>

					{/* Q6 */}
					<AccordionItem value="item-6">
						<AccordionTrigger>モバイルでも使えますか？</AccordionTrigger>
						<AccordionContent>
							はい。スマートフォン・タブレット・PCすべてに最適化されたデザインです。
							外出先でもチャート確認や学習コンテンツの閲覧が可能です。
						</AccordionContent>
					</AccordionItem>

					{/* Q7 */}
					<AccordionItem value="item-7">
						<AccordionTrigger>
							どのようなサポート体制がありますか？
						</AccordionTrigger>
						<AccordionContent>
							メールサポートをご利用いただけます。
							{/* プレミアプランでは優先対応・専用サポート窓口を設けております。 */}
						</AccordionContent>
					</AccordionItem>

					{/* Q8 */}
					<AccordionItem value="item-8">
						<AccordionTrigger>
							トレード記録のデータはどこに保存されますか？
						</AccordionTrigger>
						<AccordionContent>
							全てのデータはセキュリティ対策を施したクラウド上に安全に保存されます。
							{/* ご自身のデバイスからもエクスポート可能です。 */}
						</AccordionContent>
					</AccordionItem>

					{/* Q9 */}
					{/* <AccordionItem value="item-9">
						<AccordionTrigger>
							トレードのシミュレーション機能はありますか？
						</AccordionTrigger>
						<AccordionContent>
							現在ベータ版としてバックテスト機能を提供中です。
							過去の株価データを用いて、戦略の有効性を検証できます。
						</AccordionContent>
					</AccordionItem> */}

					{/* Q10 */}
					<AccordionItem value="item-10">
						<AccordionTrigger>
							退会したい場合はどうすればよいですか？
						</AccordionTrigger>
						<AccordionContent>
							アカウント設定ページの「アカウントを削除する」ボタンからいつでも削除が可能です。
							退会後、一定期間経過後にデータは完全に削除されます。
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</Card>

			<div className="text-center text-sm text-muted-foreground mt-12">
				他にご不明な点がありましたら、{" "}
				<a href="/contact" className="underline">
					お問い合わせページ
				</a>{" "}
				よりご連絡ください。
			</div>
		</div>
	);
}
