# AWS Amplify Hosting

## 構成

- Next.js 15.5.26 / React 19.3 / Node.js 22
- SSR対応のAmplify Hosting compute
- リポジトリルートの `amplify.yml`
- 成果物 `.next`
- 認証・DB・Storageは既存Supabase

AWS公式のNext.js対応ページではバージョン15までをサポートしています。
https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html

## 初回接続

1. Amplify Hostingでリポジトリ・ブランチを接続します。
2. ビルド設定はルートの `amplify.yml` を使います。
3. Node.jsのメジャーバージョンを22に設定します。
4. 環境変数に次の値を設定します（既存 `.env` と同じSupabaseを使用）。

| 名前 | 用途 |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 公開anon key |
| NEXT_PUBLIC_MAIN_URL | https:// を含む公開サイトURL |
| SUPABASE_ROLE_KEY | 既存Bot実績のサーバー側読み取り・アカウント削除 |
| NEXT_PUBLIC_SUPABASE_BUCKET | 既存アップロード処理を使う場合 |
| NEXT_PUBLIC_GA_ID | 任意のGoogle Analytics ID |

その他の既存機能で使うAPIキーは `scripts/amplify-env.mjs` の許可リストと利用箇所を確認して追加してください。AWSアクセスキーを環境変数から一括コピーする設定にはしていません。

5. Supabase AuthのSite URLを公開URLに設定し、Redirect URLsに `https://公開ドメイン/auth/callback` を登録します。ローカル開発には `http://localhost:3002/auth/callback` も登録します。
6. デプロイ後、トップ・株価チャート・ログイン・管理者CMSを確認します。

## SSR環境変数

Amplifyのビルド環境変数をSSRから利用できるよう、`scripts/amplify-env.mjs` が許可した変数のみ `.env.production` に書き込みます。値はログに出力しません。このファイルはGitとDockerビルドコンテキストから除外しています。秘密変数を `NEXT_PUBLIC_` に変更しないでください。

## DBとCMS

既存スキーマを使うためSQLマイグレーションは不要です。CMSは `users.role = 'admin'` を検証します。Supabase RLSとStorageポリシーは既存設定を引き継ぎます。管理者認証を使った保存の確認は、本番公開前に既存管理者アカウントで実施してください。

## この作業の範囲

Amplifyの設定ファイルとローカルビルドを用意しています。AWSアカウントへの接続、リポジトリ登録、ドメイン変更、本番デプロイはまだ行っていません。
