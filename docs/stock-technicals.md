# 株詳細ページのデイトレード指標

公開の `/stocks/285A` とログイン後の `/dashboard/stocks/285A` に、共通の「デイトレード指標」パネルを追加しています。株価・終値予測・既存の日足ローソク足・出来高・コメントの表示を維持し、同じデザインの中で指標を確認できます。

## 使い方とデータ取得

初期表示は「日足」です。詳細ページが取得済みの保存済みOHLC・出来高から計算するため、このパネルのための追加API通信は発生しません。出来高は時刻で照合し、欠損している日も有効なOHLCの価格系列を保持します。取引時間中の保存済み日足には途中値を含む場合があります。

「1分足」「5分足」「15分足」を選ぶと、選択した時間足の実データをサーバーから取得します。計算に必要な本数がそろうまで待つ必要はなく、足数が少ない場合は計算可能な指標だけを表示します。「分足を更新」とエラー時の「再試行」で再取得できます。時間足の切替時には古いブラウザーリクエストを中断し、後から到着した前の時間足の結果が画面を上書きすることを防ぎます。

分足は既存のYahoo Financeプロバイダーを利用し、直近29暦日を取得します。1分足は最大7日ずつ分けて取得し、取得時点で終了している通常取引時間内の足だけをキャッシュします。昼休み・時間外・瞬間的な15:30の終値引用は通常の分足として扱いません。休場時も直近の取得データを表示し、足の終了時刻、取引時間外・昼休み・古いデータの状態を併記します。配信元の履歴制限・欠損・遅延によって取得できる範囲は変わります。

計算結果と生の分足を短時間キャッシュします。手動更新でも配信元キャッシュの有効期間内は同じデータが返る場合があります。リアルタイム配信や約定データとしての保証はありません。データは配信元のOHLCを使用し、株式分割等による価格調整の基準を独自に統一していません。

## 表示する指標

期間の単位は、選択した時間足の本数です。たとえばRSI(14)は日足では14本の日足変化、5分足では14本の5分足変化を使います。数値と意味の説明を「勢い・過熱感」「トレンド」「値動き・ボラティリティ」「出来高・資金の動き」「支持・抵抗の目安」にまとめています。

| 指標                             | 設定・計算                                                 | 表示単位・範囲                    |
| -------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| RSI                              | 14本の終値変化、平均益・平均損をWilder平滑化               | 0～100、30・70の目安              |
| RCI                              | 7本・26本、同値価格は平均順位によるSpearman相関            | −100～100、±80の目安              |
| MACD・シグナル・ヒストグラム     | EMA12−EMA26、MACDのEMA9、両者の差                          | 円、0とシグナルの位置関係         |
| ストキャスティクス               | Fast %Kは9本の高安に対する終値、%Dは%Kの3本単純平均        | 0～100、20・80の目安              |
| KDJ                              | 9本のRSVをK・Dへ平滑化、J=3K−2D                            | 指数値、Jは0～100を超える場合あり |
| Williams %R                      | 14本の高安に対する終値の位置                               | −100～0、−80・−20の目安           |
| CCI                              | 20本の典型価格、平均からの乖離÷(0.015×平均絶対偏差)        | 非有界、±100の目安                |
| ROC                              | 10本前の終値からの変化率                                   | %                                 |
| EMA                              | 9・20・50・100本、初期単純平均から指数平滑化               | 円                                |
| SMA                              | 5・25・75本の終値単純平均                                  | 円                                |
| ADX                              | 14本の方向変化からトレンド強度をWilder平滑化               | 0～100、方向を示す値ではない      |
| +DI・−DI                         | 14本の上方向・下方向の値動き÷平滑化した真の値幅            | 指数値                            |
| EMA20乖離率                      | (終値÷EMA20−1)×100                                         | %                                 |
| ATR                              | 14本のギャップを含む真の値幅のWilder平均                   | 円・終値比%                       |
| ボリンジャーバンド               | 20本単純平均±2母標準偏差                                   | 上限・中心・下限は円              |
| ボリンジャー %B                  | (終値−下限)÷(上限−下限)×100                                | 下限0%・上限100%、範囲外も表示    |
| バンド幅                         | (上限−下限)÷中心線×100                                     | %                                 |
| 出来高・平均比                   | 選択した足の出来高、直前20本平均に対する比                 | 株・倍                            |
| MFI                              | 14本の典型価格×出来高の正負フロー比                        | 0～100、20・80の目安              |
| OBV・前の足との差                | 終値の上下で出来高を加減し、取得期間内で累積               | 株、初期値0、絶対値より推移を確認 |
| VWAP・乖離率                     | 日本時間の取引日ごとにリセットする典型価格の出来高加重平均 | 円・%、分足のみ表示               |
| 直近高値・安値                   | 選択した時間足の直近20本                                   | 円                                |
| 取得対象日・前取引日の高値・安値 | 最新データの取引日と、その前の取得済み取引日の高安         | 円                                |
| ピボット・R1/R2・S1/S2           | 取得済み前取引日の高値・安値・最終終値から算出             | 円                                |

ピボットP=(H+L+C)/3、R1=2P−L、R2=P+H−L、S1=2P−H、S2=P−H+Lを使用します。分足の前取引日終値は取得済みの最後の確定分足の終値です。配信元の欠損や終値引用の除外により、公式日足の高値・安値・終値に基づくピボットとは異なる場合があります。「対象日」は端末の今日ではなく、画面に表示した最新データの取引日を指します。

期間不足、必要な値の欠損、計算不能な分母は `null` にして「—」を表示します。ゼロ出来高と不明な出来高は区別します。出来高欠損で価格系列を短縮せず、RSI・移動平均などの価格指標を計算し、MFI・出来高平均比などの依存する指標を利用できない状態にします。累積指標のOBVは取得開始点に依存し、途中の出来高が不明な期間を補完しません。横ばい価格のRSI=50・RCI=0等、既存の中立値の規約は維持しています。

## 指標チャート

「指標チャートを表示」を押して初めてRechartsを遅延読み込みします。RSI、RCI、MACD、株価・移動平均・ボリンジャー、ストキャスティクス、KDJ、ADX・DMI、ATR、CCI、MFI、Williams %R、出来高・平均比、OBV、ROCを選択できます。

株価チャートは終値にEMA9・EMA20・EMA50・SMA25・VWAP・BB上限・BB下限を重ね、チェックボックスで切り替えます。日足ではVWAPを表示しません。チャートの切替や重ね合わせの変更では追加API通信を行いません。直近120本を表示し、計算期間に満たない部分は線で補間しません。

## API・実装ファイル

`GET /api/stocks/285A/technicals?interval=1m` のように取得します。対応時間足は `1m`・`5m`・`15m`、省略時は `1m` です。銘柄・時間足不正は400、存在しない銘柄は404、上場廃止・確定足なしは422、配信元制限は429、タイムアウトは504、その他の取得失敗は503を返します。正常時は最新240本の指標値、価格水準、足の終了時刻、計算時刻、取得足数、配信元と警告を返します。指標は全取得履歴から計算し、APIの表示件数制限をかける前にウォームアップします。

| ファイル                                                 | 役割                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/stock-technical-panel.tsx`               | 共通パネル、日足計算、分足の取得・切替、全指標表示               |
| `src/components/stock-technical-panel.module.css`        | 既存デザインに合わせたレスポンシブ表示                           |
| `src/components/stock-technical-chart.tsx`               | 指標チャート・重ね合わせの遅延表示                               |
| `src/lib/analysis/stock-technicals.ts`                   | 純粋な指標系列とピボット計算                                     |
| `src/app/(client)/api/stocks/[code]/technicals/route.ts` | 分足指標取得API                                                  |
| `src/app/(client)/stocks/[code]/page.tsx`                | 公開詳細ページへの統合                                           |
| `src/app/(dashboard)/dashboard/stocks/[code]/page.tsx`   | ログイン後の詳細ページへの統合                                   |
| `src/lib/analysis/provider.ts`                           | 既存プロバイダー、取得時の確定足だけをキャッシュ                 |
| `tests/stock-technicals.spec.ts`                         | 指標の既知値、欠損、期間不足、因果性の検証                       |
| `tests/stock-technicals-api.spec.ts`                     | 入力検証、確定足、鮮度、APIエラーの検証                          |
| `tests/stock-technicals-ui.spec.ts`                      | 初期表示、時間足切替、チャート、再試行、スマートフォン表示の検証 |
| `scripts/check-stock-technicals.mjs`                     | モックを使わない実データ・PC/スマートフォン確認                  |
| `docs/stock-technicals.md`                               | 本ドキュメント                                                   |

パッケージ追加、DB変更、環境変数追加はありません。株の読み取りは既存Supabaseクライアント・権限を利用します。従来の終値予測とマルチタイムフレーム分析の式は変更しません。

価格指標は各足とそれ以前の足だけを参照します。後続足を追加・変更しても、過去の指標値が変わらないことをテストしています。指標の高低から自動注文や将来の到達率を算出する機能は追加していません。

## 検証手順

依存パッケージのある既存Docker環境で実行できます。

```powershell
docker compose exec -T app yarn typecheck
docker compose exec -T app yarn lint
docker compose exec -T app yarn build
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e yarn test:e2e tests/stock-technicals.spec.ts tests/stock-technicals-api.spec.ts tests/stock-technicals-ui.spec.ts tests/analysis-provider.spec.ts tests/stock-close-analysis.spec.ts
docker compose -f docker-compose.yml -f compose.test.yml run --rm e2e node scripts/check-stock-technicals.mjs
```

実データスクリプトは `/stocks/285A` のPC・スマートフォン表示で、初期日足のRSIと分足API無通信、1分足の実データ取得、RSI・MACD・株価チャートの切替、EMAチェックボックス、ブラウザーエラー、横方向のはみ出しを確認します。285Aの5分足・15分足、7203の1分足APIも確認します。結果は `test-results/live-stock-technicals/report.json`、通常の画面サイズのパネル先頭・チャート画像は同じディレクトリへ保存します。結果の数値は取得時点の配信元データによって変わります。

Playwrightの通常テストは共通の出力ディレクトリを整理するため、実データスクリプトは通常テストの完了後に実行してください。同時実行を避けると画像・報告ファイルを保持できます。

## 検証結果

2026年10月5日に、新規の指標・API・画面テスト44件と既存機能の回帰テスト99件の成功を確認しました。PCでは対象外のモバイル専用テスト1件をスキップしています。型チェックと本番ビルドも成功しました。Lintはエラー0件・新規コードの警告0件で、既存コードの警告55件が残っています。

モックなしの実データ確認では、285Aの1分足5,759本・5分足1,157本・15分足396本、7203の1分足5,785本を取得し、すべてAPIが200で応答しました。確認対象の38項目が最新足で計算可能でした。285AのPC・スマートフォンで日足の初期RSI表示、分足取得、RSI・MACD・株価チャート、重ね合わせの変更を確認し、ブラウザー実行時エラーと横幅超過はありませんでした。

## 定義の確認資料

計算式と期間を公式の指標資料に照合しています。期間は画面に明記した本アプリの設定値です。

- [Fidelity RSI](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI)、[RSIの14期間とWilder平滑化の説明](https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/learning-center/trading-with-momentum-transcript.pdf)
- [Fidelity MACD](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd)、[Bollinger Bands](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/bollinger-bands)
- [Fidelity MFI](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/mfi)、[CCI](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/cci)、[Fast Stochastic](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/fast-stochastic)
- [Fidelity Williams %R](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/williams-r)、[DMI](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/DMI)
- [TradingView RCI](https://www.tradingview.com/support/solutions/43000765570-rank-correlation-index-rci/)、[CCIの20期間](https://www.tradingview.com/support/solutions/43000502001-commodity-channel-index-cci/)、[MFIの14期間](https://www.tradingview.com/support/solutions/43000502348-money-flow-mfi/)
- [JPXの取引時間](https://www.jpx.co.jp/equities/trading/domestic/01.html)、[yfinanceの履歴取得実装](https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/history.py)
