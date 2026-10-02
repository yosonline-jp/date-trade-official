import React from "react";

export const metadata = {
	title: "プライバシーポリシー - デイトレード.net",
	description:
		"デイトレード.netのプライバシーポリシーページです。ユーザーの個人情報の取り扱いについて詳しく説明しています。",
};

export default function PrivacyPolicyPage() {
	return (
		<div className="max-w-4xl mx-auto py-12">
			<h1 className="text-3xl font-bold mb-6 text-center">
				プライバシーポリシー
			</h1>

			<p className="mb-6 text-muted-foreground">
				デイトレード.net（以下、「当サイト」といいます。）は、ユーザーの個人情報の保護を最優先事項とし、以下の方針に基づき個人情報の適切な管理を行います。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">
				1. 個人情報の取得について
			</h2>
			<p className="mb-4">
				当サイトは、ユーザー登録やお問い合わせの際に、氏名、メールアドレスなど必要な範囲の個人情報を取得します。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">2. 利用目的</h2>
			<ul className="list-disc list-inside mb-4 space-y-1">
				<li>ユーザーへのサービス提供およびサポート</li>
				<li>お知らせやメンテナンス情報のご連絡</li>
				<li>サービス品質向上のための統計的分析</li>
			</ul>

			<h2 className="text-xl font-semibold mt-8 mb-2">
				3. 個人情報の第三者提供
			</h2>
			<p className="mb-4">
				法令に基づく場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">4. 安全管理措置</h2>
			<p className="mb-4">
				当サイトは、個人情報への不正アクセス・漏洩・改ざんを防止するため、SSL通信やアクセス制限などの安全対策を講じています。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">
				5. Cookie（クッキー）の使用
			</h2>
			<p className="mb-4">
				当サイトでは、利便性向上やアクセス解析のためCookieを使用します。ブラウザの設定により無効化することも可能です。
			</p>

			<h2 className="text-xl font-semibold mt-8 mb-2">6. お問い合わせ窓口</h2>
			<p className="mb-4">
				個人情報に関するお問い合わせは、当サイトのお問い合わせフォームよりお願いいたします。
			</p>

			<p className="text-sm text-muted-foreground mt-8">
				施行日：2025年10月1日
				<br />
				デイトレード.net 運営事務局
			</p>
		</div>
	);
}
