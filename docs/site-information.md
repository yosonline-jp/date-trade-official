# サイト案内・お問い合わせ

2026-10-02 更新。

## ページ

- About：既存ワークスペースの濃紺・ミントに合わせ、調べる・記録する・振り返るの3機能と各画面への導線を整理。実装済みの機能に合わせて説明を修正。
- Contact：サポート案内とフォームを分け、入力エラー、送信中、失敗、完了の表示を追加。最大5,000文字、文字数表示、確認メールアドレス、プライバシーポリシーへの同意、秘密情報を入力しない案内を設置。
- Privacy policy：取得情報と利用目的、プロフィール・公開取引の閲覧範囲、Supabase・OpenAI・設定時のGoogle Analytics、Cookie、情報管理、開示・訂正・削除の窓口を整理。新規取引の初期値が非公開でも、既存の公開記録は変更されないことを明記。
- Disclaimer：投資判断、データ更新時点、AI・集計結果、公開投稿、外部リンク、サービス中断、責任の範囲を整理。一律にすべての責任を免除する文言を改め、適用法令に従う表現に変更。
- 4ページ共通のナビゲーション、メタデータ、ポリシーの要約・目次・更新日を追加。PC・スマートフォン対応。

## お問い合わせの保存と権限

フォームからServer Actionに送信し、クライアントとサーバーの両方で同じZodスキーマを検証します。Server Actionは通常のSupabaseクライアントで、名前・メール・件名・内容のみをINSERTします。秘密鍵やservice_roleはフォームの保存には使いません。保存結果をSELECTする処理もありません。

インストール済みのフォーム用resolverがZod 4のエラー形式に対応していないため、このフォーム用の小さな型付きresolverを使用しています。依存ライブラリーの一括更新はしていません。

送信中の入力・再送信を防ぎ、失敗時は入力内容を保持します。空欄のhoneypotも検証します。運営への通知メール・自動返信メールは追加していません。送信完了はDBへの保存完了を意味します。

既存DBにあった一般閲覧者向けの全件SELECTポリシーと広い権限を、INSERTのみに変更しました。匿名・ログイン利用者による閲覧・更新・削除を禁止し、運営側のservice_roleによる閲覧を維持します。INSERTの文字数制限もDB側で検証します。

適用SQL：`supabase/migrations/202610020003_contact_privacy.sql`。2026-10-02に既存Supabaseへ適用済みです。問い合わせレコードの内容は読み取らず、削除・更新も実行していません。

再適用・権限確認には既存のSUPABASE_ACCESS_TOKENを使用できます。キーの値はログに出力しません。

```powershell
docker compose exec -T app node scripts/apply-contact-privacy.mjs
docker compose exec -T app node scripts/check-contact-privacy.mjs
```

## 検証

- 型チェック、変更箇所のESLint、本番ビルド：成功。全体ビルドには既存Plate部品等の警告が残っています。
- `scripts/test-contact.mjs`：実装したスキーマ・resolver・Server Actionを使ったモック検証に成功。無効入力の保存防止、余分な項目を保存しないこと、保存エラー・通信例外を確認。
- `tests/information-pages.spec.ts`：PC・スマートフォンの計6件が成功。4ページの見出し・ナビゲーション・目次・横スクロールなし、未入力・メール不一致、送信失敗時の内容保持、送信中の操作防止、完了後の新規フォームを確認。
- `tests/fixtures/contact-schema.sql`と`contact-privacy.sql`：独立したPostgreSQLで旧公開設定から移行し、既存データ保持、匿名・ログイン利用者のINSERT、SELECT・UPDATE・DELETE拒否、不正な文字数拒否、運営のSELECT権限を確認。
- 適用後の既存SupabaseのRLSとテーブル権限を読み取り確認。
- スクリーンショットは`test-results/information-*.png`。
- 実際の問い合わせ送信・メール送信・本番アプリのデプロイは実行していません。

```powershell
docker compose exec -T app node scripts/test-contact.mjs
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e yarn playwright test tests/information-pages.spec.ts
docker compose exec -T app yarn typecheck
docker compose exec -T app yarn build
```

## 文面の参照資料

- 個人情報保護委員会：[個人情報の保護に関する法律についてのガイドライン（通則編）](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/)
- 消費者庁：[消費者契約法の逐条解説](https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations)
- Google：[Google Analyticsのデータ収集](https://support.google.com/analytics/answer/11593727?hl=ja)、[Googleのサービスを使用するサイトやアプリから収集した情報の利用](https://policies.google.com/technologies/partner-sites?hl=ja)

事業者の住所、代表者名、具体的な保存期間など、リポジトリーから確認できない情報は推測で追加していません。
