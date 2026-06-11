#!/usr/bin/env python3
"""Read-only raw-contract roll-calendar validation for V4 futures data.

This validates the path we would actually use for a future updater:

1. Download old/new raw quarterly contracts from Databento.
2. Stitch them with an explicit ET roll date.
3. Normalize to V4's ET-naive timestamp convention.
4. Compare the stitched series against the authoritative DuckDB `futures_1m`.

It never writes to DuckDB.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb
import pandas as pd

try:
    import databento as db
except ImportError as exc:  # pragma: no cover - exercised by CLI environment
    raise SystemExit("Missing dependency: databento. Install with `python3 -m pip install databento`.") from exc


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"
ET = ZoneInfo("America/New_York")
OHLC_COLUMNS = ["open", "high", "low", "close"]


@dataclass(frozen=True)
class CalendarCase:
    label: str
    instrument: str
    old_symbol: str
    new_symbol: str
    roll_date_et: date
    start_utc: str
    end_utc: str


PRESET_CASES = (
    CalendarCase("2025-03 ES H-to-M", "ES", "ESH5", "ESM5", date(2025, 3, 14), "2025-03-10T00:00:00", "2025-03-18T00:00:00"),
    CalendarCase("2025-03 NQ H-to-M", "NQ", "NQH5", "NQM5", date(2025, 3, 14), "2025-03-10T00:00:00", "2025-03-18T00:00:00"),
    CalendarCase("2025-06 ES M-to-U", "ES", "ESM5", "ESU5", date(2025, 6, 13), "2025-06-09T00:00:00", "2025-06-17T00:00:00"),
    CalendarCase("2025-06 NQ M-to-U", "NQ", "NQM5", "NQU5", date(2025, 6, 13), "2025-06-09T00:00:00", "2025-06-17T00:00:00"),
    CalendarCase("2025-09 ES U-to-Z", "ES", "ESU5", "ESZ5", date(2025, 9, 14), "2025-09-08T00:00:00", "2025-09-16T00:00:00"),
    CalendarCase("2025-09 NQ U-to-Z", "NQ", "NQU5", "NQZ5", date(2025, 9, 14), "2025-09-08T00:00:00", "2025-09-16T00:00:00"),
    CalendarCase("2025-12 ES Z-to-H", "ES", "ESZ5", "ESH6", date(2025, 12, 14), "2025-12-08T00:00:00", "2025-12-16T00:00:00"),
    CalendarCase("2025-12 NQ Z-to-H", "NQ", "NQZ5", "NQH6", date(2025, 12, 14), "2025-12-08T00:00:00", "2025-12-16T00:00:00"),
    CalendarCase("2026-03 ES H-to-M", "ES", "ESH6", "ESM6", date(2026, 3, 13), "2026-03-09T00:00:00", "2026-03-17T00:00:00"),
    CalendarCase("2026-03 NQ H-to-M", "NQ", "NQH6", "NQM6", date(2026, 3, 13), "2026-03-09T00:00:00", "2026-03-17T00:00:00"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a raw-contract Databento roll calendar against V4 DB.")
    parser.add_argument("--dataset", default="GLBX.MDP3", help="Databento dataset, default GLBX.MDP3.")
    parser.add_argument("--schema", default="ohlcv-1m", help="Databento schema, default ohlcv-1m.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path, default v4/data/trading_data.duckdb.")
    parser.add_argument(
        "--case",
        action="append",
        choices=[case.label for case in PRESET_CASES],
        help="Preset case label. Repeat for multiple. Defaults to all preset cases.",
    )
    parser.add_argument("--show-daily", action="store_true", help="Print per-ET-date row and diff summary.")
    parser.add_argument("--show-diffs", type=int, default=3, help="Rows with largest OHLC diff to print per case.")
    return parser.parse_args()


def selected_cases(labels: list[str] | None) -> list[CalendarCase]:
    if not labels:
        return list(PRESET_CASES)
    wanted = set(labels)
    return [case for case in PRESET_CASES if case.label in wanted]


def download_raw_pair(client: db.Historical, dataset: str, schema: str, case: CalendarCase) -> pd.DataFrame:
    data = client.timeseries.get_range(
        dataset=dataset,
        symbols=[case.old_symbol, case.new_symbol],
        schema=schema,
        start=case.start_utc,
        end=case.end_utc,
        stype_in="raw_symbol",
    )
    raw = data.to_df()
    if raw.empty:
        return pd.DataFrame(columns=["source_symbol", "ts", *OHLC_COLUMNS, "volume"])
    index = raw.index
    if index.tz is None:
        localized = index.tz_localize("UTC").tz_convert(ET)
    else:
        localized = index.tz_convert(ET)
    normalized = pd.DataFrame({
        "source_symbol": raw["symbol"].astype(str),
        "ts": localized.tz_localize(None),
        "open": pd.to_numeric(raw["open"], errors="coerce"),
        "high": pd.to_numeric(raw["high"], errors="coerce"),
        "low": pd.to_numeric(raw["low"], errors="coerce"),
        "close": pd.to_numeric(raw["close"], errors="coerce"),
        "volume": pd.to_numeric(raw["volume"], errors="coerce").astype("Int64"),
    })
    normalized = normalized.dropna(subset=OHLC_COLUMNS)
    return normalized.sort_values(["source_symbol", "ts"]).reset_index(drop=True)


def stitch_case(case: CalendarCase, raw: pd.DataFrame) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=["instrument", "ts", *OHLC_COLUMNS, "volume", "source_symbol"])
    rows = raw.copy()
    dates = pd.to_datetime(rows["ts"]).dt.date
    old_rows = rows[(rows["source_symbol"] == case.old_symbol) & (dates < case.roll_date_et)]
    new_rows = rows[(rows["source_symbol"] == case.new_symbol) & (dates >= case.roll_date_et)]
    stitched = pd.concat([old_rows, new_rows], ignore_index=True)
    stitched.insert(0, "instrument", case.instrument)
    stitched = stitched.drop_duplicates(subset=["instrument", "ts"], keep="last")
    return stitched.sort_values(["instrument", "ts"]).reset_index(drop=True)


def load_db_rows(db_path: Path, case: CalendarCase, start_ts: datetime, end_ts: datetime) -> pd.DataFrame:
    query = """
select instrument, ts, open, high, low, close, volume
from futures_1m
where instrument = ?
  and ts >= ?
  and ts <= ?
order by ts
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        return conn.execute(query, [case.instrument, start_ts, end_ts]).fetchdf()


def compare_case(db_path: Path, case: CalendarCase, stitched: pd.DataFrame, show_diffs: int) -> tuple[dict[str, object], pd.DataFrame]:
    if stitched.empty:
        summary = {
            "case": case.label,
            "instrument": case.instrument,
            "old": case.old_symbol,
            "new": case.new_symbol,
            "roll_date_et": case.roll_date_et.isoformat(),
            "stitched_rows": 0,
            "db_rows": 0,
            "overlap": 0,
            "missing_in_stitched": 0,
            "missing_in_db": 0,
            "max_ohlc_abs_diff": None,
            "mean_ohlc_abs_diff": None,
            "max_volume_abs_diff": None,
            "duplicate_keys": 0,
        }
        return summary, pd.DataFrame()
    start_ts = pd.Timestamp(stitched["ts"].min()).to_pydatetime()
    end_ts = pd.Timestamp(stitched["ts"].max()).to_pydatetime()
    db_rows = load_db_rows(db_path, case, start_ts, end_ts)
    left = stitched[["instrument", "ts", *OHLC_COLUMNS, "volume", "source_symbol"]].copy()
    right = db_rows.copy()
    left["ts"] = pd.to_datetime(left["ts"])
    right["ts"] = pd.to_datetime(right["ts"])
    merged = left.merge(right, on=["instrument", "ts"], how="outer", suffixes=("_stitched", "_db"), indicator=True)
    both = merged[merged["_merge"] == "both"].copy()
    for column in OHLC_COLUMNS:
        both[f"{column}_abs_diff"] = (
            pd.to_numeric(both[f"{column}_stitched"], errors="coerce")
            - pd.to_numeric(both[f"{column}_db"], errors="coerce")
        ).abs()
    if not both.empty:
        both["max_ohlc_abs_diff"] = both[[f"{column}_abs_diff" for column in OHLC_COLUMNS]].max(axis=1)
        both["volume_abs_diff"] = (
            pd.to_numeric(both["volume_stitched"], errors="coerce")
            - pd.to_numeric(both["volume_db"], errors="coerce")
        ).abs()
    duplicate_keys = int(stitched.duplicated(subset=["instrument", "ts"]).sum())
    summary = {
        "case": case.label,
        "instrument": case.instrument,
        "old": case.old_symbol,
        "new": case.new_symbol,
        "roll_date_et": case.roll_date_et.isoformat(),
        "stitched_rows": len(stitched),
        "db_rows": len(db_rows),
        "overlap": len(both),
        "missing_in_stitched": int((merged["_merge"] == "right_only").sum()),
        "missing_in_db": int((merged["_merge"] == "left_only").sum()),
        "max_ohlc_abs_diff": None if both.empty else float(both["max_ohlc_abs_diff"].max()),
        "mean_ohlc_abs_diff": None if both.empty else float(both["max_ohlc_abs_diff"].mean()),
        "max_volume_abs_diff": None if both.empty else float(both["volume_abs_diff"].max()),
        "duplicate_keys": duplicate_keys,
    }
    if show_diffs > 0 and not both.empty:
        largest = both.sort_values("max_ohlc_abs_diff", ascending=False).head(show_diffs)
        print(f"\n{case.label} largest OHLC diffs")
        print(largest[[
            "ts",
            "source_symbol",
            "open_stitched",
            "open_db",
            "high_stitched",
            "high_db",
            "low_stitched",
            "low_db",
            "close_stitched",
            "close_db",
            "volume_stitched",
            "volume_db",
            "max_ohlc_abs_diff",
        ]].to_string(index=False))
    return summary, merged


def daily_summary(case: CalendarCase, merged: pd.DataFrame) -> pd.DataFrame:
    if merged.empty:
        return pd.DataFrame()
    rows = merged.copy()
    rows["date"] = pd.to_datetime(rows["ts"]).dt.strftime("%Y-%m-%d")
    output = []
    for day, group in rows.groupby("date", sort=True):
        both = group[group["_merge"] == "both"].copy()
        if not both.empty and "max_ohlc_abs_diff" not in both.columns:
            for column in OHLC_COLUMNS:
                both[f"{column}_abs_diff"] = (
                    pd.to_numeric(both[f"{column}_stitched"], errors="coerce")
                    - pd.to_numeric(both[f"{column}_db"], errors="coerce")
                ).abs()
            both["max_ohlc_abs_diff"] = both[[f"{column}_abs_diff" for column in OHLC_COLUMNS]].max(axis=1)
        source_symbols = sorted(str(value) for value in group["source_symbol"].dropna().unique())
        output.append({
            "case": case.label,
            "date": day,
            "source_symbols": ",".join(source_symbols),
            "overlap": int((group["_merge"] == "both").sum()),
            "missing_in_stitched": int((group["_merge"] == "right_only").sum()),
            "missing_in_db": int((group["_merge"] == "left_only").sum()),
            "max_ohlc_abs_diff": None if both.empty else float(both["max_ohlc_abs_diff"].max()),
            "mean_ohlc_abs_diff": None if both.empty else float(both["max_ohlc_abs_diff"].mean()),
        })
    return pd.DataFrame(output)


def main() -> None:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    if not db_path.exists():
        raise SystemExit(f"database not found: {db_path}")
    client = db.Historical()
    summaries = []
    daily_frames = []
    for case in selected_cases(args.case):
        print(f"\n=== {case.label} old={case.old_symbol} new={case.new_symbol} roll_date_et={case.roll_date_et} ===")
        raw = download_raw_pair(client, args.dataset, args.schema, case)
        print(f"raw rows: {len(raw)}")
        stitched = stitch_case(case, raw)
        print(f"stitched rows: {len(stitched)}")
        summary, merged = compare_case(db_path, case, stitched, args.show_diffs)
        summaries.append(summary)
        if args.show_daily:
            daily = daily_summary(case, merged)
            if not daily.empty:
                daily_frames.append(daily)

    summary_df = pd.DataFrame(summaries)
    print("\nraw roll-calendar validation summary")
    print(summary_df.to_string(index=False))
    if args.show_daily and daily_frames:
        print("\ndaily raw roll-calendar validation")
        print(pd.concat(daily_frames, ignore_index=True).to_string(index=False))


if __name__ == "__main__":
    main()
