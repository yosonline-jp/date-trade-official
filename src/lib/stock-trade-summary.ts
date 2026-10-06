export type TradeProfitRow = {
  user_id: string | null;
  type: string | null;
  profit: unknown;
};

export type TradeSummaryMetrics = {
  recordCount: number;
  profitCount: number;
  missingProfitCount: number;
  totalProfit: number | null;
  winRate: number | null;
  averageProfit: number | null;
};

export type PersonalTradeSummary = {
  real: TradeSummaryMetrics;
  demo: TradeSummaryMetrics;
};

function savedProfit(value: unknown): number | null {
  if (
    value == null ||
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function summarize(rows: readonly TradeProfitRow[]): TradeSummaryMetrics {
  let profitCount = 0;
  let total = 0;
  let wins = 0;
  for (const row of rows) {
    const value = savedProfit(row.profit);
    if (value == null) continue;
    profitCount++;
    total += value;
    if (value > 0) wins++;
  }
  const totalProfit = profitCount && Number.isFinite(total) ? total : null;
  return {
    recordCount: rows.length,
    profitCount,
    missingProfitCount: rows.length - profitCount,
    totalProfit,
    winRate: profitCount ? (wins / profitCount) * 100 : null,
    averageProfit: totalProfit == null ? null : totalProfit / profitCount,
  };
}

/**
 * Aggregate the authenticated viewer's saved profits, across both visibilities.
 * Ownership uses user_id directly; embedded public profiles never establish it.
 */
export function getPersonalTradeSummary(
  rows: readonly TradeProfitRow[],
  viewerId: string | null,
): PersonalTradeSummary | null {
  if (!viewerId?.trim()) return null;
  const owned = rows.filter((row) => row.user_id === viewerId);
  return {
    real: summarize(owned.filter((row) => row.type === "real")),
    demo: summarize(owned.filter((row) => row.type === "demo")),
  };
}
