export type HistoryKind = "chart" | "analysis";
export type HistoryTimeframe = "1m" | "5m" | "15m" | "daily" | "weekly";
export type HistoryPreset = "standard" | "daytrade" | "trend";
export type HistoryEntry = {
  code: string;
  name: string;
  market: string | null;
  viewedAt: number;
  timeframe: HistoryTimeframe;
  preset: HistoryPreset;
  chartOpen: boolean;
};
export type HistoryInput = Omit<HistoryEntry, "viewedAt">;

export const HISTORY_LIMIT = 20;

const TIMEFRAMES = new Set(["1m", "5m", "15m", "daily", "weekly"]);
const PRESETS = new Set(["standard", "daytrade", "trend"]);

export function historyKey(kind: HistoryKind): string {
  return "daytrade.recent." + kind + ".v1";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntry(
  value: unknown,
  kind: HistoryKind,
): HistoryEntry | null {
  if (!isObject(value)) return null;
  if (typeof value.code !== "string" || typeof value.name !== "string") {
    return null;
  }
  const code = value.code.trim().toUpperCase();
  const name = value.name.trim();
  if (!/^[0-9A-Z]{4,5}$/.test(code) || !name || name.length > 160) return null;
  if (value.market !== null && typeof value.market !== "string") return null;
  const market = typeof value.market === "string" ? value.market.trim() : null;
  if (market !== null && market.length > 120) return null;
  if (
    typeof value.viewedAt !== "number" ||
    !Number.isFinite(value.viewedAt) ||
    value.viewedAt < 0 ||
    Number.isNaN(new Date(value.viewedAt).getTime())
  ) {
    return null;
  }
  if (
    typeof value.timeframe !== "string" ||
    !TIMEFRAMES.has(value.timeframe) ||
    (kind === "analysis" &&
      (value.timeframe === "daily" || value.timeframe === "weekly")) ||
    typeof value.preset !== "string" ||
    !PRESETS.has(value.preset) ||
    typeof value.chartOpen !== "boolean"
  ) {
    return null;
  }
  // Only navigation settings are persisted; ignore arbitrary storage fields.
  return {
    code,
    name,
    market,
    viewedAt: value.viewedAt,
    timeframe: value.timeframe as HistoryTimeframe,
    preset: value.preset as HistoryPreset,
    chartOpen: value.chartOpen,
  };
}

function normalizeHistory(values: unknown, kind: HistoryKind): HistoryEntry[] {
  if (!Array.isArray(values)) return [];
  const newestByCode = new Map<string, HistoryEntry>();
  for (const value of values) {
    const entry = normalizeEntry(value, kind);
    if (!entry) continue;
    const previous = newestByCode.get(entry.code);
    if (!previous || entry.viewedAt > previous.viewedAt) {
      newestByCode.set(entry.code, entry);
    }
  }
  return [...newestByCode.values()]
    .sort((left, right) => right.viewedAt - left.viewedAt)
    .slice(0, HISTORY_LIMIT);
}

export function parseHistory(
  raw: string | null,
  kind: HistoryKind,
): HistoryEntry[] {
  if (raw === null) return [];
  try {
    const saved: unknown = JSON.parse(raw);
    if (
      !isObject(saved) ||
      saved.version !== 1 ||
      !Array.isArray(saved.entries)
    ) {
      return [];
    }
    return normalizeHistory(saved.entries, kind);
  } catch {
    return [];
  }
}

export function upsertHistory(
  entries: readonly HistoryEntry[],
  input: HistoryInput,
  kind: HistoryKind,
  now = Date.now(),
): HistoryEntry[] {
  const existing = normalizeHistory(entries, kind);
  const incoming = normalizeEntry({ ...input, viewedAt: now }, kind);
  if (!incoming) return existing;
  // The current visit wins ties and stays first even if the device clock moves back.
  return [
    incoming,
    ...existing.filter((entry) => entry.code !== incoming.code),
  ].slice(0, HISTORY_LIMIT);
}
