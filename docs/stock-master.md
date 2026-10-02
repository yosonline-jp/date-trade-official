# 日本株マスタと日経225構成銘柄

Adminとしてログインすると、サイドバーに「日本株マスタ」と「日経225 銘柄管理」が表示されます。

## 日本株マスタ

`/dashboard/stock-master` はJPXデータポータルの[企業・銘柄の全件CSV](https://clientportal.jpx.co.jp/ClientPortal/s/Issue?language=ja)と同じ公開一覧を取得します。対象は上場中の「株式」で、ETF・REIT・上場廃止済みの銘柄は公式一覧から除きます。画面でコード・社名・市場・業種を検索・絞り込みでき、Supabaseの`stocks`との差分を確認してから「JPXの最新一覧に更新」を押せます。

更新時は公式の更新日、3,500～4,300件、コードの一意性・形式などを検証します。新規銘柄と名称・市場・33業種が変わった銘柄だけ`stocks`にupsertします。既存の17業種区分は保持します。前回のJPX一覧にあって今回なくなった株式は、市場を「上場廃止」に変更します。株価・チャート・取引履歴やETF等のデータは削除しません。公式一覧を取得できない場合は更新ボタンを無効にします。

更新結果と履歴はサーバー専用のSupabase Storage非公開バケット`daytrade-admin`の`stock-master/`に保存します。画面表示と更新アクションでAdmin権限を確認します。JPXデータポータルの公開画面が使用する取得形式に依存するため、先方の変更時は`src/lib/jpx/source.ts`の調整が必要です。更新ボタンを押すまでSupabaseの銘柄情報は変更されません。

## 日経225構成銘柄

`/dashboard/nikkei225` は[日経公式の構成銘柄一覧](https://indexes.nikkei.co.jp/nkave/index/component?idx=nk225)を管理します。225件・重複なし・公式の更新日とCSVとの一致を検証して、追加・除外の履歴を`nikkei225/`へ保存します。**このページは`stocks`を書き換えません。** 未登録の構成銘柄があれば、日本株マスタで基本情報を更新します。

## 検証

```sh
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e yarn playwright test tests/stock-master.spec.ts tests/nikkei.spec.ts --project=desktop
docker compose stop app
docker compose run --rm --no-deps app yarn typecheck
docker compose run --rm --no-deps app yarn build
docker compose up -d app
```
