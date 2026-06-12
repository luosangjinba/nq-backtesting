#!/usr/bin/env python3
"""Generate instrument daily trend/range regime CSV from V4 futures_1m data."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

import duckdb


DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "trading_data.duckdb"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"
FIELDNAMES = [
    "date",
    "instrument",
    "trendClose",
    "trendEma20",
    "trendEma50",
    "trendRegime",
    "dayRange",
    "atr20",
    "rangeAtrRatio",
    "rangeRegime",
]


@dataclass(frozen=True)
class DailyRow:
    date: str
    instrument: str
    close: float
    high: float
    low: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--instrument", required=True, help="Instrument symbol, e.g. ES or NQ")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Path to trading_data.duckdb")
    parser.add_argument("--output", default="", help="Output CSV path. Defaults to data/daily-regime-<instrument>.csv")
    return parser.parse_args()


def fetch_daily_rows(db_path: Path, instrument: str) -> list[DailyRow]:
    sql = """
    with base as (
      select
        case
          when strftime(ts, '%H:%M') >= '18:00' then cast(ts + interval '1 day' as date)
          else cast(ts as date)
        end as trading_day,
        ts,
        high,
        low,
        close
      from futures_1m
      where instrument = ?
        and (strftime(ts, '%H:%M') < '17:00' or strftime(ts, '%H:%M') >= '18:00')
    ),
    ranges as (
      select
        trading_day,
        max(high) as high,
        min(low) as low
      from base
      group by trading_day
    ),
    closes as (
      select
        trading_day,
        last(close order by ts) as close
      from base
      group by trading_day
    )
    select
      ranges.trading_day,
      closes.close,
      ranges.high,
      ranges.low
    from ranges
    join closes using (trading_day)
    order by ranges.trading_day
    """
    with duckdb.connect(str(db_path), read_only=True) as conn:
      rows = conn.execute(sql, [instrument]).fetchall()
    return [
        DailyRow(
            date=str(row[0]),
            instrument=instrument,
            close=float(row[1]),
            high=float(row[2]),
            low=float(row[3]),
        )
        for row in rows
    ]


def add_ema(rows: list[dict], period: int) -> None:
    multiplier = 2 / (period + 1)
    ema = None
    running_sum = 0.0
    key = f"ema{period}"
    for index, row in enumerate(rows):
        if index < period:
            running_sum += row["close"]
        if index == period - 1:
            ema = running_sum / period
        elif index >= period and ema is not None:
            ema = (row["close"] - ema) * multiplier + ema
        row[key] = ema if index >= period - 1 and ema is not None else None


def trend_regime(row: dict) -> str:
    close = row.get("close")
    ema20 = row.get("ema20")
    ema50 = row.get("ema50")
    if close is None or ema20 is None or ema50 is None:
        return "unknown"
    if close > ema20 > ema50:
        return "bull_trend"
    if close < ema20 < ema50:
        return "bear_trend"
    return "range"


def add_atr20(rows: list[dict]) -> None:
    true_ranges: list[float] = []
    for index, row in enumerate(rows):
        day_range = row["high"] - row["low"]
        previous_close = rows[index - 1]["close"] if index > 0 else None
        if previous_close is None:
            true_range = day_range
        else:
            true_range = max(day_range, abs(row["high"] - previous_close), abs(row["low"] - previous_close))
        true_ranges.append(true_range)
        recent = true_ranges[max(0, index - 19): index + 1]
        atr20 = sum(recent) / len(recent) if len(recent) >= 20 else None
        row["dayRange"] = day_range
        row["atr20"] = atr20
        row["rangeAtrRatio"] = day_range / atr20 if atr20 and atr20 > 0 else None


def range_regime(ratio: float | None) -> str:
    if ratio is None:
        return "unknown"
    if ratio < 0.8:
        return "small_range"
    if ratio > 1.2:
        return "large_range"
    return "normal_range"


def format_price(value: float | None) -> str:
    return "" if value is None else f"{value:.2f}"


def format_float(value: float | None) -> str:
    return "" if value is None else f"{value:.6f}"


def build_output_rows(daily_rows: list[DailyRow]) -> list[dict]:
    rows = [
        {
            "date": row.date,
            "instrument": row.instrument,
            "close": row.close,
            "high": row.high,
            "low": row.low,
        }
        for row in daily_rows
    ]
    add_ema(rows, 20)
    add_ema(rows, 50)
    add_atr20(rows)
    return [
        {
            "date": row["date"],
            "instrument": row["instrument"],
            "trendClose": format_price(row["close"]),
            "trendEma20": format_float(row["ema20"]),
            "trendEma50": format_float(row["ema50"]),
            "trendRegime": trend_regime(row),
            "dayRange": format_price(row["dayRange"]),
            "atr20": format_float(row["atr20"]),
            "rangeAtrRatio": format_float(row["rangeAtrRatio"]),
            "rangeRegime": range_regime(row["rangeAtrRatio"]),
        }
        for row in rows
    ]


def main() -> int:
    args = parse_args()
    instrument = args.instrument.strip().upper()
    db_path = Path(args.db)
    output_path = Path(args.output) if args.output else DEFAULT_OUTPUT_DIR / f"daily-regime-{instrument.lower()}.csv"
    daily_rows = fetch_daily_rows(db_path, instrument)
    if not daily_rows:
        raise SystemExit(f"No daily rows found for {instrument}")
    output_rows = build_output_rows(daily_rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output_rows)
    print(f"Wrote {len(output_rows)} rows to {output_path}")
    print(f"Range: {output_rows[0]['date']} -> {output_rows[-1]['date']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
