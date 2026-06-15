#!/usr/bin/env python3
"""Read-only raw-contract volume crossover scanner for ES/NQ roll candidates."""

from __future__ import annotations

import argparse
import csv
import warnings
from dataclasses import dataclass
from datetime import datetime
from io import StringIO
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

try:
    import databento as db
except ImportError:  # pragma: no cover - source-file mode does not need databento
    db = None


ET = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")
DEFAULT_DATASET = "GLBX.MDP3"
DEFAULT_SCHEMA = "ohlcv-1m"


@dataclass(frozen=True)
class DailyVolume:
    date: str
    old_volume: int
    new_volume: int
    winner: str
    new_old_ratio: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan old/new futures contract volume for roll candidates.")
    parser.add_argument("--instrument", required=True, choices=["ES", "NQ"], help="Internal instrument label.")
    parser.add_argument("--old-contract", required=True, help="Old raw quarterly contract, e.g. NQH6.")
    parser.add_argument("--new-contract", required=True, help="New raw quarterly contract, e.g. NQM6.")
    parser.add_argument("--start", required=True, help="Start timestamp/date. Interpreted as ET if no timezone.")
    parser.add_argument("--end", required=True, help="End timestamp/date. Interpreted as ET if no timezone.")
    parser.add_argument("--dataset", default=DEFAULT_DATASET, help="Databento dataset.")
    parser.add_argument("--schema", default=DEFAULT_SCHEMA, help="Databento schema.")
    parser.add_argument("--source-file", help="Read normalized raw rows from local CSV instead of Databento.")
    parser.add_argument("--min-consecutive-days", type=int, default=2, help="Required consecutive new-dominant days.")
    parser.add_argument("--show-empty-days", action="store_true", help="Print days where both contracts have zero volume.")
    return parser.parse_args()


def parse_datetime_et(value: str) -> datetime:
    text = str(value or "").strip()
    if not text:
        raise ValueError("empty datetime")
    if "T" not in text and " " not in text:
        text = f"{text}T00:00:00"
    parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=ET)
    return parsed.astimezone(ET)


def utc_iso_from_et(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def normalize_databento_rows(raw: pd.DataFrame, old_contract: str, new_contract: str) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=["source_symbol", "ts", "volume"])
    index = raw.index
    localized = index.tz_localize("UTC").tz_convert(ET) if index.tz is None else index.tz_convert(ET)
    rows = pd.DataFrame({
        "source_symbol": raw["symbol"].astype(str),
        "ts": localized.tz_localize(None),
        "volume": pd.to_numeric(raw["volume"], errors="coerce").fillna(0).astype("int64"),
    })
    rows = rows[rows["source_symbol"].isin([old_contract, new_contract])]
    return rows.sort_values(["source_symbol", "ts"]).reset_index(drop=True)


def download_databento_rows(args: argparse.Namespace) -> pd.DataFrame:
    if db is None:
        raise SystemExit("Missing dependency: databento. Install it or use --source-file.")
    client = db.Historical()
    start_et = parse_datetime_et(args.start)
    end_et = parse_datetime_et(args.end)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        data = client.timeseries.get_range(
            dataset=args.dataset,
            symbols=[args.old_contract, args.new_contract],
            schema=args.schema,
            start=utc_iso_from_et(start_et),
            end=utc_iso_from_et(end_et),
            stype_in="raw_symbol",
        )
    for warning in caught:
        print(f"databento_warning: {warning.message}")
    return normalize_databento_rows(data.to_df(), args.old_contract, args.new_contract)


def read_source_file(path: Path, old_contract: str, new_contract: str) -> pd.DataFrame:
    text = path.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(StringIO(text))
    fieldnames = {str(field).strip().lower(): field for field in (reader.fieldnames or [])}
    symbol_field = fieldnames.get("source_symbol") or fieldnames.get("symbol")
    ts_field = fieldnames.get("ts") or fieldnames.get("timestamp") or fieldnames.get("time")
    volume_field = fieldnames.get("volume")
    if not symbol_field or not ts_field or not volume_field:
        raise ValueError("source file requires symbol/source_symbol, ts/time/timestamp, and volume columns")
    rows = []
    for index, raw in enumerate(reader, start=2):
        symbol = str(raw.get(symbol_field) or "").strip()
        if symbol not in {old_contract, new_contract}:
            continue
        try:
            ts = parse_datetime_et(str(raw.get(ts_field) or "")).replace(tzinfo=None)
            volume = int(float(str(raw.get(volume_field) or "0").strip()))
        except Exception as exc:
            raise ValueError(f"{path}:{index}: {exc}") from exc
        rows.append({"source_symbol": symbol, "ts": ts, "volume": max(0, volume)})
    return pd.DataFrame(rows, columns=["source_symbol", "ts", "volume"])


def aggregate_daily_volume(rows: pd.DataFrame, old_contract: str, new_contract: str) -> list[DailyVolume]:
    if rows.empty:
        return []
    working = rows.copy()
    working["date"] = pd.to_datetime(working["ts"]).dt.strftime("%Y-%m-%d")
    grouped = (
        working.groupby(["date", "source_symbol"], sort=True)["volume"]
        .sum()
        .reset_index()
    )
    pivot = grouped.pivot(index="date", columns="source_symbol", values="volume").fillna(0)
    output: list[DailyVolume] = []
    for day in sorted(pivot.index):
        old_volume = int(pivot.at[day, old_contract]) if old_contract in pivot.columns else 0
        new_volume = int(pivot.at[day, new_contract]) if new_contract in pivot.columns else 0
        if new_volume > old_volume:
            winner = "new"
        elif old_volume > new_volume:
            winner = "old"
        elif old_volume or new_volume:
            winner = "tie"
        else:
            winner = "none"
        ratio = None if old_volume == 0 else new_volume / old_volume
        output.append(DailyVolume(day, old_volume, new_volume, winner, ratio))
    return output


def first_new_overtake(daily: list[DailyVolume]) -> str | None:
    for row in daily:
        if row.winner == "new":
            return row.date
    return None


def first_consecutive_new_dominance(daily: list[DailyVolume], min_days: int) -> str | None:
    required = max(1, min_days)
    streak: list[str] = []
    for row in daily:
        if row.winner == "new":
            streak.append(row.date)
            if len(streak) >= required:
                return streak[0]
        else:
            streak = []
    return None


def print_daily_table(daily: list[DailyVolume], old_contract: str, new_contract: str, show_empty: bool) -> None:
    print("\ndaily volume")
    print("date old_contract old_volume new_contract new_volume winner new_old_ratio")
    for row in daily:
        if row.winner == "none" and not show_empty:
            continue
        ratio = "n/a" if row.new_old_ratio is None else f"{row.new_old_ratio:.4f}"
        print(
            f"{row.date} {old_contract} {row.old_volume} "
            f"{new_contract} {row.new_volume} {row.winner} {ratio}"
        )


def print_summary(args: argparse.Namespace, daily: list[DailyVolume]) -> None:
    overtake = first_new_overtake(daily)
    consecutive = first_consecutive_new_dominance(daily, args.min_consecutive_days)
    old_total = sum(row.old_volume for row in daily)
    new_total = sum(row.new_volume for row in daily)
    print("\nroll volume candidate summary")
    print(f"instrument: {args.instrument}")
    print(f"old_contract: {args.old_contract}")
    print(f"new_contract: {args.new_contract}")
    print(f"start: {args.start}")
    print(f"end: {args.end}")
    print(f"days: {len(daily)}")
    print(f"old_total_volume: {old_total}")
    print(f"new_total_volume: {new_total}")
    print(f"first_new_overtake_date: {overtake or 'n/a'}")
    print(f"min_consecutive_new_days: {max(1, args.min_consecutive_days)}")
    print(f"first_consecutive_new_dominance_date: {consecutive or 'n/a'}")
    candidate = consecutive or overtake
    print(f"candidate_roll_date: {candidate or 'n/a'}")
    if candidate:
        print("candidate_status: manual confirmation required")
    else:
        print("candidate_status: no new-contract dominance detected")


def main() -> int:
    args = parse_args()
    try:
        if args.source_file:
            rows = read_source_file(Path(args.source_file).expanduser().resolve(), args.old_contract, args.new_contract)
        else:
            rows = download_databento_rows(args)
        daily = aggregate_daily_volume(rows, args.old_contract, args.new_contract)
    except Exception as exc:
        print("scan_status: failed")
        print(f"error: {exc}")
        return 1

    print("scan_status: ok")
    print(f"source: {args.source_file or f'{args.dataset}/{args.schema}'}")
    print_daily_table(daily, args.old_contract, args.new_contract, args.show_empty_days)
    print_summary(args, daily)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
