import React from "react";

export const metadata = {
	title: "利用規約 - デイトレード.net",
	description:
		"デイトレード.netの利用規約ページです。サービスの利用条件やユーザーの責任について詳しく説明しています。",
};

export default function TermsOfServicePage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			<h1 className="text-3xl font-bold mb-6 text-center">利用規約</h1>

			<p className="mb-6 text-muted-foreground">
				本利用規約（以下、「本規約」といいます。）は、デイトレード.net（以下、「当サイト」といいます。）が提供するサービス（以下、「本サービス」といいます。）の利用条件を定めるものです。
				ご利用の前に本規約をよくお読みいただき、同意のうえでご利用ください。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">第1条（適用）</h2>
			<p className="mb-4">
				本規約は、当サイトの利用に関わる一切の関係に適用されるものとします。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">第2条（利用登録）</h2>
			<p className="mb-4">
				ユーザーは、当サイトの定める方法によって利用登録を行うものとし、登録完了時に本規約へ同意したものとみなします。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">第3条（禁止事項）</h2>
			<ul className="list-disc list-inside mb-4 space-y-1">
				<li>法令または公序良俗に違反する行為</li>
				<li>他のユーザーや第三者に損害を与える行為</li>
				<li>当サイトの運営を妨害する行為</li>
				<li>虚偽の情報を登録する行為</li>
			</ul>

			<h2 className="text-xl font-semibold mt-8 mb-2">
				第4条（サービスの提供停止）
			</h2>
			<p className="mb-4">
				当サイトは、システム保守や障害、その他運営上必要と判断した場合、事前通知なしにサービスを停止することがあります。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">第5条（免責事項）</h2>
			<p className="mb-4">
				当サイトは、提供する情報の正確性・完全性を保証するものではありません。
				投資判断は利用者の責任において行っていただきます。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">第6条（規約の変更）</h2>
			<p className="mb-4">
				当サイトは、必要と判断した場合には、利用者への予告なしに本規約を変更できるものとします。
			</p>

			<p className="text-sm text-muted-foreground mt-8">
				施行日：2025年10月1日
				<br />
				デイトレード.net 運営事務局
			</p>
		</div>
	);
}
