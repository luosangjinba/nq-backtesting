#!/usr/bin/env python3
"""Read-only Databento 1m validation for V4 futures data.

This script never writes to DuckDB. It checks GLBX.MDP3 pricing/availability,
estimates request cost, optionally downloads a small OHLCV-1m sample, normalizes
timestamps to V4's ET-naive convention, and compares overlap against
`futures_1m`.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
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
class SymbolSpec:
    databento: str
    instrument: str


def parse_symbol(value: str) -> SymbolSpec:
    text = value.strip()
    if not text:
        raise argparse.ArgumentTypeError("symbol cannot be empty")
    if ":" in text:
        databento_symbol, instrument = [part.strip() for part in text.split(":", 1)]
    else:
        databento_symbol = text
        instrument = text[:2].upper()
    if not databento_symbol or not instrument:
        raise argparse.ArgumentTypeError("symbol must look like ESM5:ES")
    return SymbolSpec(databento=databento_symbol, instrument=instrument.upper())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Databento GLBX.MDP3 OHLCV-1m data for V4.")
    parser.add_argument("--dataset", default="GLBX.MDP3", help="Databento dataset, default GLBX.MDP3.")
    parser.add_argument("--schema", default="ohlcv-1m", help="Databento schema, default ohlcv-1m.")
    parser.add_argument(
        "--symbol",
        action="append",
        type=parse_symbol,
        default=[],
        help="Databento/internal symbol mapping, for example ESM5:ES. Repeat for multiple symbols.",
    )
    parser.add_argument("--start", default="2025-06-02T00:00:00", help="Request start, assumed UTC if no timezone.")
    parser.add_argument("--end", default="2025-06-03T00:00:00", help="Request end, assumed UTC if no timezone.")
    parser.add_argument("--stype-in", default="raw_symbol", help="Databento input symbology, default raw_symbol.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path, default v4/data/trading_data.duckdb.")
    parser.add_argument("--download-sample", action="store_true", help="Download the requested sample.")
    parser.add_argument("--compare-db", action="store_true", help="Compare downloaded rows against futures_1m.")
    parser.add_argument("--show-sample", type=int, default=3, help="Number of normalized sample rows to print.")
    parser.add_argument("--show-diffs", type=int, default=5, help="Number of largest OHLC overlap diffs to print.")
    return parser.parse_args()


def default_symbols(symbols: list[SymbolSpec]) -> list[SymbolSpec]:
    return symbols or [SymbolSpec("ESM5", "ES"), SymbolSpec("NQM5", "NQ")]


def make_client() -> db.Historical:
    return db.Historical()


def print_unit_prices(client: db.Historical, dataset: str, schema: str) -> None:
    print(f"\n[{dataset}] unit prices")
    for row in client.metadata.list_unit_prices(dataset=dataset):
        mode = row.get("mode")
        prices = row.get("unit_prices", {})
        selected = prices.get(schema)
        print(f"{mode}: {schema}={selected} USD/GB")


def print_dataset_range(client: db.Historical, dataset: str, schema: str) -> None:
    print(f"\n[{dataset}] available range")
    available = client.metadata.get_dataset_range(dataset=dataset)
    print(f"dataset start: {available.get('start')}")
    print(f"dataset end:   {available.get('end')}")
    schema_range = available.get("schema", {}).get(schema, {})
    if schema_range:
        print(f"{schema} start: {schema_range.get('start')}")
        print(f"{schema} end:   {schema_range.get('end')}")


def estimate_cost(client: db.Historical, args: argparse.Namespace, symbols: list[SymbolSpec]) -> None:
    databento_symbols = [spec.databento for spec in symbols]
    kwargs = {
        "dataset": args.dataset,
        "symbols": databento_symbols,
        "schema": args.schema,
        "start": args.start,
        "end": args.end,
        "stype_in": args.stype_in,
    }
    print(f"\n[{args.dataset}] cost estimate")
    print(f"symbols: {', '.join(databento_symbols)}")
    print(f"window: {args.start} -> {args.end}")
    size = client.metadata.get_billable_size(**kwargs)
    cost = client.metadata.get_cost(**kwargs)
    print(f"billable bytes: {size}")
    print(f"estimated cost USD: {cost}")


def normalize_frame(frame: pd.DataFrame, symbol_map: dict[str, str]) -> pd.DataFrame:
    if frame.empty:
        return pd.DataFrame(columns=["instrument", "ts", "open", "high", "low", "close", "volume", "databento_symbol"])

    required = [*OHLC_COLUMNS, "volume", "symbol"]
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(f"downloaded data missing columns: {', '.join(missing)}")

    index = frame.index
    if index.tz is None:
        localized = index.tz_localize("UTC").tz_convert(ET)
    else:
        localized = index.tz_convert(ET)

    output = pd.DataFrame({
        "instrument": frame["symbol"].map(symbol_map).fillna(frame["symbol"].astype(str).str[:2].str.upper()),
        "ts": localized.tz_localize(None),
        "open": pd.to_numeric(frame["open"], errors="coerce"),
        "high": pd.to_numeric(frame["high"], errors="coerce"),
        "low": pd.to_numeric(frame["low"], errors="coerce"),
        "close": pd.to_numeric(frame["close"], errors="coerce"),
        "volume": pd.to_numeric(frame["volume"], errors="coerce").astype("Int64"),
        "databento_symbol": frame["symbol"].astype(str),
    })
    output = output.dropna(subset=OHLC_COLUMNS)
    output = output.drop_duplicates(subset=["instrument", "ts"], keep="last")
    output = output.sort_values(["instrument", "ts"]).reset_index(drop=True)
    return output


def download_sample(client: db.Historical, args: argparse.Namespace, symbols: list[SymbolSpec]) -> pd.DataFrame:
    databento_symbols = [spec.databento for spec in symbols]
    data = client.timeseries.get_range(
        dataset=args.dataset,
        symbols=databento_symbols,
        schema=args.schema,
        start=args.start,
        end=args.end,
        stype_in=args.stype_in,
    )
    raw = data.to_df()
    print(f"\n[{args.dataset}] downloaded sample")
    print(f"raw rows: {len(raw)}")
    print(f"raw columns: {list(raw.columns)}")
    if len(raw.index):
        print(f"first raw ts: {raw.index[0]}")
        print(f"last raw ts:  {raw.index[-1]}")
    symbol_map = {spec.databento: spec.instrument for spec in symbols}
    normalized = normalize_frame(raw, symbol_map)
    print("\nnormalized sample")
    print(f"rows: {len(normalized)}")
    if not normalized.empty:
        print(f"first db ts: {normalized['ts'].iloc[0]}")
        print(f"last db ts:  {normalized['ts'].iloc[-1]}")
        duplicate_count = int(normalized.duplicated(subset=["instrument", "ts"]).sum())
        print(f"duplicate keys: {duplicate_count}")
        if args.show_sample > 0:
            print(normalized.head(args.show_sample).to_string(index=False))
    return normalized


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


def compare_instrument(db_path: Path, instrument: str, normalized: pd.DataFrame, show_diffs: int) -> None:
    rows = normalized[normalized["instrument"] == instrument].copy()
    print(f"\n[{instrument}] db comparison")
    if rows.empty:
        print("skipped: no downloaded rows")
        return
    start_ts = pd.Timestamp(rows["ts"].min()).to_pydatetime()
    end_ts = pd.Timestamp(rows["ts"].max()).to_pydatetime()
    db_rows = load_db_overlap(db_path, instrument, start_ts, end_ts)
    print(f"download rows: {len(rows)}")
    print(f"db rows in range: {len(db_rows)}")
    if db_rows.empty:
        print(f"insert-only candidate rows: {len(rows)}")
        print("existing rows preserved: 0")
        return

    left = rows.drop(columns=["databento_symbol"], errors="ignore")
    right = db_rows.copy()
    left["ts"] = pd.to_datetime(left["ts"])
    right["ts"] = pd.to_datetime(right["ts"])
    merged = left.merge(right, on=["instrument", "ts"], how="outer", suffixes=("_dbento", "_db"), indicator=True)
    both = merged[merged["_merge"] == "both"].copy()
    only_databento = merged[merged["_merge"] == "left_only"]
    only_db = merged[merged["_merge"] == "right_only"]
    print(f"overlap rows: {len(both)}")
    print(f"missing in databento: {len(only_db)}")
    print(f"missing in db: {len(only_databento)}")
    print(f"insert-only candidate rows: {len(only_databento)}")
    print(f"existing rows preserved: {len(both)}")
    if both.empty:
        return

    diff_columns = []
    for column in [*OHLC_COLUMNS, "volume"]:
        diff_name = f"{column}_abs_diff"
        both[diff_name] = (pd.to_numeric(both[f"{column}_dbento"], errors="coerce") - pd.to_numeric(both[f"{column}_db"], errors="coerce")).abs()
        diff_columns.append(diff_name)
        print(f"max {column} diff: {both[diff_name].max()}")

    both["max_ohlc_abs_diff"] = both[[f"{column}_abs_diff" for column in OHLC_COLUMNS]].max(axis=1)
    if show_diffs > 0:
        largest = both.sort_values("max_ohlc_abs_diff", ascending=False).head(show_diffs)
        columns = [
            "ts",
            "open_dbento",
            "open_db",
            "high_dbento",
            "high_db",
            "low_dbento",
            "low_db",
            "close_dbento",
            "close_db",
            "volume_dbento",
            "volume_db",
            "max_ohlc_abs_diff",
        ]
        print("largest OHLC diffs:")
        print(largest[columns].to_string(index=False))


def compare_to_db(args: argparse.Namespace, symbols: list[SymbolSpec], normalized: pd.DataFrame) -> None:
    db_path = Path(args.db).expanduser().resolve()
    for instrument in sorted({spec.instrument for spec in symbols}):
        compare_instrument(db_path, instrument, normalized, args.show_diffs)


def main() -> None:
    args = parse_args()
    symbols = default_symbols(args.symbol)
    client = make_client()
    print(f"databento version: {getattr(db, '__version__', 'unknown')}")
    print_unit_prices(client, args.dataset, args.schema)
    print_dataset_range(client, args.dataset, args.schema)
    estimate_cost(client, args, symbols)
    if args.download_sample or args.compare_db:
        normalized = download_sample(client, args, symbols)
        if args.compare_db:
            compare_to_db(args, symbols, normalized)


if __name__ == "__main__":
    main()
