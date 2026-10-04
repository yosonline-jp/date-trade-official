/** Aggregate observed trade outcomes; callers use analyzeMarket(..., asOf) for signals. */
export function backtestMetrics(profits: number[]) {
  let equity = 0,
    peak = 0,
    maxDrawdown = 0,
    losingStreak = 0,
    maximumLosingStreak = 0;
  const wins = profits.filter((p) => p > 0),
    losses = profits.filter((p) => p < 0);
  for (const profit of profits) {
    equity += profit;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    losingStreak = profit < 0 ? losingStreak + 1 : 0;
    maximumLosingStreak = Math.max(maximumLosingStreak, losingStreak);
  }
  const grossProfit = wins.reduce((a, b) => a + b, 0),
    grossLoss = -losses.reduce((a, b) => a + b, 0);
  return {
    trades: profits.length,
    wins: wins.length,
    losses: losses.length,
    winRate: profits.length ? (100 * wins.length) / profits.length : null,
    averageProfit: wins.length ? grossProfit / wins.length : null,
    averageLoss: losses.length ? -grossLoss / losses.length : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    expectancy: profits.length ? equity / profits.length : null,
    netProfit: equity,
    maxDrawdown,
    maximumLosingStreak,
  };
}
