"""Generate parity fixtures by executing the original StockAnalysis functions offline."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from yfinance.utils import auto_adjust


def chart(closes: list[float], *, adjusted=False, missing_open=False, missing_rows=False):
    start = datetime(2026, 8, 1, tzinfo=timezone.utc)
    count = len(closes)
    opens = [value * (1 + (i % 3 - 1) * 0.002) for i, value in enumerate(closes)]
    highs = [max(value, opens[i]) + 1.3 for i, value in enumerate(closes)]
    lows = [min(value, opens[i]) - 1.1 for i, value in enumerate(closes)]
    values = list(closes)
    if missing_open:
        opens[-1] = None
    if missing_rows:
        highs[3] = None
        values[7] = None
    result = {
        "meta": {},
        "timestamp": [int((start + timedelta(days=i)).timestamp()) for i in range(count)],
        "indicators": {"quote": [{
            "open": opens, "high": highs, "low": lows, "close": values,
            "volume": [1000 + i * 20 for i in range(count)],
        }]},
    }
    if adjusted:
        result["indicators"]["adjclose"] = [{
            "adjclose": [None if value is None else value * (0.94 if i < count - 4 else 1)
                         for i, value in enumerate(values)],
        }]
    return result


def frame(raw):
    quote = raw["indicators"]["quote"][0]
    data = pd.DataFrame({name.title(): values for name, values in quote.items()})
    data["Adj Close"] = raw["indicators"].get("adjclose", [{"adjclose": quote["close"]}])[0]["adjclose"]
    return auto_adjust(data).dropna(subset=["Close", "High", "Low"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("stockanalysis_reference", args.source)
    original = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = original
    spec.loader.exec_module(original)
    datasets = [
        ("rising", chart([100 + i * 0.8 for i in range(23)])),
        ("falling", chart([130 - i * 0.8 for i in range(23)])),
        ("flat", chart([100.1] * 23)),
        ("mixed", chart([100 + math.sin(i * 1.7) * 4 for i in range(23)])),
        ("reversal-up", chart([130 - i * 1.1 if i < 17 else 108 + (i - 17) * 2.5 for i in range(23)])),
        ("reversal-down", chart([100 + i * 1.1 if i < 17 else 120 - (i - 17) * 2.5 for i in range(23)])),
        ("volatile", chart([100 + i * 10 for i in range(23)])),
        ("adjusted-prices", chart([100 + i * 0.4 for i in range(23)], adjusted=True)),
        ("missing-open", chart([100 + i * 0.8 for i in range(23)], missing_open=True)),
        ("missing-rows", chart([100 + i * 0.8 for i in range(23)], missing_rows=True)),
        ("short-history", chart([100 + i * 0.8 for i in range(10)])),
        ("single-bar", chart([100.1], missing_open=True)),
    ]
    fallback = chart([100 + math.sin(i) * 3 + i * 0.2 for i in range(50)])
    short = json.loads(json.dumps(fallback))
    short["timestamp"] = short["timestamp"][-17:]
    short["indicators"]["quote"][0] = {key: value[-17:] for key, value in short["indicators"]["quote"][0].items()}
    cases = []
    for name, first in datasets + [("three-month-fallback", short)]:
        third = fallback if name == "three-month-fallback" else first
        calls = []

        def fetch_history(_symbol, period, interval):
            assert interval == "1d"
            calls.append(period)
            return frame(first if period == "1mo" else third)

        original.fetch_history = fetch_history
        actual = original.analyze_nikkei225_component("285A.T", "Fixture")
        selected = first if calls[-1] == "1mo" else third
        data = frame(selected)
        close = data["Close"]
        macd, signal, histogram = original.macd(close)
        atr = original.atr(data).iloc[-1]
        expected = {
            "startPrice": actual["start_price"],
            "analysisClose": actual["analysis_close"],
            "predictedClose": actual["predicted_close"],
            "score": actual["score"],
            "dataPoints": len(data),
            "historyRange": calls[-1],
            "indicators": {
                "ema5": float(original.ema(close, 5).iloc[-1]),
                "ema20": float(original.ema(close, 20).iloc[-1]),
                "rsi14": float(original.rsi(close).iloc[-1]),
                "macd": float(macd.iloc[-1]),
                "macdSignal": float(signal.iloc[-1]),
                "macdHistogram": float(histogram.iloc[-1]),
                "atr14": None if pd.isna(atr) else float(atr),
            },
        }
        cases.append({"name": name, "oneMonth": first, "threeMonths": third, "calls": calls, "expected": expected})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({
        "reference": "StockAnalysis/app.py:analyze_nikkei225_component",
        "sourceSha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
        "cases": cases,
    }, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Generated {len(cases)} reference cases: {args.output}")


if __name__ == "__main__":
    main()
