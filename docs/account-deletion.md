# アカウント削除

2026-10-02に実装・検証し、既存SupabaseにDB更新を適用しました。実アカウントの削除テストは行っていません。

## 仕様

1. 確認ダイアログに削除対象と復元不可を表示し、「削除する」の入力が一致した場合に実行できます。
2. Server Actionでも確認文字列を検証し、通常の認証クライアントの `auth.getUser()` で本人を確認します。ブラウザーから削除対象IDを受け取りません。
3. Cookieを共有しないサーバー専用の管理クライアントで、本人所有のStorageオブジェクトを100件ずつ取得し、バケットごとにStorage APIで削除します。旧プロフィール画像の平坦なファイル名、旧owner列、未参照の取引画像にも対応します。他人の所有物は対象にしません。
4. `auth.admin.deleteUser(user.id, false)` でAuthアカウントを完全削除します。プロフィール・フォロー・取引・収支・AI分析・ウォッチリスト・ジャーナル設定・レポート・メモ・コメント・本人のニュース／テクニカル分析投稿は、外部キーの `ON DELETE CASCADE` で同じDBトランザクション内で削除されます。
5. 成功後に現在のブラウザーの認証Cookieを消去し、キャッシュを再検証してトップへ移動します。処理中は再送信・キャンセル・Escapeによる閉鎖を防ぎます。失敗時はエラーを表示して再試行できます。

Storage APIとAuth削除は別サービスのため、全体を1つのトランザクションにはできません。画像削除後にAuth削除が失敗すると、アカウントとDBデータは残り、削除済み画像は戻りません。部分完了を画面に表示し、再実行では残っている画像を削除してからAuth削除を試みます。

Auth削除でセッションと更新トークンが失効します。別端末で発行済みのアクセストークンは有効期限まで署名上有効な場合があります。サーバー側の本人検証と外部キーにより、削除済みアカウントへのアプリデータ保存を防ぎます。

## 権限キー

- 推奨: サーバー限定の `SUPABASE_SECRET_KEY`（`sb_secret_...`）。
- 互換: 既存の `SUPABASE_ROLE_KEY` に設定したservice_roleキー。Secret Key未設定の場合に使用します。既存.envの秘密値は変更していません。
- どちらも `NEXT_PUBLIC_` を付けません。管理クライアントは `server-only` で保護し、セッション永続化・自動更新・URLからのセッション検出を無効にします。
- AmplifyのSSR環境変数許可リストは両方に対応します。Secret KeyはSupabase管理画面で作成し、サーバー環境変数へ設定してから切り替えてください。

公式資料:

- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/storage/schema/design

## DB更新

新しい環境では `supabase/migrations/202610020002_account_deletion.sql` を適用してください。収支・AI分析・取引のAuth外部キーを連動削除にし、所有画像一覧のRPCを追加します。RPCはservice_roleのみ実行可能です。StorageメタデータをSQLで削除する処理はありません。

参照先のないuser_idが既存データにある場合、外部キー追加が失敗して全体をロールバックします。既存データを自動で消す処理はありません。

```powershell
docker compose exec -T app node scripts/apply-account-deletion.mjs
docker compose exec -T app node scripts/check-account-deletion.mjs
```

上記スクリプトには `SUPABASE_ACCESS_TOKEN` が必要です。Secret Key／service_roleではDDLを実行できません。秘密値をログに表示しません。

## 検証

```powershell
docker compose exec -T app yarn typecheck
docker compose exec -T app node scripts/test-account-deletion.mjs
```

実際のServer Actionをモックで実行し、確認文字列・本人限定・未認証・失敗時のログイン保持・成功時のログアウト順序、複数バケット・205件のページ分割・部分失敗・再試行を検証します。

SQLテストは独立したPostgreSQLで `tests/fixtures/account-deletion-schema.sql`、マイグレーション、`tests/fixtures/account-deletion.sql` の順に実行します。連動削除・他人のデータ保持・Storage所有者・一般ユーザー／未認証からのRPC拒否を検証します。テストスキーマを本番Supabaseで実行しないでください。

画面検証は一時的な開発専用ページを使用し、削除APIに接続しません。検証後にページを除去してください。

```powershell
docker compose exec -T app node scripts/prepare-account-deletion-ui.mjs
docker compose -f docker-compose.yml -f compose.test.yml run --rm -e ACCOUNT_UI_CHECK=1 e2e yarn playwright test tests/account-deletion.spec.ts
docker compose exec -T app node scripts/prepare-account-deletion-ui.mjs remove
```
