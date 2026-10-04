# マルチタイムフレーム・デイトレード分析

## 調査した既存構成

Next.js 15.5.26のApp Router、React 19.3.0、TypeScript strict、Yarn 1.22.22を維持しています。画面は`src/app/(client)`と認証必須の`src/app/(dashboard)`に分かれ、共通WorkspaceShell、Tailwind 3、shadcn/Radix、CSSのterminal系スタイルを使います。グラフは既存のRecharts 3です。

株価は`src/lib/market/provider.ts`のYahoo Financeチャートエンドポイントから取得しています。Supabaseの`stocks`が検索対象、`stock_charts`・`daily_prices`が既存の日足表示用です。SSR認証は`@supabase/ssr`、ダッシュボードの認証判定はmiddlewareとlayoutです。取引ジャーナル等の既存DBマイグレーションも確認しました。

既存の終値予測にはPython由来のEMA・RSI・ATR実装がありますが、その互換性を保つため変更しません。新機能は明示的なウォームアップを持つ独立した指標系列を使用します。追加の依存パッケージ・環境変数・DBマイグレーションはありません。既存の認証とRLSを維持し、分析データをDBへ書き込みません。

## 利用方法・API

`/stock-analysis`でコードまたは銘柄名を検索し、候補を選んで「分析する」を押します。共通ナビゲーションの「デイトレード分析」と、公開・ダッシュボードの銘柄詳細から移動できます。`/stock-analysis?code=285A`で選択銘柄を引き継げます。ページを開いただけでは分析を実行しません。

- `GET /api/stocks/search?q=7203`：既存銘柄マスタから最大12件を返します。既存の`GET /api/stocks`は変更していません。
- `POST /api/stock-analysis`：`{"symbol":"7203"}`を受け取り、`AnalysisResult`型の結果を返します。英数字の日本株コードに対応します。
- 不正入力400、銘柄なし404、上場廃止・データ不足422、リクエスト制限429、配信元エラー503、タイムアウト504を区別します。

分析画面には価格・時刻、LONG/SHORT/WAIT、スコア、信頼度、推定エントリー帯、TP1～3、損切り、RR比、RCI到達価格帯・到達率、各時間足の指標、理由、統計の母数と期間を表示します。チャートは開いた時だけコードを読み込み、時間足を切り替えて株価・EMA20/50・VWAP・RCI・KDJ・RSIを確認できます。RCI価格帯も可視化します。

## 実データ取得

`StockDataProvider`を抽象化し、本番は`YahooStockDataProvider`を使用します。同じ既存配信元から1分・5分・15分足を取得します。1分足は直近29暦日を7日以下のリクエストへ分割し、5分・15分足は同じ期間を一括取得します。保存可能な期間の制約は[yfinanceの取得実装](https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/history.py)も確認しました。古い期間が配信元の保存制約で拒否された場合は警告を付け、実際に取得できた本数・取引日数を表示します。

各時間足は最低120本必要です。時刻の重複、非数・無効なOHLC・負の出来高、未確定の足を除外します。昼休みや時間外の値、配信元が返す15:30の単独の瞬間値を通常の1分足として扱いません。画面の価格は最新の確定1分足の終値で、リアルタイムの板価格ではありません。休場・時間外は参考分析としてWAIT、取引時間中に20分以上古い場合もWAITです。[JPXの立会時間](https://www.jpx.co.jp/equities/trading/domestic/01.html)に合わせています。祝日や売買停止をカレンダーで確定判定する機能はなく、日時と最終足から古いデータとして扱います。

同じ銘柄・時間足の履歴と分析結果は最大60秒間、サーバープロセス内で共有します。同時リクエストも同じPromiseを待ちます。エラーはキャッシュに残しません。履歴の保持数は最大12銘柄相当、分析処理は同時3件に制限しています。複数のホスティングインスタンス間でキャッシュや制限は共有されません。

## 指標と判定

- RCI(7)：同値に平均順位を付けたSpearman相関×100。一定価格は中立の0です。[RCIの定義](https://www.tradingview.com/support/solutions/43000765570-rank-correlation-index-rci/)を参照しました。現在・1本前・2本前、傾き、±80突破・反転を評価します。
- KDJ：9本の高安からRSVを計算し、K/Dを1/3の平滑化、J=3K−2Dとします。K/Dの初期値は50です。
- RSI(14)・ATR(14)・ADX(14)：初期期間の平均を種とするWilder平滑化です。EMA20/50/100は各期間のSMAから始めます。既存終値予測の計算方法は保持しています。
- VWAP：日本時間の取引日ごとにリセットする典型価格×出来高の加重平均です。出来高比は現在の出来高を直前20本の平均と比較します。

15分Environment最大30点、5分Setup最大30点、1分Trigger最大40点をLONG/SHORTそれぞれ採点します。重み、閾値、ATR倍率、類似条件などは`config.ts`へまとめました。ADXは方向ではなく強度の確認に使います。80点以上STRONG、65点以上通常、50点以上WEAK、49点以下WAITです。15分足と逆方向なら点数にかかわらずWAITとし、リバウンド/反落候補を区別します。TP2のRRが1未満、または統計の母数不足でもWAITになります。

## 類似局面と価格推定

同一銘柄の過去の1分足局面を、RCI・RCI傾き・RSI・KDJ・EMA20/50の位置・EMA傾き・VWAP乖離・ATR/価格比・価格/ATR位置・出来高比・15/5/1分のトレンドで比較します。15分環境が同じものから、正規化した重み付き距離が閾値以下の近い局面を最大40件採用します。採用局面は20本以上離し、結果の観測窓の重複を抑えます。

1/3/5/10/20分後の価格変化率を集計し、平均・中央値・25%点・75%点を表示します。類似局面が8件未満ならエントリー、利確、損切りの予想を表示しません。

エントリー帯は3分後リターンの中央値・四分位、RCI±80を3分以内に突破した過去の価格変化（3例以上ある場合）、現在価格・VWAP・EMA20・直近サポート/レジスタンスを組み合わせます。ATRから大きく離れた構造価格は候補から除きます。RCIから価格を一意に逆算しません。

TP1/2/3は0.5/1.0/1.5 ATR、過去の最大有利変動の分位、直近高安値・前日高安値・VWAP・EMAを組み合わせ、方向に沿って順番になるようにします。損切りは1 ATRと直近高安値の外側を考慮し、RRはエントリーと損切りの距離から計算します。

TP到達率は、最初の3本以内に推定エントリー価格へ触れ、シグナル後20本までにTPへ到達する過去局面の割合です。エントリーなし・損切り先行は未到達、同じ足の損切りとTPは損切りを優先します。足の途中で入った場合は、同じ足で先にTPへ触れていた可能性があるため、その足のTPを成功に数えません。約定順序を取得できないOHLCでの保守的な集計です。

RCI投影では方向に沿った各水準の最初の到達時点を探し、その終値変化の中央値・四分位と到達割合を返します。現在値ですでに通過した水準は「通過済み」です。母数が8件未満なら率を出さず、到達例が3件未満なら価格帯を出しません。確率は将来に校正した値ではなく、同じ過去標本による記述統計です。データ信頼度もサンプル数・距離の充足度であり、勝率ではありません。

## 未来データ対策・バックテスト構造

純粋関数`analyzeMarket(stock, history, asOf)`は`asOf`までに閉じた足だけを使用します。1分の決定時刻へ5分・15分を同期し、未完成の上位足を参照しません。過去候補の特徴はその候補時刻まで、結果ラベルは分析時刻までに完全に観測した20本だけを使います。翌日・昼休み・欠損をまたぐ結果窓は除外します。

同じエンジンを任意の過去時点で呼べます。`backtestMetrics`は観測した損益列から勝敗、勝率、平均利益/損失、Profit Factor、Expectancy、最大ドローダウン、最大連敗を集計します。実取引履歴による長期の戦略検証やバックテスト画面は今回追加していません。取引費用・スリッページ・板情報も分析率には含めていません。

## ファイル

新規：

- `src/lib/analysis/types.ts`・`config.ts`：共通型・変更可能な設定
- `indicators.ts`・`signal.ts`：指標と時間足別採点
- `similarity.ts`・`prediction.ts`・`engine.ts`：同期・類似局面・価格帯・統合分析
- `provider.ts`・`service.ts`：実データ取得とキャッシュ
- `backtest.ts`：バックテスト集計
- `src/app/(client)/stock-analysis/page.tsx`：分析ページ
- `src/app/(client)/api/stock-analysis/route.ts`・`api/stocks/search/route.ts`：API
- `src/components/analysis/stock-analysis-workspace.tsx`・`analysis-charts.tsx`・`stock-analysis.module.css`：UI
- `tests/analysis-engine.spec.ts`・`analysis-provider.spec.ts`・`stock-analysis-ui.spec.ts`・`fixtures/intraday.ts`：単体・ブラウザーテスト。合成データはテスト専用です。
- `scripts/check-stock-analysis.mjs`：モックを使わず実データで画面・APIを確認
- このドキュメント

変更：共通`WorkspaceShell`のナビゲーション、公開・ダッシュボードの`stocks/[code]/page.tsx`のリンク、README。依存パッケージ追加なし。

## 検証

```sh
docker compose exec app yarn typecheck
docker compose exec app yarn lint
docker compose exec app yarn build
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e yarn test:e2e tests/analysis-engine.spec.ts tests/analysis-provider.spec.ts tests/stock-analysis-ui.spec.ts tests/home.spec.ts tests/stock-close-analysis.spec.ts tests/close-forecast.spec.ts
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e node scripts/check-stock-analysis.mjs
```

指標の既知値、LONG/SHORT/WAIT、逆環境、価格帯・RR・投影、同じ足の損切り優先、データ不足、キャッシュ、レート制限、タイムアウト、休場、検索・再試行・チャート・画面幅を検証します。未来の足を10倍の価格へ変更しても、また未来の足を削除しても過去時点の結果が同一になることを確認しています。既存終値予測、株検索、チャート、Bot非表示、認証リダイレクトも回帰確認します。

最終検証はテスト93件成功・1件スキップ（PCでは対象外のモバイルナビゲーション）です。型チェック・本番ビルドも成功しました。Lintはエラー0件、新規分析コードの警告0件で、既存コードの警告55件が残っています。

実データでは7203の1分足5,460本・5分足1,092本・15分足374本、285Aの1分足5,433本・5分足1,091本・15分足374本を取得しました。それぞれ40件の類似局面を採用し、APIが200で応答しました。7203の結果・チャートをPCとスマートフォンで確認し、ブラウザーエラーとページの横幅超過はありませんでした。確認時は取引時間外のためWAITです。最新の記録と画面は`test-results/live-stock-analysis/`へ保存します。
