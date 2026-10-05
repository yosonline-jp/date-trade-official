# DAYTRADE Workspace

日本株のマーケット情報、株価チャート、取引記録、記事CMSをまとめたNext.jsアプリです。既存Supabaseのテーブルと認証を利用します。

## 開発

```sh
docker compose up --build -d
```

http://localhost:3002 を開いてください。gilgamestudioと同時に起動できるよう、ホスト側のポートを3002にしています。変更する場合は `.env` に `APP_PORT=3004` を追加します。

```sh
docker compose logs -f app
docker compose stop
```

`.env` は既存ファイルをそのまま使います。新規環境では `.env.example` をコピーして設定してください。Supabaseを初期化する処理や既存データを変更するマイグレーションはありません。

Node.js 22 / Yarn 1.22.22をローカルで使用する場合：

```sh
corepack enable
yarn install --frozen-lockfile
yarn dev
```

ローカル実行の既定ポートは3000です。認証を使う場合は `NEXT_PUBLIC_MAIN_URL` とSupabase Authの許可リダイレクトURLを実際のURLに合わせてください。


### Windowsでのコマンド実行

このプロジェクトのDocker構成では、Node.jsと依存パッケージはコンテナ内にあります。Windows側の `node_modules` が空でも正常です。Docker Desktopを起動し、`app` コンテナを起動したうえで、次のコマンドを使えます。Windows側にNode.jsやYarnをインストールする必要はありません。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\yarn-docker.ps1 typecheck
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\yarn-docker.ps1 lint
```

このスクリプトはDockerがPATHにない場合もDocker Desktopの標準インストール先を確認します。終了コードは検証コマンドからそのまま返します。

## 構成

- `src/app/(client)`：公開マーケット、銘柄、チャート、記事
- `src/app/(dashboard)`：認証必須の取引管理・CMS
- `src/app/(auth-pages)`：ログイン・登録・パスワード管理
- `src/app/actions`：認証付きサーバーアクション
- `src/components/workspace`：共通ナビゲーションと価格チャート
- `src/components/cms`：記事編集・プレビュー・削除確認
- `src/components/content`：公開記事一覧
- `src/lib/market`：マーケットの読み取り処理
- `src/lib/auth`：CMS管理者検証
- `src/utils/supabase`：SSR・ブラウザー・権限付きクライアント
- `scripts`：接続検証・Amplify環境変数の準備
- `tests`：PC / モバイルのブラウザーテスト

既存の記事本文はPlate形式のため、その編集・表示アダプターを保持しています。DBの本文形式を自動変換しません。取引記録、ウォッチリスト、プロフィールなどの既存機能は共通の新ワークスペース内で利用できます。

## CMS

`/dashboard/cms` からニュース・テクニカル分析を検索、新規作成、編集します。タイトル・概要・本文・プレビュー、テクニカル記事のサムネイル、削除確認に対応します。**保存は即時公開**です。現在のDB形式に合わせており、下書き・予約公開・履歴復元は実装していません。

認証したユーザーの `users.role = 'admin'` が必要です。画面だけでなく保存・削除のサーバーアクションでも検証します。ブラウザーからのSupabase接続には既存のRLSが適用されます。管理者の追加やRLSの変更はこの更新では行っていません。

ニュース・テクニカル分析はそれぞれ `news` / `technical_analysis` の `header` と `content` を利用します。画像は既存の `thumbnails` バケットに保存します。

## データ表示

- 株式：`stocks`
- 指数：`useful_data` の `id=1`
- 株価・ローソク足：`stock_charts` の `timestamp` / `indicators.quote`
- 取引記録：`trade_records`

株価は保存済みデータです。ライブ配信や新たな自動取得ジョブは含みません。データが空の場合は空状態、取得失敗の場合はエラー状態を表示します。架空の株価に置き換える処理は新画面にありません。

Botモニターは準備中のため、サイト全体から一時的に非表示にしています。`/bot-trades` への直接アクセスも404ページを表示し、Botデータは取得しません。実装は保持しており、再公開時は `src/lib/features.ts` の `SHOW_BOT_MONITOR` を `true` に変更してください。

## 検証

銘柄詳細ページでは「終値を分析」から、StockAnalysisの始値基準の終値予測を実行できます。[計算方法と検証](docs/close-analysis.md)を参照してください。

表示デザインを保ったデータ取得・チャート処理の改善と検証結果は[パフォーマンス改善](docs/performance.md)にまとめています。

`/stock-analysis`では、日本株の検索・選択後に1分・5分・15分足のデイトレード分析を実行できます。価格帯、利確・損切り、RCI到達率、時間足別指標とチャートを表示します。[データ取得・分析方法・制約](docs/stock-analysis.md)を参照してください。

銘柄詳細の「デイトレード指標」では、RSI・RCI・MACD・移動平均・ボリンジャーバンド・ADX/DMI・ATR・MFIなどを確認できます。日足は保存済みデータから表示し、1分・5分・15分足へ切り替えると分足を取得します。[指標一覧・計算と検証](docs/stock-technicals.md)を参照してください。

```sh
docker compose exec app yarn typecheck
docker compose exec app yarn lint
docker compose exec app node scripts/check-supabase.mjs
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e
```

Supabaseチェックは読み取りのみで、認証キーやレコード本文を出力しません。E2Eは既存の7203銘柄とそのチャートデータを利用します。CMSの未認証リダイレクトも検証します。管理者としての実データ保存・削除を自動テストで実行しません。

開発サーバーは `.next-dev`、本番ビルドは `.next` を使用します。キャッシュを分離しているため、開発サーバーを止めずにビルドを検証できます：

```sh
docker compose exec app yarn build
```

Plateの既存アダプターには型・HOCのLint警告が残ります。新しいアプリケーションコードには通常のLintルールを適用しています。

## 本番Docker

```sh
docker compose -f compose.production.yml up --build -d
```

http://localhost:3003 でstandaloneビルドを実行します。ビルド時には公開Supabase設定を渡し、秘密キーは実行時にのみ渡します。コンテナは非rootユーザーです。

## AWS Amplify

手順は [docs/amplify.md](docs/amplify.md) を参照してください。Amplify Hostingの公式対応範囲に合わせてNext.js 15.5.26を採用しています。gilgamestudioのNext.js 16はそのまま転用していません。

## 日本株マスタ・日経225構成銘柄

管理者は「日本株マスタ」でJPXの上場株式を確認し、銘柄の基本情報を差分更新できます。「日経225 銘柄管理」は指数の構成銘柄と入替履歴だけを管理します。詳しくは[銘柄管理の仕様](docs/stock-master.md)を参照してください。

## 取引ジャーナルの追加機能

取引と収支カレンダーの連携、成績分析、CSV取り込み、振り返りノート、公開範囲、週次・月次レポート、ウォッチリストのメモ・分類を追加しています。利用前にDB更新が必要です。[セットアップと利用方法](docs/journal.md)を参照してください。
