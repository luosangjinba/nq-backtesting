#!/usr/bin/env python3
"""Backfill minute-level occurrence_time for point-type PDAs."""

from __future__ import annotations

import argparse
from pathlib import Path

import duckdb


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Backfill occurrence_time for bsl/ssl/daily points")
    parser.add_argument("--target-db", default="v2/data/v2_research.duckdb")
    parser.add_argument("--source-db", default="trading_data.duckdb")
    parser.add_argument("--source-table", default="futures_1m")
    parser.add_argument("--instrument", default="NQ")
    parser.add_argument("--timeframes", default="D,4H,1H")
    parser.add_argument("--date-from", default="")
    parser.add_argument("--date-to", default="")
    return parser


def resolve_timeframes(value: str) -> list[str]:
    items = [item.strip().upper() for item in value.split(",") if item.strip()]
    valid = {"D", "4H", "1H", "15M"}
    invalid = [item for item in items if item not in valid]
    if invalid:
        raise ValueError(f"unsupported timeframes: {', '.join(invalid)}")
    return items


def ensure_occurrence_column(conn: duckdb.DuckDBPyConnection) -> None:
    existing = {row[1] for row in conn.execute("pragma table_info('pda_registry')").fetchall()}
    if "occurrence_time" not in existing:
        conn.execute("alter table pda_registry add column occurrence_time timestamp")


def build_occurrence_bucket_expr(timeframe: str) -> str:
    if timeframe == "D":
        return "date_trunc('day', ts + interval '6 hour') - interval '6 hour'"
    if timeframe == "4H":
        return "session_start + floor(date_diff('minute', session_start, ts) / 240) * interval '240 minute'"
    if timeframe == "15M":
        return "session_start + floor(date_diff('minute', session_start, ts) / 15) * interval '15 minute'"
    return "session_start + floor(date_diff('minute', session_start, ts) / 60) * interval '60 minute'"


def main() -> None:
    args = build_parser().parse_args()
    timeframes = resolve_timeframes(args.timeframes)
    target_db = Path(args.target_db)
    if not target_db.exists():
        raise FileNotFoundError(f"target db not found: {target_db}")

    conn = duckdb.connect(str(target_db))
    conn.execute(f"attach '{Path(args.source_db)}' as source_db")
    ensure_occurrence_column(conn)

    placeholders = ",".join("?" for _ in timeframes)
    clauses = [
        "p.instrument = ?",
        f"p.timeframe in ({placeholders})",
        "p.pda_type in ('bsl', 'ssl', 'daily_high', 'daily_low')",
        "p.anchor_time is not null",
    ]
    params: list[object] = [args.instrument, *timeframes]
    if args.date_from:
        clauses.append("coalesce(p.trade_date, cast(p.anchor_time + interval '6 hour' as date)) >= cast(? as date)")
        params.append(args.date_from)
    if args.date_to:
        clauses.append("coalesce(p.trade_date, cast(p.anchor_time + interval '6 hour' as date)) <= cast(? as date)")
        params.append(args.date_to)

    before = conn.execute(
        f"select count(*) from pda_registry p where {' and '.join(clauses)} and occurrence_time is null",
        params,
    ).fetchone()[0]

    for timeframe in timeframes:
        bucket_expr = build_occurrence_bucket_expr(timeframe)
        base_filters = ["instrument = ?"]
        base_params: list[object] = [args.instrument]
        if args.date_from:
            base_filters.append("cast(ts + interval '6 hour' as date) >= cast(? as date)")
            base_params.append(args.date_from)
        if args.date_to:
            base_filters.append("cast(ts + interval '6 hour' as date) <= cast(? as date)")
            base_params.append(args.date_to)

        for is_high, source_col, registry_col, pda_types in (
            (True, "high", "price_high", ["bsl"] + (["daily_high"] if timeframe == "D" else [])),
            (False, "low", "price_low", ["ssl"] + (["daily_low"] if timeframe == "D" else [])),
        ):
            type_placeholders = ",".join("?" for _ in pda_types)
            extrema_fn = "max" if is_high else "min"
            update_params = [*base_params, args.instrument, timeframe, *pda_types]
            conn.execute(
                f"""
                update pda_registry as p
                set occurrence_time = src.occurrence_time,
                    updated_at = current_timestamp
                from (
                  with base as (
                    select
                      instrument,
                      ts,
                      {source_col} as price_value,
                      date_trunc('day', ts + interval '6 hour') - interval '6 hour' as session_start,
                      {bucket_expr} as bucket_start
                    from source_db.{args.source_table}
                    where {" and ".join(base_filters)}
                  ),
                  extrema as (
                    select
                      instrument,
                      bucket_start,
                      {extrema_fn}(price_value) as target_price
                    from base
                    group by instrument, bucket_start
                  ),
                  first_touch as (
                    select
                      b.instrument,
                      b.bucket_start,
                      e.target_price,
                      min(b.ts) as occurrence_time
                    from base b
                    join extrema e
                      on e.instrument = b.instrument
                     and e.bucket_start = b.bucket_start
                     and e.target_price = b.price_value
                    group by b.instrument, b.bucket_start, e.target_price
                  )
                  select
                    p.pda_id,
                    f.occurrence_time
                  from pda_registry p
                  join first_touch f
                    on f.instrument = p.instrument
                   and f.bucket_start = p.anchor_time
                   and f.target_price = p.{registry_col}
                  where p.instrument = ?
                    and p.timeframe = ?
                    and p.pda_type in ({type_placeholders})
                    and p.anchor_time is not null
                ) as src
                where p.pda_id = src.pda_id
                """,
                update_params,
            )

    after = conn.execute(
        f"select count(*) from pda_registry p where {' and '.join(clauses)} and occurrence_time is null",
        params,
    ).fetchone()[0]
    matched = conn.execute(
        f"select count(*) from pda_registry p where {' and '.join(clauses)} and occurrence_time is not null",
        params,
    ).fetchone()[0]

    print(f"null_before={before}")
    print(f"null_after={after}")
    print(f"matched={matched}")


if __name__ == "__main__":
    main()
