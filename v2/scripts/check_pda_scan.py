#!/usr/bin/env python3
"""Run pre-full-scan checks against a PDA registry DuckDB."""

from __future__ import annotations

import argparse
from pathlib import Path

import duckdb


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Check PDA scan output before full-history run")
    parser.add_argument("--db", default="/tmp/v2_research_check.duckdb", help="DuckDB path")
    parser.add_argument("--sample-limit", type=int, default=10, help="Rows per sample section")
    return parser


def format_value(value: object) -> str:
    if value is None:
        return "NULL"
    return str(value)


def print_table(title: str, columns: list[str], rows: list[tuple]) -> None:
    print(f"\n== {title} ==")
    if not rows:
        print("(no rows)")
        return
    widths = [len(col) for col in columns]
    for row in rows:
        for idx, value in enumerate(row):
            widths[idx] = max(widths[idx], len(format_value(value)))
    header = " | ".join(col.ljust(widths[idx]) for idx, col in enumerate(columns))
    divider = "-+-".join("-" * widths[idx] for idx in range(len(columns)))
    print(header)
    print(divider)
    for row in rows:
        print(" | ".join(format_value(value).ljust(widths[idx]) for idx, value in enumerate(row)))


def fetchall(conn: duckdb.DuckDBPyConnection, sql: str, params: list | None = None) -> list[tuple]:
    return conn.execute(sql, params or []).fetchall()


def main() -> None:
    args = build_parser().parse_args()
    db_path = Path(args.db)
    if not db_path.exists():
        raise SystemExit(f"DB not found: {db_path}")

    conn = duckdb.connect(str(db_path))

    print(f"Checking PDA scan DB: {db_path}")

    print_table(
        "Counts By PDA Type",
        ["pda_type", "count"],
        fetchall(
            conn,
            """
            select pda_type, count(*) as cnt
            from pda_registry
            group by 1
            order by 1
            """,
        ),
    )

    print_table(
        "Counts By Timeframe And Type",
        ["timeframe", "pda_type", "count"],
        fetchall(
            conn,
            """
            select timeframe, pda_type, count(*) as cnt
            from pda_registry
            group by 1, 2
            order by 1, 2
            """,
        ),
    )

    print_table(
        "Sanity Checks",
        ["check_name", "bad_rows"],
        fetchall(
            conn,
            """
            with checks as (
              select 'fvg_has_confirm_time' as check_name, count(*) as bad_rows
              from pda_registry
              where pda_type = 'fvg' and confirm_time is not null
              union all
              select 'bsl_missing_confirm_time', count(*)
              from pda_registry
              where pda_type = 'bsl' and confirm_time is null
              union all
              select 'ssl_missing_confirm_time', count(*)
              from pda_registry
              where pda_type = 'ssl' and confirm_time is null
              union all
              select 'gap_has_confirm_time', count(*)
              from pda_registry
              where pda_type in ('ndog', 'nwog') and confirm_time is not null
              union all
              select 'gap_anchor_not_1800', count(*)
              from pda_registry
              where pda_type in ('ndog', 'nwog')
                and anchor_time is not null
                and strftime(anchor_time, '%H:%M') <> '18:00'
            )
            select check_name, bad_rows
            from checks
            order by check_name
            """,
        ),
    )

    print_table(
        "Gap Special Close Times",
        [
            "pda_id",
            "pda_type",
            "trade_date",
            "prev_close_time",
            "next_open_time",
            "prev_close_price",
            "next_open_price",
        ],
        fetchall(
            conn,
            """
            select
              pda_id,
              pda_type,
              trade_date,
              prev_close_time,
              next_open_time,
              prev_close_price,
              next_open_price
            from pda_registry
            where pda_type in ('ndog', 'nwog')
              and prev_close_time is not null
              and strftime(prev_close_time, '%H:%M') <> '16:59'
            order by trade_date, pda_type
            """,
        ),
    )

    sample_queries = [
        (
            "Sample BSL",
            """
            select pda_id, trade_date, timeframe, anchor_time, confirm_time, price, price_low, price_high
            from pda_registry
            where pda_type = 'bsl'
            order by trade_date, anchor_time
            limit ?
            """,
            ["pda_id", "trade_date", "timeframe", "anchor_time", "confirm_time", "price", "price_low", "price_high"],
        ),
        (
            "Sample SSL",
            """
            select pda_id, trade_date, timeframe, anchor_time, confirm_time, price, price_low, price_high
            from pda_registry
            where pda_type = 'ssl'
            order by trade_date, anchor_time
            limit ?
            """,
            ["pda_id", "trade_date", "timeframe", "anchor_time", "confirm_time", "price", "price_low", "price_high"],
        ),
        (
            "Sample FVG",
            """
            select pda_id, trade_date, timeframe, anchor_time, confirm_time, direction, price_low, price_high, price_ce
            from pda_registry
            where pda_type = 'fvg'
            order by trade_date, anchor_time
            limit ?
            """,
            ["pda_id", "trade_date", "timeframe", "anchor_time", "confirm_time", "direction", "price_low", "price_high", "price_ce"],
        ),
        (
            "Sample NDOG/NWOG",
            """
            select
              pda_id,
              pda_type,
              trade_date,
              anchor_time,
              prev_close_time,
              prev_close_price,
              next_open_time,
              next_open_price,
              price_low,
              price_high,
              direction
            from pda_registry
            where pda_type in ('ndog', 'nwog')
            order by trade_date, pda_type
            limit ?
            """,
            ["pda_id", "pda_type", "trade_date", "anchor_time", "prev_close_time", "prev_close_price", "next_open_time", "next_open_price", "price_low", "price_high", "direction"],
        ),
    ]

    for title, sql, columns in sample_queries:
        print_table(title, columns, fetchall(conn, sql, [args.sample_limit]))


if __name__ == "__main__":
    main()
