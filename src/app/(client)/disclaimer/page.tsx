import React from "react";

export const metadata = {
	title: "免責事項 - デイトレード.net",
	description:
		"デイトレード.netの免責事項ページです。提供する情報の正確性やサービス利用に関する注意事項を記載しています。",
};

export default function DisclaimerPage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			<h1 className="text-3xl font-bold mb-6 text-center">免責事項</h1>

			<p className="mb-6 text-muted-foreground">
				デイトレード.net（以下、「当サイト」といいます。）に掲載される情報の正確性については万全を期しておりますが、その内容を保証するものではありません。
				当サイトの利用により生じたいかなる損害についても、当サイトは一切の責任を負いかねます。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">1. 投資判断について</h2>
			<p className="mb-4">
				当サイトに掲載されている情報は、投資助言や推奨を目的とするものではありません。
				株式・金融商品の売買判断は、利用者ご自身の責任において行ってください。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">2. 情報の変更・削除</h2>
			<p className="mb-4">
				当サイトの内容は、予告なく変更または削除される場合があります。
				これにより発生した損害について、当サイトは一切の責任を負いません。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">3. 外部リンク</h2>
			<p className="mb-4">
				当サイトからリンクされた外部サイトの内容や安全性については責任を負いません。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">4. サービスの中断</h2>
			<p className="mb-4">
				システムメンテナンス、通信障害、災害その他の事由により、一時的にサービスを中断することがあります。
			</p>

			<p className="text-sm text-muted-foreground mt-8">
				施行日：2025年10月1日
				<br />
				デイトレード.net 運営事務局
			</p>
		</div>
	);
}
