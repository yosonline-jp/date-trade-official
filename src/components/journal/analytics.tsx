"use client";
import { useMemo, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand-theme";
import { analyzeTrades, yen, type Trade } from "@/lib/journal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
export function AnalysisSummary({ trades }: { trades: Trade[] }) {
  const s = analyzeTrades(trades);
  return (
    <div className="journal-stat-grid">
      {[
        ["合計損益", yen(s.total), true],
        ["勝率", s.count ? s.winRate.toFixed(1) + "%" : "—", false],
        ["取引数", s.count + "件", false],
        ["平均利益", yen(s.averageWin), true],
        ["平均損失", yen(-s.averageLoss), true],
        ["最大ドローダウン", yen(-s.drawdown), true],
        [
          "プロフィットファクター",
          s.profitFactor === null ? "—" : s.profitFactor.toFixed(2),
          false,
        ],
      ].map(([label, value, hidden]) => (
        <div className="journal-stat" key={String(label)}>
          <small>{label}</small>
          <strong data-share-money={hidden ? true : undefined}>{value}</strong>
        </div>
      ))}
    </div>
  );
}
export function GroupTable({
  title,
  groups,
}: {
  title: string;
  groups: ReturnType<typeof analyzeTrades>["months"];
}) {
  return (
    <section className="terminal-panel journal-section">
      <h2>{title}</h2>
      {groups.length ? (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>分類</th>
                <th>損益</th>
                <th>取引数</th>
                <th>勝率</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td className={g.profit < 0 ? "negative" : "positive"}>
                    {yen(g.profit)}
                  </td>
                  <td>{g.count}</td>
                  <td>{((g.wins / g.count) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>対象の取引はありません。</p>
      )}
    </section>
  );
}
export default function Analytics({ trades }: { trades: Trade[] }) {
  const [mode, setMode] = useState("real"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const filtered = useMemo(
    () =>
      trades.filter(
        (t) =>
          t.type === mode &&
          (!from || t.trade_date >= from) &&
          (!to || t.trade_date <= to),
      ),
    [trades, mode, from, to],
  );
  const stats = analyzeTrades(filtered);
  const invalid = !!from && !!to && from > to;
  return (
    <div className="journal-tools">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERFORMANCE ANALYSIS</p>
          <h1>
            成績分析<span className="heading-dot">.</span>
          </h1>
          <p>銘柄・売買区分・期間ごとに、自分の取引を振り返る。</p>
        </div>
      </div>
      <div className="journal-filters">
        <label>
          口座
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="real">実取引</option>
            <option value="demo">デモ取引</option>
          </select>
        </label>
        <label>
          開始日
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          終了日
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="terminal-button secondary"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          全期間
        </button>
      </div>
      {invalid ? (
        <p role="alert">終了日は開始日以降を選択してください。</p>
      ) : (
        <>
          <AnalysisSummary trades={filtered} />
          <p className="journal-help">
            手数料控除後の損益を集計。勝率には収支ゼロの取引も含みます。最大ドローダウンは日次累積損益のピークからの最大減少額です。損失がない期間のプロフィットファクターは「—」です。
          </p>
          <section className="terminal-panel journal-section">
            <h2>累積損益</h2>
            {stats.curve.length ? (
              <div className="h-72 w-full" data-share-money>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.curve}>
                    <CartesianGrid stroke={BRAND_COLORS.grid} />
                    <XAxis dataKey="date" stroke={BRAND_COLORS.muted} />
                    <YAxis stroke={BRAND_COLORS.muted} />
                    <Tooltip
                      formatter={(v) => yen(Number(v))}
                      contentStyle={{
                        background: BRAND_COLORS.panel,
                        border: `1px solid ${BRAND_COLORS.border}`,
                        color: BRAND_COLORS.text,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="累積損益"
                      stroke="#8ed8be"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>取引を登録すると推移が表示されます。</p>
            )}
          </section>
          <div className="journal-two-columns">
            <GroupTable title="月別" groups={stats.months} />
            <GroupTable title="年別" groups={stats.years} />
            <GroupTable
              title="銘柄別"
              groups={[...stats.stocks].sort((a, b) => b.profit - a.profit)}
            />
            <GroupTable title="売買区分別" groups={stats.directions} />
            <GroupTable title="タグの組み合わせ別" groups={stats.tags} />
          </div>
        </>
      )}
    </div>
  );
}
