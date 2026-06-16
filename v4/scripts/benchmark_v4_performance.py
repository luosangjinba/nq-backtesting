#!/usr/bin/env python3
"""Read-only V4 performance baseline helpers.

This script intentionally does not rewrite, vacuum, index, or mutate the DuckDB
database. It measures current query paths and reports lightweight layout
diagnostics before any optimization work is attempted.
"""

from __future__ import annotations

import argparse
import statistics
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable, Iterable

import duckdb


V4_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = V4_ROOT.parent
sys.path.insert(0, str(V4_ROOT))

import v4_api  # noqa: E402
from server.price_lookup import query_price  # noqa: E402


DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"
DEFAULT_TABLE = "futures_1m"


@dataclass(frozen=True)
class BenchmarkCase:
    name: str
    instrument: str
    tf: int
    start: str
    end: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Path to trading_data.duckdb")
    parser.add_argument("--table", default=DEFAULT_TABLE, help="Bars table name")
    parser.add_argument("--runs", type=int, default=3, help="Repeated timing runs per case")
    parser.add_argument("--instrument", action="append", choices=["NQ", "ES"], help="Instrument(s) to benchmark")
    parser.add_argument("--skip-query", action="store_true", help="Skip query benchmark section")
    parser.add_argument("--skip-layout", action="store_true", help="Skip layout diagnostic section")
    parser.add_argument(
        "--physical-order-scan",
        action="store_true",
        help="Run a full rowid-order inversion scan. This is read-only but can be slower on large DBs.",
    )
    return parser.parse_args()


def fmt_dt(value: datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M")


def get_instrument_ranges(db_path: Path, table: str, instruments: Iterable[str]) -> dict[str, tuple[datetime, datetime]]:
    with duckdb.connect(str(db_path), read_only=True) as conn:
        rows = conn.execute(
            f"""
            select instrument, min(ts), max(ts), count(*)
            from {table}
            where instrument in ({",".join(["?"] * len(list(instruments)))})
            group by instrument
            order by instrument
            """,
            list(instruments),
        ).fetchall()
    return {row[0]: (row[1], row[2]) for row in rows}


def build_cases(db_path: Path, table: str, instruments: list[str]) -> list[BenchmarkCase]:
    ranges = get_instrument_ranges(db_path, table, instruments)
    cases: list[BenchmarkCase] = []
    for instrument in instruments:
        if instrument not in ranges:
            continue
        min_ts, max_ts = ranges[instrument]
        latest_end = max_ts.replace(second=0, microsecond=0)
        one_day_start = max(min_ts, latest_end - timedelta(days=1))
        two_week_start = max(min_ts, latest_end - timedelta(days=14))
        one_year_start = max(min_ts, latest_end - timedelta(days=365))
        cases.extend([
            BenchmarkCase("range_1m_1d", instrument, 1, fmt_dt(one_day_start), fmt_dt(latest_end)),
            BenchmarkCase("aggregate_5m_14d", instrument, 5, fmt_dt(two_week_start), fmt_dt(latest_end)),
            BenchmarkCase("aggregate_1h_365d", instrument, 60, fmt_dt(one_year_start), fmt_dt(latest_end)),
            BenchmarkCase("aggregate_daily_365d", instrument, 1440, fmt_dt(one_year_start), fmt_dt(latest_end)),
        ])
    return cases


def time_call(fn: Callable[[], object], runs: int) -> tuple[list[float], object]:
    timings: list[float] = []
    last_result = None
    for _ in range(max(1, runs)):
        start = time.perf_counter()
        last_result = fn()
        timings.append((time.perf_counter() - start) * 1000)
    return timings, last_result


def print_timing(label: str, timings: list[float], rows: int, extra: str = "") -> None:
    first = timings[0]
    median = statistics.median(timings)
    best = min(timings)
    worst = max(timings)
    suffix = f" {extra}" if extra else ""
    print(
        f"{label}: rows={rows} first_ms={first:.2f} median_ms={median:.2f} "
        f"best_ms={best:.2f} worst_ms={worst:.2f}{suffix}"
    )


def run_query_benchmarks(db_path: Path, table: str, instruments: list[str], runs: int) -> None:
    print("query_benchmark_status: start")
    cases = build_cases(db_path, table, instruments)
    for case in cases:
        timings, result = time_call(
            lambda case=case: v4_api.query_v4_bars(
                str(db_path),
                table,
                case.instrument,
                case.start,
                case.end,
                case.tf,
            ),
            runs,
        )
        print_timing(
            f"query case={case.name} instrument={case.instrument} tf={case.tf} range='{case.start} -> {case.end}'",
            timings,
            len(result or []),
        )

    with duckdb.connect(str(db_path), read_only=True) as conn:
        price_points = conn.execute(
            f"""
            select instrument, max(ts)
            from {table}
            where instrument in ({",".join(["?"] * len(instruments))})
            group by instrument
            order by instrument
            """,
            instruments,
        ).fetchall()
    for instrument, ts in price_points:
        timestamp = int(ts.replace(tzinfo=v4_api.timezone.utc).timestamp())
        timings, result = time_call(
            lambda instrument=instrument, timestamp=timestamp: query_price(timestamp, str(db_path), table, instrument),
            runs,
        )
        print_timing(
            f"query case=price_lookup instrument={instrument} ts='{ts:%Y-%m-%d %H:%M}'",
            timings,
            1 if result else 0,
        )
    print("query_benchmark_status: done")


def run_layout_diagnostics(db_path: Path, table: str, instruments: list[str], physical_order_scan: bool) -> None:
    print("layout_diagnostic_status: start")
    with duckdb.connect(str(db_path), read_only=True) as conn:
        rows = conn.execute(
            f"""
            select instrument, count(*) as rows, min(ts) as min_ts, max(ts) as max_ts,
                   count(distinct ts) as distinct_ts
            from {table}
            where instrument in ({",".join(["?"] * len(instruments))})
            group by instrument
            order by instrument
            """,
            instruments,
        ).fetchall()
        print("instrument_ranges")
        for instrument, row_count, min_ts, max_ts, distinct_ts in rows:
            duplicates = int(row_count) - int(distinct_ts)
            print(
                f"- {instrument}: rows={row_count} distinct_ts={distinct_ts} "
                f"duplicate_ts={duplicates} min_ts={min_ts} max_ts={max_ts}"
            )

        duplicate_groups = conn.execute(
            f"""
            select instrument, count(*) as duplicate_keys
            from (
              select instrument, ts, count(*) as n
              from {table}
              where instrument in ({",".join(["?"] * len(instruments))})
              group by instrument, ts
              having count(*) > 1
            )
            group by instrument
            order by instrument
            """,
            instruments,
        ).fetchall()
        print("duplicate_key_groups")
        if duplicate_groups:
            for instrument, count in duplicate_groups:
                print(f"- {instrument}: {count}")
        else:
            print("- none")

        print("explain_sample")
        for instrument in instruments:
            max_ts = conn.execute(f"select max(ts) from {table} where instrument = ?", [instrument]).fetchone()[0]
            if not max_ts:
                continue
            start = max_ts - timedelta(days=1)
            plan_rows = conn.execute(
                f"explain select ts, open, high, low, close, volume from {table} "
                "where instrument = ? and ts >= ? and ts < ? order by ts",
                [instrument, start, max_ts],
            ).fetchall()
            plan_text = " ".join(str(row[-1]).replace("\n", " ") for row in plan_rows)
            print(f"- {instrument}: {plan_text[:500]}")

        if physical_order_scan:
            print("physical_order_scan")
            result = conn.execute(
                f"""
                with ordered as (
                  select
                    instrument,
                    ts,
                    lag(instrument) over (order by rowid) as prev_instrument,
                    lag(ts) over (order by rowid) as prev_ts
                  from {table}
                  where instrument in ({",".join(["?"] * len(instruments))})
                )
                select
                  sum(case when prev_instrument is not null and instrument < prev_instrument then 1 else 0 end) as instrument_inversions,
                  sum(case when prev_instrument = instrument and ts < prev_ts then 1 else 0 end) as ts_inversions_same_instrument
                from ordered
                """,
                instruments,
            ).fetchone()
            print(f"- instrument_inversions={result[0] or 0} ts_inversions_same_instrument={result[1] or 0}")
        else:
            print("physical_order_scan: skipped (use --physical-order-scan)")
    print("layout_diagnostic_status: done")


def main() -> int:
    args = parse_args()
    db_path = Path(args.db)
    if not db_path.exists():
        print(f"error: database not found: {db_path}", file=sys.stderr)
        return 2
    instruments = args.instrument or ["NQ", "ES"]
    print(f"db: {db_path}")
    print(f"table: {args.table}")
    print(f"instruments: {','.join(instruments)}")
    print(f"runs: {args.runs}")
    if not args.skip_layout:
        run_layout_diagnostics(db_path, args.table, instruments, args.physical_order_scan)
    if not args.skip_query:
        run_query_benchmarks(db_path, args.table, instruments, args.runs)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
