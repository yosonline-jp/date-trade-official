# 銘柄詳細の終値分析

`/stocks/[code]` と `/dashboard/stocks/[code]` の「終値を分析」で、最新の日足を取得し、対象取引日の始値を基準に予想終値を表示します。数字を含む英字コード（例：285A）にも対応します。分析はボタンを押したときだけ実行し、結果をDBに保存する処理はありません。

## 元のロジック

StockAnalysis の `app.py` にある `analyze_nikkei225_component`、`ema`、`rsi`、`macd`、`atr`、`_estimate_predicted_price` の「日経平均」設定をTypeScriptへ移植しています。デイトレの15分足分析とは別の処理です。

- 日足1か月を取得し、有効データが18本未満なら日足3か月を取り直します。
- `yfinance.download(auto_adjust=True)` と同様、調整後終値／終値の比で始値・高値・安値を調整します。
- EMA5／EMA20の並びで ±2点、RSI14が56以上／44以下で ±1点、MACDとシグナルの関係で ±1点を加算します。
- EMAとRSIはpandasの `ewm(adjust=False)`、ATR14は単純移動平均と同じ計算です。
- 予想変動率は `max(0.012, min(0.08, abs(score) * 0.005) + min(0.05, ATR / 分析時点の価格 * 0.5))`。スコアの符号に合わせて始値へ適用し、0点なら始値と同額です。

元の処理は当日の高値・安値・終値（取引中は途中値）も使います。取引終了後に実行すると、その日の実績データを含む再計算になります。寄り前・休場日に当日の日足がない場合は、直近取引日を対象とします。結果には必ず対象日・取得期間・分析日時を表示します。始値が欠けた場合は、元の処理と同じくその日足の終値を基準価格にします。

## 実装と検証

- 計算：`src/lib/market/close-forecast.ts`
- 最新データ取得：`src/lib/market/close-analysis.ts`、`src/lib/market/provider.ts`
- 公開API：`POST /api/stocks/[code]/close-analysis`（公開銘柄の読み取りと分析のみ）
- 表示：`src/components/stock-close-analysis.tsx`

`tests/fixtures/close-forecast.json` は元のPython関数を変更せず、固定入力を渡して作った比較データです。上昇・下降・横ばい・反転・調整後価格・欠損・3か月への切り替えを含みます。再生成にはStockAnalysisのpandas／yfinanceが入ったPythonを使います。

```powershell
& "<StockAnalysisのPython>" -B scripts/generate-close-forecast-fixtures.py --source "<StockAnalysisのapp.py>" --output tests/fixtures/close-forecast.json
```

```sh
docker compose exec app yarn typecheck
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e yarn test:e2e tests/close-forecast.spec.ts tests/stock-close-analysis.spec.ts
```
