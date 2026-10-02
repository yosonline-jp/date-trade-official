# 検証記録

2026-10-01までのローカル検証。

- `yarn typecheck`：成功（Next.js型生成を含む）
- `yarn lint`：エラー0。既存Plateアダプター等の警告56件は残存
- `yarn build`：成功
- 本番Dockerのstandaloneビルド：成功。ポート3003で起動確認済み
- Playwright：11件成功、PCでのモバイル専用ケース1件をスキップ
- 本番DockerのHTTP検証：主要画面・株価APIは200、未ログインCMSは307、廃止済みメールAPIは410
- PC 1440px / スマートフォン390px：横スクロールなし、スクリーンショット確認済み
- 主要指数、株価チャート、銘柄検索、Bot空状態、不正日付表示、CMS未認証リダイレクトを確認
- 既存 `.env` のSupabase接続：stocks、stock_charts、useful_data、news、technical_analysis、bot_performance_snapshots、bot_tradesを読み取り確認
- 確認時点でnews、bot_performance_snapshots、bot_tradesは0件。架空データは追加していない

## 未実施

- 既存管理者アカウントでのCMS保存・画像アップロード・削除の実データテスト
- 取引記録や口座情報への書き込みテスト
- AWSアカウントへの接続・Amplify本番デプロイ

既存DBの内容、ユーザー権限、RLS、Storageポリシーの変更は実行していません。

## 残る運用対応

未使用の旧メール送信APIにあったハードコード済みResendキーをソースから削除しました。履歴からの漏えいを防ぐため、Resend管理画面で失効・再発行してください。旧GETメール送信APIは410を返し、メールを送信しません。

