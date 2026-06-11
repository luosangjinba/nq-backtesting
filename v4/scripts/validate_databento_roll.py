#!/usr/bin/env python3
"""Read-only Databento continuous-roll validation for V4 futures data.

The V4 database stores continuous `ES` and `NQ` instruments. This script checks
whether Databento continuous symbols match the current DB around rollover
windows by comparing:

- Databento calendar continuous: ES.c.0 / NQ.c.0
- Databento volume continuous: ES.v.0 / NQ.v.0
- Old raw quarterly contract
- New raw quarterly contract

It never writes to DuckDB.
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
class SourceSpec:
    label: str
    instrument: str
    symbol: str
    stype_in: str


@dataclass(frozen=True)
class RollWindow:
    label: str
    start: str
    end: str
    sources: tuple[SourceSpec, ...]


DEFAULT_WINDOWS = (
    RollWindow(
        label="2025-03 H-to-M",
        start="2025-03-10T00:00:00",
        end="2025-03-18T00:00:00",
        sources=(
            SourceSpec("ES calendar continuous", "ES", "ES.c.0", "continuous"),
            SourceSpec("ES volume continuous", "ES", "ES.v.0", "continuous"),
            SourceSpec("ES old raw ESH5", "ES", "ESH5", "raw_symbol"),
            SourceSpec("ES new raw ESM5", "ES", "ESM5", "raw_symbol"),
            SourceSpec("NQ calendar continuous", "NQ", "NQ.c.0", "continuous"),
            SourceSpec("NQ volume continuous", "NQ", "NQ.v.0", "continuous"),
            SourceSpec("NQ old raw NQH5", "NQ", "NQH5", "raw_symbol"),
            SourceSpec("NQ new raw NQM5", "NQ", "NQM5", "raw_symbol"),
        ),
    ),
    RollWindow(
        label="2025-06 M-to-U",
        start="2025-06-09T00:00:00",
        end="2025-06-17T00:00:00",
        sources=(
            SourceSpec("ES calendar continuous", "ES", "ES.c.0", "continuous"),
            SourceSpec("ES volume continuous", "ES", "ES.v.0", "continuous"),
            SourceSpec("ES old raw ESM5", "ES", "ESM5", "raw_symbol"),
            SourceSpec("ES new raw ESU5", "ES", "ESU5", "raw_symbol"),
            SourceSpec("NQ calendar continuous", "NQ", "NQ.c.0", "continuous"),
            SourceSpec("NQ volume continuous", "NQ", "NQ.v.0", "continuous"),
            SourceSpec("NQ old raw NQM5", "NQ", "NQM5", "raw_symbol"),
            SourceSpec("NQ new raw NQU5", "NQ", "NQU5", "raw_symbol"),
        ),
    ),
    RollWindow(
        label="2025-09 U-to-Z",
        start="2025-09-08T00:00:00",
        end="2025-09-16T00:00:00",
        sources=(
            SourceSpec("ES calendar continuous", "ES", "ES.c.0", "continuous"),
            SourceSpec("ES volume continuous", "ES", "ES.v.0", "continuous"),
            SourceSpec("ES old raw ESU5", "ES", "ESU5", "raw_symbol"),
            SourceSpec("ES new raw ESZ5", "ES", "ESZ5", "raw_symbol"),
            SourceSpec("NQ calendar continuous", "NQ", "NQ.c.0", "continuous"),
            SourceSpec("NQ volume continuous", "NQ", "NQ.v.0", "continuous"),
            SourceSpec("NQ old raw NQU5", "NQ", "NQU5", "raw_symbol"),
            SourceSpec("NQ new raw NQZ5", "NQ", "NQZ5", "raw_symbol"),
        ),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Databento continuous roll behavior against V4 DB.")
    parser.add_argument("--dataset", default="GLBX.MDP3", help="Databento dataset, default GLBX.MDP3.")
    parser.add_argument("--schema", default="ohlcv-1m", help="Databento schema, default ohlcv-1m.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path, default v4/data/trading_data.duckdb.")
    parser.add_argument(
        "--window",
        action="append",
        choices=[window.label for window in DEFAULT_WINDOWS],
        help="Rollover window label to run. Repeat for multiple. Defaults to all preset windows.",
    )
    parser.add_argument("--show-daily", action="store_true", help="Print daily best-source breakdown.")
    return parser.parse_args()


def selected_windows(labels: list[str] | None) -> list[RollWindow]:
    if not labels:
        return list(DEFAULT_WINDOWS)
    wanted = set(labels)
    return [window for window in DEFAULT_WINDOWS if window.label in wanted]


def download_source(client: db.Historical, dataset: str, schema: str, window: RollWindow, source: SourceSpec) -> pd.DataFrame:
    data = client.timeseries.get_range(
        dataset=dataset,
        symbols=[source.symbol],
        schema=schema,
        start=window.start,
        end=window.end,
        stype_in=source.stype_in,
    )
    raw = data.to_df()
    if raw.empty:
        return pd.DataFrame(columns=["instrument", "source_label", "source_symbol", "ts", *OHLC_COLUMNS, "volume"])
    index = raw.index
    if index.tz is None:
        localized = index.tz_localize("UTC").tz_convert(ET)
    else:
        localized = index.tz_convert(ET)
    normalized = pd.DataFrame({
        "instrument": source.instrument,
        "source_label": source.label,
        "source_symbol": source.symbol,
        "ts": localized.tz_localize(None),
        "open": pd.to_numeric(raw["open"], errors="coerce"),
        "high": pd.to_numeric(raw["high"], errors="coerce"),
        "low": pd.to_numeric(raw["low"], errors="coerce"),
        "close": pd.to_numeric(raw["close"], errors="coerce"),
        "volume": pd.to_numeric(raw["volume"], errors="coerce").astype("Int64"),
    })
    normalized = normalized.dropna(subset=OHLC_COLUMNS)
    normalized = normalized.drop_duplicates(subset=["instrument", "source_label", "ts"], keep="last")
    return normalized.sort_values(["instrument", "source_label", "ts"]).reset_index(drop=True)


def load_db_rows(db_path: Path, instrument: str, start_ts: datetime, end_ts: datetime) -> pd.DataFrame:
    query = """
select instrument, ts, open, high, low, close, volume
from futures_1m
where instrument = ?
  and ts >= ?
  and ts < ?
order by ts
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        return conn.execute(query, [instrument, start_ts, end_ts]).fetchdf()


def score_rows(db_path: Path, window: RollWindow, source: SourceSpec, rows: pd.DataFrame) -> dict[str, object]:
    if rows.empty:
        return {
            "window": window.label,
            "instrument": source.instrument,
            "source": source.label,
            "symbol": source.symbol,
            "rows": 0,
            "overlap": 0,
            "missing_in_source": 0,
            "missing_in_db": 0,
            "mean_ohlc_abs_diff": None,
            "max_ohlc_abs_diff": None,
            "mean_volume_abs_diff": None,
            "max_volume_abs_diff": None,
        }
    start_ts = pd.Timestamp(rows["ts"].min()).to_pydatetime()
    end_ts = pd.Timestamp(rows["ts"].max()).to_pydatetime()
    db_rows = load_db_rows(db_path, source.instrument, start_ts, end_ts)
    left = rows[["instrument", "ts", *OHLC_COLUMNS, "volume"]].copy()
    right = db_rows.copy()
    left["ts"] = pd.to_datetime(left["ts"])
    right["ts"] = pd.to_datetime(right["ts"])
    merged = left.merge(right, on=["instrument", "ts"], how="outer", suffixes=("_source", "_db"), indicator=True)
    both = merged[merged["_merge"] == "both"].copy()
    if both.empty:
        return {
            "window": window.label,
            "instrument": source.instrument,
            "source": source.label,
            "symbol": source.symbol,
            "rows": len(rows),
            "overlap": 0,
            "missing_in_source": int((merged["_merge"] == "right_only").sum()),
            "missing_in_db": int((merged["_merge"] == "left_only").sum()),
            "mean_ohlc_abs_diff": None,
            "max_ohlc_abs_diff": None,
            "mean_volume_abs_diff": None,
            "max_volume_abs_diff": None,
        }
    for column in OHLC_COLUMNS:
        both[f"{column}_abs_diff"] = (
            pd.to_numeric(both[f"{column}_source"], errors="coerce")
            - pd.to_numeric(both[f"{column}_db"], errors="coerce")
        ).abs()
    both["max_ohlc_abs_diff"] = both[[f"{column}_abs_diff" for column in OHLC_COLUMNS]].max(axis=1)
    both["volume_abs_diff"] = (
        pd.to_numeric(both["volume_source"], errors="coerce")
        - pd.to_numeric(both["volume_db"], errors="coerce")
    ).abs()
    return {
        "window": window.label,
        "instrument": source.instrument,
        "source": source.label,
        "symbol": source.symbol,
        "rows": len(rows),
        "overlap": len(both),
        "missing_in_source": int((merged["_merge"] == "right_only").sum()),
        "missing_in_db": int((merged["_merge"] == "left_only").sum()),
        "mean_ohlc_abs_diff": float(both["max_ohlc_abs_diff"].mean()),
        "max_ohlc_abs_diff": float(both["max_ohlc_abs_diff"].max()),
        "mean_volume_abs_diff": float(both["volume_abs_diff"].mean()),
        "max_volume_abs_diff": float(both["volume_abs_diff"].max()),
    }


def score_source(db_path: Path, window: RollWindow, source: SourceSpec, rows: pd.DataFrame) -> dict[str, object]:
    return score_rows(db_path, window, source, rows)


def score_source_by_day(db_path: Path, window: RollWindow, source: SourceSpec, rows: pd.DataFrame) -> list[dict[str, object]]:
    if rows.empty:
        return []
    day_rows = rows.copy()
    day_rows["date"] = pd.to_datetime(day_rows["ts"]).dt.strftime("%Y-%m-%d")
    output: list[dict[str, object]] = []
    for day, group in day_rows.groupby("date", sort=True):
        score = score_rows(db_path, window, source, group.drop(columns=["date"]))
        score["date"] = day
        output.append(score)
    return output


def print_window_summary(results: pd.DataFrame, daily_results: pd.DataFrame, show_daily: bool) -> None:
    print("\nroll comparison summary")
    display_columns = [
        "window",
        "instrument",
        "source",
        "symbol",
        "rows",
        "overlap",
        "missing_in_source",
        "missing_in_db",
        "mean_ohlc_abs_diff",
        "max_ohlc_abs_diff",
        "mean_volume_abs_diff",
        "max_volume_abs_diff",
    ]
    print(results[display_columns].to_string(index=False))

    print("\nbest source by window/instrument")
    for (window, instrument), group in results.groupby(["window", "instrument"], sort=False):
        scored = group.dropna(subset=["mean_ohlc_abs_diff"]).sort_values(
            ["mean_ohlc_abs_diff", "max_ohlc_abs_diff", "missing_in_source", "missing_in_db"],
            ascending=[True, True, True, True],
        )
        if scored.empty:
            print(f"{window} {instrument}: no overlap")
            continue
        best = scored.iloc[0]
        print(
            f"{window} {instrument}: {best['source']} ({best['symbol']}) "
            f"mean_ohlc={best['mean_ohlc_abs_diff']:.6f} max_ohlc={best['max_ohlc_abs_diff']:.6f}"
        )

    if show_daily:
        print("\ndaily best source by window/instrument")
        for (window, instrument, day), group in daily_results.groupby(["window", "instrument", "date"], sort=True):
            scored = group.dropna(subset=["mean_ohlc_abs_diff"]).sort_values(
                ["mean_ohlc_abs_diff", "max_ohlc_abs_diff", "missing_in_source", "missing_in_db"],
                ascending=[True, True, True, True],
            )
            if scored.empty:
                continue
            best = scored.iloc[0]
            print(
                f"{window} {instrument} {day}: {best['source']} ({best['symbol']}) "
                f"mean_ohlc={best['mean_ohlc_abs_diff']:.6f} max_ohlc={best['max_ohlc_abs_diff']:.6f} "
                f"overlap={int(best['overlap'])}"
            )


def main() -> None:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    if not db_path.exists():
        raise SystemExit(f"database not found: {db_path}")
    client = db.Historical()
    windows = selected_windows(args.window)
    all_results: list[dict[str, object]] = []
    all_daily_results: list[dict[str, object]] = []
    for window in windows:
        print(f"\n=== {window.label} {window.start} -> {window.end} ===")
        for source in window.sources:
            print(f"downloading {source.label} ({source.symbol}, {source.stype_in})")
            rows = download_source(client, args.dataset, args.schema, window, source)
            all_results.append(score_source(db_path, window, source, rows))
            if args.show_daily:
                all_daily_results.extend(score_source_by_day(db_path, window, source, rows))
    results = pd.DataFrame(all_results)
    daily_results = pd.DataFrame(all_daily_results)
    print_window_summary(results, daily_results, args.show_daily)


if __name__ == "__main__":
    main()
