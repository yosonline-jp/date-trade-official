# 表示を維持したパフォーマンス改善

2026-10-04に、株価の更新確認とチャートの重複処理を修正しました。CSS・色・サイズ・ページの構成は変更していません。

## 修正内容

- 銘柄一覧・ウォッチリストの更新確認を、最大100銘柄ごとの3クエリにまとめました。更新済み24銘柄では72クエリから3クエリになります。古いデータ・欠けた行は従来の個別更新処理へ渡し、同時取得数4と取得失敗の報告を維持します。バッチ取得に失敗した場合も個別確認へ戻ります。
- 公開・ダッシュボードの銘柄詳細では、基本情報・認証を更新処理と並列に取得します。株価とチャートは更新完了後に並列で読み込み、表示に必要な列だけを取得します。
- レイアウト・銘柄詳細・ウォッチリストの認証確認を、同じServer Componentリクエスト内で共有します。[Reactの`cache`](https://react.dev/reference/react/cache)を利用し、リクエストを越えてユーザー情報を保持しません。
- ローソク足のMA25計算をデータ変更時に、座標・固定SVG要素の作成をデータまたは期間の変更時に限定しました。ポインター移動では凡例とカーソルだけが更新されます。MA25の計算式と加算順序は維持しています。
- ウォッチリストのミニチャートへ送るデータを、表示対象の直近30営業日に限定しました。250本の検証データではJSONサイズが従来の13%未満です。詳細チャートは全期間を引き続き表示できます。
- 非表示のマーケットニュースへの問い合わせを省きました。価格チャートの並べ替えと日付フォーマッターも再利用しています。
- Lintから開発用生成ディレクトリ`.next-dev`を除外し、生成コードの走査を省きました。

## 確認結果

PC（1440×1100）とiPhone 13相当のChromiumで、ホーム・銘柄一覧・285A銘柄詳細・7203チャートの計8画像が修正前後で完全一致しました。ローソク足の30本・90本・180本・全期間のSVGも一致しています。

同じ開発サーバー上で40回のポインター移動と退出を行い、25本の移動平均窓を再集計する回数を計測しました。285A詳細と7203チャートの両方で、PC・モバイルともに17,958回から0回になりました。これは処理回数の比較で、ページ表示時間が同じ比率で短縮するという意味ではありません。

回帰テストでは、更新済みデータのクエリ数、古いデータの更新、取得失敗、重複行、同じ銘柄の同時更新、更新と読み取りの順序、ミニチャートの同一表示を検証しています。既存の終値予測・検索・期間切替・モバイルナビゲーションも確認しています。

```sh
docker compose exec app yarn typecheck
docker compose exec app yarn lint
docker compose exec app yarn build
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e yarn test:e2e tests/market-refresh.spec.ts tests/stock-detail-data.spec.ts tests/watchlist-series.spec.ts tests/home.spec.ts tests/stock-close-analysis.spec.ts tests/close-forecast.spec.ts
```

画面・SVG・再計算回数を保存する場合：

```sh
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e node scripts/check-performance-visuals.mjs test-results/performance
```

検証画像と詳細レポートは指定した出力ディレクトリへ保存します。画像を比較する場合は同日の同じ保存済み株価で実行してください。Playwrightのテスト実行時には`test-results`がクリアされるため、必要な結果は先に別の場所へ退避します。
