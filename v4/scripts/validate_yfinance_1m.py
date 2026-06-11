#!/usr/bin/env python3
"""Dry-run yfinance 1m validation for V4 futures data.

This script never writes to the production table. It downloads a small Yahoo
Finance 1m sample, normalizes timestamps to V4's ET-naive convention, and can
compare overlap against the local DuckDB `futures_1m` table.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo

import duckdb
import pandas as pd

try:
    import yfinance as yf
except ImportError as exc:  # pragma: no cover - exercised by CLI environment
    raise SystemExit("Missing dependency: yfinance. Install with `python3 -m pip install yfinance`.") from exc


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"
ET = ZoneInfo("America/New_York")
OHLC_COLUMNS = ["open", "high", "low", "close"]


@dataclass(frozen=True)
class SymbolSpec:
    yahoo: str
    instrument: str


def parse_symbol(value: str) -> SymbolSpec:
    text = value.strip()
    if not text:
        raise argparse.ArgumentTypeError("symbol cannot be empty")
    if ":" in text:
        yahoo, instrument = [part.strip() for part in text.split(":", 1)]
    else:
        yahoo = text
        instrument = text.replace("=F", "").upper()
    if not yahoo or not instrument:
        raise argparse.ArgumentTypeError("symbol must look like NQ=F:NQ")
    return SymbolSpec(yahoo=yahoo, instrument=instrument.upper())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate yfinance 1m data against the V4 DuckDB schema.")
    parser.add_argument(
        "--symbol",
        action="append",
        type=parse_symbol,
        required=True,
        help="Yahoo/internal symbol mapping, for example ES=F:ES. Repeat for multiple symbols.",
    )
    parser.add_argument("--period", default="5d", help="yfinance period, default 5d.")
    parser.add_argument("--date", help="Specific ET date to download/compare as YYYY-MM-DD.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path, default v4/data/trading_data.duckdb.")
    parser.add_argument("--compare-db", action="store_true", help="Compare downloaded rows against futures_1m.")
    parser.add_argument("--prepost", action=argparse.BooleanOptionalAction, default=True, help="Pass prepost to yfinance.")
    parser.add_argument("--show-sample", type=int, default=3, help="Number of normalized sample rows to print.")
    parser.add_argument("--show-diffs", type=int, default=5, help="Number of largest OHLC overlap diffs to print.")
    parser.add_argument("--allow-empty", action="store_true", help="Treat empty downloads as successful diagnostics.")
    return parser.parse_args()


def resolve_download_window(day_text: str | None) -> tuple[str | None, str | None]:
    if not day_text:
        return None, None
    day = date.fromisoformat(day_text)
    start_dt = datetime.combine(day, time.min)
    # yfinance end is exclusive.
    end_dt = start_dt + timedelta(days=1)
    return start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")


def flatten_download_frame(frame: pd.DataFrame, yahoo_symbol: str) -> pd.DataFrame:
    if frame.empty:
        return frame
    if isinstance(frame.columns, pd.MultiIndex):
        if yahoo_symbol in frame.columns.get_level_values(0):
            frame = frame[yahoo_symbol]
        elif yahoo_symbol in frame.columns.get_level_values(-1):
            frame = frame.xs(yahoo_symbol, axis=1, level=-1)
        else:
            raise ValueError(f"cannot find {yahoo_symbol} in downloaded columns")
    return frame.copy()


def download_symbol(spec: SymbolSpec, period: str, day_text: str | None, prepost: bool) -> pd.DataFrame:
    start, end = resolve_download_window(day_text)
    kwargs = {
        "tickers": spec.yahoo,
        "interval": "1m",
        "auto_adjust": False,
        "prepost": prepost,
        "keepna": False,
        "progress": False,
        "group_by": "ticker",
        "threads": False,
    }
    if start and end:
        kwargs.update({"start": start, "end": end})
    else:
        kwargs.update({"period": period})
    raw = yf.download(**kwargs)
    return flatten_download_frame(raw, spec.yahoo)


def normalize_frame(frame: pd.DataFrame, spec: SymbolSpec) -> pd.DataFrame:
    if frame.empty:
        return pd.DataFrame(columns=["instrument", "ts", "open", "high", "low", "close", "volume"])

    normalized = frame.rename(columns={column: str(column).strip().lower().replace(" ", "_") for column in frame.columns})
    rename_map = {
        "adj_close": "adj_close",
    }
    normalized = normalized.rename(columns=rename_map)

    required = ["open", "high", "low", "close"]
    missing = [column for column in required if column not in normalized.columns]
    if missing:
        raise ValueError(f"downloaded data missing columns: {', '.join(missing)}")
    if "volume" not in normalized.columns:
        normalized["volume"] = pd.NA

    index = normalized.index
    if index.tz is None:
        localized = index.tz_localize(ET)
    else:
        localized = index.tz_convert(ET)

    output = pd.DataFrame({
        "instrument": spec.instrument,
        "ts": localized.tz_localize(None),
        "open": pd.to_numeric(normalized["open"], errors="coerce"),
        "high": pd.to_numeric(normalized["high"], errors="coerce"),
        "low": pd.to_numeric(normalized["low"], errors="coerce"),
        "close": pd.to_numeric(normalized["close"], errors="coerce"),
        "volume": pd.to_numeric(normalized["volume"], errors="coerce").astype("Int64"),
    })
    output = output.dropna(subset=OHLC_COLUMNS)
    output = output.drop_duplicates(subset=["instrument", "ts"], keep="last")
    output = output.sort_values(["instrument", "ts"]).reset_index(drop=True)
    return output


def format_ts(value: object) -> str:
    if pd.isna(value):
        return "-"
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)


def print_raw_summary(spec: SymbolSpec, raw: pd.DataFrame) -> None:
    print(f"\n[{spec.yahoo} -> {spec.instrument}] raw")
    print(f"rows: {len(raw)}")
    print(f"columns: {list(raw.columns)}")
    tz = getattr(raw.index, "tz", None)
    print(f"index timezone: {tz}")
    if len(raw.index):
        print(f"first raw ts: {raw.index[0]}")
        print(f"last raw ts:  {raw.index[-1]}")
    lower_columns = {str(column).lower(): column for column in raw.columns}
    null_counts = {}
    for column in ["open", "high", "low", "close", "volume"]:
        source = lower_columns.get(column)
        if source is not None:
            null_counts[column] = int(raw[source].isna().sum())
    print(f"null counts: {null_counts}")


def print_normalized_summary(spec: SymbolSpec, normalized: pd.DataFrame, sample_count: int) -> None:
    print(f"[{spec.instrument}] normalized")
    print(f"rows: {len(normalized)}")
    if normalized.empty:
        return
    print(f"first db ts: {format_ts(normalized['ts'].iloc[0])}")
    print(f"last db ts:  {format_ts(normalized['ts'].iloc[-1])}")
    duplicate_count = int(normalized.duplicated(subset=["instrument", "ts"]).sum())
    print(f"duplicate keys: {duplicate_count}")
    session_1700 = normalized[pd.to_datetime(normalized["ts"]).dt.strftime("%H:%M") == "17:00"]
    print(f"17:00 rows: {len(session_1700)}")
    if sample_count > 0:
        print("sample:")
        print(normalized.head(sample_count).to_string(index=False))


def load_db_overlap(db_path: Path, instrument: str, start_ts: datetime, end_ts: datetime) -> pd.DataFrame:
    if not db_path.exists():
        raise FileNotFoundError(f"database not found: {db_path}")
    query = """
select instrument, ts, open, high, low, close, volume
from futures_1m
where instrument = ?
  and ts >= ?
  and ts <= ?
order by ts
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        return conn.execute(query, [instrument, start_ts, end_ts]).fetchdf()


def compare_to_db(db_path: Path, spec: SymbolSpec, normalized: pd.DataFrame) -> None:
    print(f"[{spec.instrument}] db comparison")
    if normalized.empty:
        print("skipped: no downloaded rows")
        return
    start_ts = pd.Timestamp(normalized["ts"].min()).to_pydatetime()
    end_ts = pd.Timestamp(normalized["ts"].max()).to_pydatetime()
    db_rows = load_db_overlap(db_path, spec.instrument, start_ts, end_ts)
    print(f"db rows in range: {len(db_rows)}")
    if db_rows.empty:
        print("overlap rows: 0")
        print(f"insert-only candidate rows: {len(normalized)}")
        print("existing rows preserved: 0")
        return

    left = normalized.copy()
    right = db_rows.copy()
    left["ts"] = pd.to_datetime(left["ts"])
    right["ts"] = pd.to_datetime(right["ts"])
    merged = left.merge(
        right,
        on=["instrument", "ts"],
        how="outer",
        suffixes=("_yf", "_db"),
        indicator=True,
    )
    both = merged[merged["_merge"] == "both"].copy()
    left_only = merged[merged["_merge"] == "left_only"]
    right_only = merged[merged["_merge"] == "right_only"]

    print(f"overlap rows: {len(both)}")
    print(f"missing in yahoo: {len(right_only)}")
    print(f"missing in db: {len(left_only)}")
    print(f"insert-only candidate rows: {len(left_only)}")
    print(f"existing rows preserved: {len(both)}")

    if both.empty:
        return
    diff_columns = []
    for column in OHLC_COLUMNS:
        diff_column = f"{column}_diff"
        both.loc[:, diff_column] = (both[f"{column}_yf"] - both[f"{column}_db"]).abs()
        diff = both[diff_column]
        diff_columns.append(diff_column)
        print(f"max {column} diff: {diff.max()}")
    if "volume_yf" in both.columns and "volume_db" in both.columns:
        volume_diff = (both["volume_yf"].astype("float64") - both["volume_db"].astype("float64")).abs()
        print(f"max volume diff: {volume_diff.max()}")

    show_diffs = getattr(compare_to_db, "show_diffs", 5)
    if show_diffs > 0 and diff_columns:
        diff_view = both.copy()
        diff_view["max_ohlc_diff"] = diff_view[diff_columns].max(axis=1)
        diff_view = diff_view.sort_values(["max_ohlc_diff", "ts"], ascending=[False, True])
        diff_view = diff_view[diff_view["max_ohlc_diff"] > 0]
        if not diff_view.empty:
            columns = [
                "ts",
                "open_yf",
                "open_db",
                "high_yf",
                "high_db",
                "low_yf",
                "low_db",
                "close_yf",
                "close_db",
                "max_ohlc_diff",
            ]
            print("largest OHLC diffs:")
            print(diff_view[columns].head(show_diffs).to_string(index=False))


def validate_symbols(symbols: Iterable[SymbolSpec], args: argparse.Namespace) -> int:
    db_path = Path(args.db)
    failures = 0
    for spec in symbols:
        try:
            raw = download_symbol(spec, args.period, args.date, args.prepost)
            print_raw_summary(spec, raw)
            normalized = normalize_frame(raw, spec)
            print_normalized_summary(spec, normalized, args.show_sample)
            if normalized.empty and not args.allow_empty:
                raise ValueError("download returned no normalized rows")
            if args.compare_db:
                compare_to_db.show_diffs = args.show_diffs
                compare_to_db(db_path, spec, normalized)
        except Exception as exc:  # pragma: no cover - CLI diagnostics
            failures += 1
            print(f"\n[{spec.yahoo} -> {spec.instrument}] ERROR: {exc}", file=sys.stderr)
    return failures


def main() -> int:
    args = parse_args()
    failures = validate_symbols(args.symbol, args)
    if failures:
        print(f"\nvalidation completed with {failures} failure(s)", file=sys.stderr)
        return 1
    print("\nvalidation completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
