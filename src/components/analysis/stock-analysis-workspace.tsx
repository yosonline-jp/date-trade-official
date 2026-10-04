"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, Search, ArrowUpRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import type { AnalysisResult, Interval, Stock } from "@/lib/analysis/types";
import styles from "./stock-analysis.module.css";

const AnalysisCharts = dynamic(() => import("./analysis-charts"), {
  ssr: false,
  loading: () => <p className={styles.note}>チャートを準備しています…</p>,
});
const number = (value: number | null | undefined, digits = 2) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("ja-JP", { maximumFractionDigits: digits });
const yen = (value: number | null | undefined) =>
  value == null ? "算出不可" : `${number(value)}円`;
const percent = (value: number | null) =>
  value == null ? "算出不可" : `${number(value, 1)}%`;
const trendLabels = { UP: "上昇", DOWN: "下降", RANGE: "レンジ" };

export default function StockAnalysisWorkspace({
  initialStock,
}: {
  initialStock?: Stock;
}) {
  const [query, setQuery] = useState(initialStock?.code ?? "");
  const [selected, setSelected] = useState<Stock | null>(initialStock ?? null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [interval, setInterval] = useState<Interval>("1m");
  const [chartOpen, setChartOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const debounced = useDebounce(query, 350);
  useEffect(() => {
    if (!debounced.trim() || selected) {
      setStocks([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    setSearchError("");
    fetch(`/api/stocks/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("銘柄を検索できませんでした。");
        const data = (await response.json()) as Stock[];
        if (!controller.signal.aborted) setStocks(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setStocks([]);
          setSearchError(
            cause instanceof Error ? cause.message : "検索に失敗しました。",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [debounced, selected]);
  useEffect(() => () => request.current?.abort(), []);
  function reset() {
    request.current?.abort();
    searchRequest.current?.abort();
    setSearching(false);
    setBusy(false);
    setError("");
    setResult(null);
    setChartOpen(false);
  }
  async function analyze() {
    if (!selected || busy) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    setChartOpen(false);
    try {
      const response = await fetch("/api/stock-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selected.code }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(75_000),
        ]),
      });
      const data = (await response.json()) as AnalysisResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "分析できませんでした。");
      if (!controller.signal.aborted) {
        setResult(data);
        setInterval("1m");
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error && cause.name === "TimeoutError"
            ? "分析がタイムアウトしました。再度お試しください。"
            : cause instanceof Error
              ? cause.message
              : "分析に失敗しました。",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className={styles.workspace}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MULTI TIMEFRAME ANALYSIS</p>
          <h1>
            デイトレード株式分析<span className="heading-dot">.</span>
          </h1>
          <p>
            15分足の環境、5分足のセットアップ、1分足のタイミングから判断します。
          </p>
        </div>
      </div>
      <section
        className={`terminal-panel ${styles.searchPanel}`}
        aria-label="分析銘柄を選択"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void analyze();
          }}
        >
          <label htmlFor="analysis-stock-search">
            銘柄コード・銘柄名を検索
          </label>
          <div className={styles.searchRow}>
            <div className={styles.searchInput}>
              <Search size={17} />
              <input
                id="analysis-stock-search"
                autoComplete="off"
                maxLength={80}
                value={query}
                placeholder="例：9984、ソフトバンクグループ"
                onChange={(event) => {
                  reset();
                  setSelected(null);
                  setStocks([]);
                  setSearchError("");
                  setQuery(event.target.value);
                }}
              />
            </div>
            <button
              className="terminal-button"
              disabled={!selected || busy}
              type="submit"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? "分析中…" : "分析する"}
            </button>
          </div>
        </form>
        <div role="status" aria-live="polite">
          {searching ? (
            <p className={styles.note}>銘柄を検索しています…</p>
          ) : !selected &&
            query === debounced &&
            debounced.trim() &&
            !stocks.length &&
            !searchError ? (
            <p className={styles.note}>
              候補が見つかりません。コードや銘柄名をご確認ください。
            </p>
          ) : null}
        </div>
        {searchError && (
          <p role="alert" className="data-notice">
            {searchError}
          </p>
        )}
        {stocks.length > 0 && !selected && (
          <ul className={styles.candidates} aria-label="銘柄の検索候補">
            {stocks.map((stock) => (
              <li key={stock.code}>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setSelected(stock);
                    setQuery(stock.code);
                    setStocks([]);
                  }}
                >
                  <strong>{stock.code}</strong>
                  <span>{stock.name}</span>
                  <small>{stock.market}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <p className={styles.selection}>
            選択中：
            <strong>
              {selected.code} {selected.name}
            </strong>
            <Link href={`/stocks/${selected.code}`}>
              銘柄詳細 <ArrowUpRight size={13} />
            </Link>
          </p>
        )}
        <p className={styles.note}>
          分析はボタンを押したときに実行します。同じ銘柄の短時間の再分析は最大60秒間キャッシュします。
        </p>
      </section>
      {busy && (
        <p className="data-notice" role="status">
          1分・5分・15分足を取得し、指標と過去の類似局面を分析しています…
        </p>
      )}
      {error && (
        <p className="data-notice" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className={styles.results} aria-label="株式分析結果">
          <section className={`terminal-panel ${styles.panel}`}>
            <div className={styles.resultHeading}>
              <div>
                <p className="eyebrow">{result.symbol} · JPY</p>
                <h2>{result.name}</h2>
                <p className={styles.currentPrice}>
                  {yen(result.currentPrice)}
                </p>
              </div>
              <div className={styles.signal} data-signal={result.signal}>
                <strong>
                  {result.strength !== "WAIT" && result.strength !== "NORMAL"
                    ? `${result.strength} `
                    : ""}
                  {result.signal}
                </strong>
                <span>
                  {result.counterTrend
                    ? "逆張り候補・15分足と逆方向"
                    : result.signal === "WAIT"
                      ? "条件が整うまで待機"
                      : "順張りの分析候補"}
                </span>
              </div>
            </div>
            <dl className={styles.summary}>
              <div>
                <dt>Signal Score</dt>
                <dd>
                  {result.score} <small>/ 100</small>
                </dd>
              </div>
              <div>
                <dt>データ信頼度</dt>
                <dd>{percent(result.confidence)}</dd>
              </div>
              <div>
                <dt>類似局面</dt>
                <dd>
                  {result.statistics.samples}
                  <small>件 / {result.statistics.horizonMinutes}分先</small>
                </dd>
              </div>
            </dl>
            <p className={styles.note}>
              データ信頼度はサンプル数と類似度の充足度です。勝率や将来予測の正確さではありません。
            </p>
            <p className={styles.note}>
              価格データの確定時刻：
              {new Date(result.dataAt).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })}{" "}
              JST
              <br />
              分析時刻：
              {new Date(result.analyzedAt).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })}{" "}
              JST · {result.source.provider} · {result.source.delay}
            </p>
            <h3>総合判断</h3>
            {result.reasons.map((reason, i) => (
              <p className={styles.explanation} key={i}>
                {reason}
              </p>
            ))}
          </section>
          <div className={styles.planGrid}>
            <section className={`terminal-panel ${styles.panel}`}>
              <p className="eyebrow">
                ENTRY · {result.scenarioDirection} SCENARIO
              </p>
              <h2>エントリー予想</h2>
              <p className={styles.note}>
                WAIT時は実行シグナルではなく、条件が成立した場合の参考シナリオです。
              </p>
              <p>推定エントリー価格</p>
              <p className={styles.planPrice}>{yen(result.entry?.expected)}</p>
              <p>
                許容レンジ：
                {result.entry
                  ? `${yen(result.entry.low)} ～ ${yen(result.entry.high)}`
                  : "類似局面のデータ不足"}
              </p>
              <p className={styles.note}>
                成立条件：{result.entryCondition}
                <br />
                過去の類似局面の3分後リターン、現在値・VWAP・EMA20・直近高安値から統計的に推定します。
              </p>
            </section>
            <section className={`terminal-panel ${styles.panel}`}>
              <p className="eyebrow">STOP LOSS</p>
              <h2>損切り候補</h2>
              <p className={styles.planPrice}>{yen(result.stopLoss?.price)}</p>
              <p>1株あたりリスク：{yen(result.stopLoss?.riskPerShare)}</p>
              <p>
                価格に対するリスク：
                {result.stopLoss
                  ? percent(result.stopLoss.riskPercent)
                  : "算出不可"}
              </p>
              <p className={styles.note}>
                ATRと直近高安値を考慮します。注文価格を確約するものではありません。
              </p>
            </section>
          </div>
          <section className={`terminal-panel ${styles.panel}`}>
            <h2>利確予想・Risk / Reward</h2>
            {result.takeProfit.length ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>段階</th>
                      <th>推定価格</th>
                      <th>価格レンジ</th>
                      <th>到達率</th>
                      <th>RR比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.takeProfit.map((tp) => (
                      <tr key={tp.level}>
                        <th>予想TP{tp.level}</th>
                        <td>{yen(tp.expected)}</td>
                        <td>
                          {yen(tp.low)} ～ {yen(tp.high)}
                        </td>
                        <td>{percent(tp.probability)}</td>
                        <td>{number(tp.riskReward)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.note}>
                分析に必要な類似局面が不足しています。
              </p>
            )}
            <p className={styles.note}>
              到達率は過去{result.statistics.samples}
              件で、3分以内に推定エントリー価格に到達し、シグナル後
              {result.statistics.horizonMinutes}
              分以内に利確する割合です。未エントリー・損切り先行は未到達として集計し、同じ足で利確と損切りに触れる場合は損切りを優先します。
            </p>
          </section>
          <section className={`terminal-panel ${styles.panel}`}>
            <h2>RCI Price Projection</h2>
            <p className={styles.note}>
              1分足RCI(7)が各水準へ到達した場合の統計的予想。価格は到達した類似局面の中央値・25～75パーセンタイルです。
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>RCI</th>
                    <th>推定価格</th>
                    <th>下限</th>
                    <th>上限</th>
                    <th>到達率</th>
                    <th>サンプル</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rciProjection.map((projection) => (
                    <tr key={projection.rci}>
                      <th>
                        {projection.rci > 0 ? "+" : ""}
                        {projection.rci}
                      </th>
                      <td>
                        {projection.alreadyReached
                          ? "通過済み"
                          : yen(projection.expectedPrice)}
                      </td>
                      <td>
                        {projection.alreadyReached
                          ? "—"
                          : yen(projection.lowerPrice)}
                      </td>
                      <td>
                        {projection.alreadyReached
                          ? "—"
                          : yen(projection.upperPrice)}
                      </td>
                      <td>
                        {projection.alreadyReached
                          ? "—"
                          : percent(projection.probability)}
                      </td>
                      <td>
                        {projection.reached} / {projection.samples}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              現在RCI：{number(result.timeframes.oneMinute.current.rci)}
              。到達率の母数は水準をまだ通過していない類似局面です。8件未満、または価格推定の到達例が3件未満の場合は算出不可です。RCIだけから価格を逆算していません。
            </p>
          </section>
          <div className={styles.frameGrid}>
            {[
              result.timeframes.fifteenMinute,
              result.timeframes.fiveMinute,
              result.timeframes.oneMinute,
            ].map((frame) => (
              <section
                className={`terminal-panel ${styles.panel}`}
                key={frame.interval}
              >
                <p className="eyebrow">{frame.role.toUpperCase()}</p>
                <h2>
                  {frame.interval === "15m"
                    ? "15分足"
                    : frame.interval === "5m"
                      ? "5分足"
                      : "1分足"}{" "}
                  · {trendLabels[frame.trend]}
                </h2>
                <dl className={styles.indicators}>
                  <div>
                    <dt>RCI(7) / 傾き</dt>
                    <dd>
                      {number(frame.current.rci)} / {number(frame.rciSlope)}
                    </dd>
                  </div>
                  <div>
                    <dt>RCI 1本前 / 2本前</dt>
                    <dd>
                      {number(frame.previous.rci)} /{" "}
                      {number(frame.previous2.rci)}
                    </dd>
                  </div>
                  <div>
                    <dt>KDJ K / D / J</dt>
                    <dd>
                      {number(frame.current.k)} / {number(frame.current.d)} /{" "}
                      {number(frame.current.j)}
                    </dd>
                  </div>
                  <div>
                    <dt>RSI(14)</dt>
                    <dd>{number(frame.current.rsi)}</dd>
                  </div>
                  <div>
                    <dt>EMA20 / EMA50</dt>
                    <dd>
                      {number(frame.current.ema20)} /{" "}
                      {number(frame.current.ema50)}
                    </dd>
                  </div>
                  <div>
                    <dt>EMA100</dt>
                    <dd>{number(frame.current.ema100)}</dd>
                  </div>
                  <div>
                    <dt>VWAP</dt>
                    <dd>{number(frame.current.vwap)}</dd>
                  </div>
                  <div>
                    <dt>ADX(14)</dt>
                    <dd>{number(frame.current.adx)}</dd>
                  </div>
                  <div>
                    <dt>ATR(14) / 価格比</dt>
                    <dd>
                      {number(frame.current.atr)} /{" "}
                      {percent(
                        (100 * (frame.current.atr ?? 0)) / frame.current.close,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>出来高 / 平均比</dt>
                    <dd>
                      {number(frame.current.volume, 0)} /{" "}
                      {number(frame.current.volumeRatio)}倍
                    </dd>
                  </div>
                  <div>
                    <dt>出来高状態</dt>
                    <dd>
                      {(frame.current.volumeRatio ?? 0) > 1.5
                        ? "増加"
                        : (frame.current.volumeRatio ?? 0) < 0.8
                          ? "少ない"
                          : "平均付近"}
                    </dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
          <section className={`terminal-panel ${styles.panel}`}>
            <h2>シグナル根拠</h2>
            <p className={styles.note}>
              LONG {result.scores.long.total}点 / SHORT{" "}
              {result.scores.short.total}点。以下は{result.scenarioDirection}
              候補の評価です。
            </p>
            <ul className={styles.reasons}>
              {result.scores[
                result.scenarioDirection === "LONG" ? "long" : "short"
              ].reasons.map((reason, i) => (
                <li key={i} data-met={reason.met}>
                  {reason.met ? "✓" : "△"} {reason.frame} · {reason.label}
                  <small>{reason.points}点</small>
                </li>
              ))}
            </ul>
          </section>
          <section className={`terminal-panel ${styles.panel}`}>
            <h2>チャート</h2>
            <button
              className="terminal-button secondary"
              aria-expanded={chartOpen}
              onClick={() => setChartOpen(!chartOpen)}
            >
              {chartOpen ? "チャートを閉じる" : "チャートを表示"}
            </button>
            {chartOpen && (
              <>
                <div
                  role="group"
                  aria-label="分析チャートの時間足"
                  className={styles.tabs}
                >
                  {(["1m", "5m", "15m"] as Interval[]).map((value) => (
                    <button
                      key={value}
                      onClick={() => setInterval(value)}
                      aria-pressed={interval === value}
                    >
                      {value === "1m"
                        ? "1分足"
                        : value === "5m"
                          ? "5分足"
                          : "15分足"}
                    </button>
                  ))}
                </div>
                <AnalysisCharts
                  points={result.charts[interval]}
                  projections={result.rciProjection}
                  price={result.currentPrice}
                />
              </>
            )}
          </section>
          <section className={`terminal-panel ${styles.panel}`}>
            <h2>データ・統計の条件</h2>
            <p>
              前日高値 {yen(result.levels.pdh)} / 前日安値{" "}
              {yen(result.levels.pdl)}
              <br />
              当日高値 {yen(result.levels.dayHigh)} / 当日安値{" "}
              {yen(result.levels.dayLow)}
            </p>
            <p className={styles.note}>
              実取得：{result.source.historyDays}取引日 · 1分{" "}
              {result.source.bars["1m"]}本 / 5分 {result.source.bars["5m"]}本 /
              15分 {result.source.bars["15m"]}
              本。確定した足だけで同期し、翌日・昼休み・欠損をまたぐ類似局面の結果は除外しています。
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>時間</th>
                    <th>平均変化率</th>
                    <th>中央値</th>
                    <th>25%点</th>
                    <th>75%点</th>
                  </tr>
                </thead>
                <tbody>
                  {result.statistics.returns.map((row) => (
                    <tr key={row.minutes}>
                      <th>{row.minutes}分後</th>
                      {[row.mean, row.median, row.q25, row.q75].map((n, i) => (
                        <td key={i}>{n == null ? "—" : percent(n * 100)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.source.warnings.map((warning, i) => (
              <p className={styles.note} key={i}>
                {warning}
              </p>
            ))}
          </section>
        </div>
      )}
      <p className={styles.disclaimer}>
        この分析は過去の実データとテクニカル指標から統計的に算出した参考情報です。将来の株価や利益を保証するものではありません。
      </p>
    </div>
  );
}
