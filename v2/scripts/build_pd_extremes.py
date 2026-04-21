#!/usr/bin/env python3
"""Build intraday session extreme facts into pd_extremes."""

from __future__ import annotations

import argparse
from pathlib import Path

import duckdb


SESSION_SHIFT_HOURS = 6
SESSION_WINDOWS = [
    ("asia", 0, 480),
    ("ldn", 480, 660),
    ("transition", 660, 780),
    ("premarket", 780, 930),
    ("ny_am", 930, 1080),
    ("ny_lunch", 1080, 1170),
    ("ny_pm", 1170, 1380),
]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build session extreme facts")
    parser.add_argument("--source-db", default="trading_data.duckdb")
    parser.add_argument("--source-table", default="futures_1m")
    parser.add_argument("--target-db", default="v2/data/v2_research.duckdb")
    parser.add_argument("--instrument", default="NQ")
    parser.add_argument("--date-from", default="", help="Session date from YYYY-MM-DD")
    parser.add_argument("--date-to", default="", help="Session date to YYYY-MM-DD")
    parser.add_argument("--replace", action="store_true", help="Delete existing rows in range before insert")
    return parser


def validate_date(value: str) -> str:
    if not value:
        return ""
    return value


def load_sql(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def ensure_table(conn: duckdb.DuckDBPyConnection, repo_root: Path) -> None:
    conn.execute(load_sql(repo_root / "v2/schema/pd_extremes.sql"))


def replace_existing(
    conn: duckdb.DuckDBPyConnection,
    instrument: str,
    date_from: str,
    date_to: str,
) -> None:
    clauses = ["instrument = ?"]
    params: list[object] = [instrument]
    if date_from:
        clauses.append("trade_date >= cast(? as date)")
        params.append(date_from)
    if date_to:
        clauses.append("trade_date <= cast(? as date)")
        params.append(date_to)
    conn.execute(f"delete from pd_extremes where {' and '.join(clauses)}", params)


def build_case_expr() -> str:
    parts = []
    for name, start_minute, end_minute in SESSION_WINDOWS:
        parts.append(
            f"when minute_of_session >= {start_minute} and minute_of_session < {end_minute} then '{name}'"
        )
    return "case " + " ".join(parts) + " else null end"


def build_window_start_expr(alias: str) -> str:
    parts = []
    for name, start_minute, _ in SESSION_WINDOWS:
        parts.append(
            f"when {alias}.session_name = '{name}' then {alias}.session_start + interval '{start_minute} minute'"
        )
    return "case " + " ".join(parts) + " end"


def build_window_end_expr(alias: str) -> str:
    parts = []
    for name, _, end_minute in SESSION_WINDOWS:
        parts.append(
            f"when {alias}.session_name = '{name}' then {alias}.session_start + interval '{end_minute} minute'"
        )
    return "case " + " ".join(parts) + " end"


def insert_extremes(
    conn: duckdb.DuckDBPyConnection,
    source_table: str,
    instrument: str,
    date_from: str,
    date_to: str,
) -> int:
    session_case = build_case_expr()
    window_start_case = build_window_start_expr("h")
    window_end_case = build_window_end_expr("h")

    where_clauses = [
        "instrument = ?",
        "session_name is not null",
    ]
    params: list[object] = [instrument]
    if date_from:
        where_clauses.append("trade_date >= cast(? as date)")
        params.append(date_from)
    if date_to:
        where_clauses.append("trade_date <= cast(? as date)")
        params.append(date_to)

    conn.execute(
        f"""
        insert into pd_extremes (
          instrument, trade_date, session_name, window_start, window_end,
          high_price, high_time, low_price, low_time, source, note
        )
        with base as (
          select
            instrument,
            ts,
            high,
            low,
            date_trunc('day', ts + interval '{SESSION_SHIFT_HOURS} hour') - interval '{SESSION_SHIFT_HOURS} hour' as session_start,
            cast(ts + interval '{SESSION_SHIFT_HOURS} hour' as date) as trade_date,
            date_diff(
              'minute',
              date_trunc('day', ts + interval '{SESSION_SHIFT_HOURS} hour') - interval '{SESSION_SHIFT_HOURS} hour',
              ts
            ) as minute_of_session
          from source_db.{source_table}
        ),
        tagged as (
          select
            instrument,
            ts,
            high,
            low,
            session_start,
            trade_date,
            {session_case} as session_name
          from base
        ),
        filtered as (
          select *
          from tagged
          where {" and ".join(where_clauses)}
        ),
        highs as (
          select
            instrument,
            trade_date,
            session_name,
            session_start,
            max(high) as high_price
          from filtered
          group by instrument, trade_date, session_name, session_start
        ),
        lows as (
          select
            instrument,
            trade_date,
            session_name,
            session_start,
            min(low) as low_price
          from filtered
          group by instrument, trade_date, session_name, session_start
        ),
        high_times as (
          select
            f.instrument,
            f.trade_date,
            f.session_name,
            min(f.ts) as high_time
          from filtered f
          join highs h
            on h.instrument = f.instrument
           and h.trade_date = f.trade_date
           and h.session_name = f.session_name
           and h.session_start = f.session_start
           and h.high_price = f.high
          group by f.instrument, f.trade_date, f.session_name
        ),
        low_times as (
          select
            f.instrument,
            f.trade_date,
            f.session_name,
            min(f.ts) as low_time
          from filtered f
          join lows l
            on l.instrument = f.instrument
           and l.trade_date = f.trade_date
           and l.session_name = f.session_name
           and l.session_start = f.session_start
           and l.low_price = f.low
          group by f.instrument, f.trade_date, f.session_name
        )
        select
          h.instrument,
          h.trade_date,
          h.session_name,
          {window_start_case} as window_start,
          {window_end_case} as window_end,
          h.high_price,
          ht.high_time,
          l.low_price,
          lt.low_time,
          'auto_scan' as source,
          '' as note
        from highs h
        join lows l
          on l.instrument = h.instrument
         and l.trade_date = h.trade_date
         and l.session_name = h.session_name
         and l.session_start = h.session_start
        join high_times ht
          on ht.instrument = h.instrument
         and ht.trade_date = h.trade_date
         and ht.session_name = h.session_name
        join low_times lt
          on lt.instrument = h.instrument
         and lt.trade_date = h.trade_date
         and lt.session_name = h.session_name
        """,
        params,
    )
    return conn.execute("select count(*) from pd_extremes where instrument = ?", [instrument]).fetchone()[0]


def main() -> None:
    args = build_parser().parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    target_db = Path(args.target_db)
    target_db.parent.mkdir(parents=True, exist_ok=True)

    conn = duckdb.connect(str(target_db))
    conn.execute(f"attach '{Path(args.source_db)}' as source_db")
    ensure_table(conn, repo_root)

    if args.replace:
      replace_existing(conn, args.instrument, validate_date(args.date_from), validate_date(args.date_to))

    total = insert_extremes(
        conn,
        args.source_table,
        args.instrument,
        validate_date(args.date_from),
        validate_date(args.date_to),
    )

    rows = conn.execute(
        """
        select session_name, count(*)
        from pd_extremes
        where instrument = ?
          and (? = '' or trade_date >= cast(? as date))
          and (? = '' or trade_date <= cast(? as date))
        group by 1
        order by 1
        """,
        [args.instrument, args.date_from, args.date_from, args.date_to, args.date_to],
    ).fetchall()
    for row in rows:
        print(f"{row[0]}={row[1]}")
    print(f"total={total}")


if __name__ == "__main__":
    main()
