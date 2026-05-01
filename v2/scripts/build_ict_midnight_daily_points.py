#!/usr/bin/env python3
"""Build ICT midnight-day high/low PDA records.

These are parallel to existing futures-session daily_high/daily_low records.

- daily_high / daily_low: futures session day, 18:00 -> 16:59
- ict_midnight_day_high / ict_midnight_day_low: calendar day, 00:00 -> 23:59
"""

from __future__ import annotations

import argparse
import re
from datetime import date
from pathlib import Path

import duckdb


SOURCE = "auto_ict_midnight_scan"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build ICT midnight-day high/low records")
    parser.add_argument("--source-db", default="trading_data.duckdb")
    parser.add_argument("--source-table", default="futures_1m")
    parser.add_argument("--target-db", default="v2/data/v2_research.duckdb")
    parser.add_argument("--instrument", default="NQ")
    parser.add_argument("--date-from", default="", help="Calendar date from YYYY-MM-DD")
    parser.add_argument("--date-to", default="", help="Calendar date to YYYY-MM-DD")
    parser.add_argument("--replace", action="store_true", help="Delete existing auto ICT midnight records in range")
    return parser


def validate_date(value: str) -> str:
    if not value:
        return ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("date must be YYYY-MM-DD")
    return value


def ensure_registry_columns(conn: duckdb.DuckDBPyConnection) -> None:
    existing = {row[1] for row in conn.execute("pragma table_info('pda_registry')").fetchall()}
    required_columns = {
        "trade_date": "date",
        "anchor_time": "timestamp",
        "occurrence_time": "timestamp",
        "confirm_time": "timestamp",
        "status": "varchar default 'active'",
        "manual_added": "boolean default false",
        "manual_edited": "boolean default false",
        "review_state": "varchar default 'pending'",
        "review_role": "varchar default 'unclassified'",
        "review_tag": "varchar",
        "prev_close_time": "timestamp",
        "prev_close_price": "double",
        "next_open_time": "timestamp",
        "next_open_price": "double",
    }
    for column_name, column_def in required_columns.items():
        if column_name not in existing:
            conn.execute(f"alter table pda_registry add column {column_name} {column_def}")


def delete_existing(
    conn: duckdb.DuckDBPyConnection,
    instrument: str,
    date_from: str,
    date_to: str,
) -> None:
    clauses = [
        "instrument = ?",
        "source = ?",
        "pda_type in ('ict_midnight_day_high', 'ict_midnight_day_low')",
    ]
    params: list[object] = [instrument, SOURCE]
    if date_from:
        clauses.append("trade_date >= cast(? as date)")
        params.append(date_from)
    if date_to:
        clauses.append("trade_date <= cast(? as date)")
        params.append(date_to)
    conn.execute(f"delete from pda_registry where {' and '.join(clauses)}", params)


def insert_records(
    conn: duckdb.DuckDBPyConnection,
    source_table: str,
    instrument: str,
    date_from: str,
    date_to: str,
) -> int:
    where_clauses = ["instrument = ?"]
    params: list[object] = [instrument]
    if date_from:
        where_clauses.append("cast(ts as date) >= cast(? as date)")
        params.append(date_from)
    if date_to:
        where_clauses.append("cast(ts as date) <= cast(? as date)")
        params.append(date_to)

    conn.execute(
        f"""
        insert into pda_registry (
          pda_id, instrument, timeframe, pda_type, direction,
          trade_date, anchor_time, occurrence_time, confirm_time,
          status, manual_added, manual_edited, review_state, review_role,
          created_date, created_ts, verified_ts, anchor_ts,
          origin_start_date, origin_end_date,
          price, price_high, price_low, price_ce,
          prev_close_time, prev_close_price, next_open_time, next_open_price,
          source, note, registry_status
        )
        with base as (
          select
            instrument,
            ts,
            high,
            low,
            cast(ts as date) as calendar_date,
            date_trunc('day', ts) as day_start
          from source_db.{source_table}
          where {" and ".join(where_clauses)}
        ),
        daily as (
          select
            instrument,
            calendar_date,
            day_start,
            min(ts) as first_ts,
            max(ts) as last_ts,
            max(high) as high_price,
            min(low) as low_price
          from base
          group by instrument, calendar_date, day_start
        ),
        high_times as (
          select
            b.instrument,
            b.calendar_date,
            min(b.ts) as high_time
          from base b
          join daily d
            on d.instrument = b.instrument
           and d.calendar_date = b.calendar_date
           and d.high_price = b.high
          group by b.instrument, b.calendar_date
        ),
        low_times as (
          select
            b.instrument,
            b.calendar_date,
            min(b.ts) as low_time
          from base b
          join daily d
            on d.instrument = b.instrument
           and d.calendar_date = b.calendar_date
           and d.low_price = b.low
          group by b.instrument, b.calendar_date
        ),
        records as (
          select
            'pda_' || strftime(d.calendar_date, '%Y%m%d') || '_D_ict_midnight_day_high_001' as pda_id,
            d.instrument,
            'D' as timeframe,
            'ict_midnight_day_high' as pda_type,
            cast(null as varchar) as direction,
            d.calendar_date as trade_date,
            d.day_start as anchor_time,
            h.high_time as occurrence_time,
            cast(null as timestamp) as confirm_time,
            d.high_price as price,
            d.high_price as price_high,
            d.high_price as price_low,
            d.high_price as price_ce,
            'ict_midnight_day_high' as review_role,
            'ICT midnight day high, 00:00-23:59 calendar day' as note
          from daily d
          join high_times h
            on h.instrument = d.instrument
           and h.calendar_date = d.calendar_date
          where d.first_ts <= d.day_start + interval '1 minute'
          union all
          select
            'pda_' || strftime(d.calendar_date, '%Y%m%d') || '_D_ict_midnight_day_low_001' as pda_id,
            d.instrument,
            'D' as timeframe,
            'ict_midnight_day_low' as pda_type,
            cast(null as varchar) as direction,
            d.calendar_date as trade_date,
            d.day_start as anchor_time,
            l.low_time as occurrence_time,
            cast(null as timestamp) as confirm_time,
            d.low_price as price,
            d.low_price as price_high,
            d.low_price as price_low,
            d.low_price as price_ce,
            'ict_midnight_day_low' as review_role,
            'ICT midnight day low, 00:00-23:59 calendar day' as note
          from daily d
          join low_times l
            on l.instrument = d.instrument
           and l.calendar_date = d.calendar_date
          where d.first_ts <= d.day_start + interval '1 minute'
        )
        select
          pda_id,
          instrument,
          timeframe,
          pda_type,
          direction,
          trade_date,
          anchor_time,
          occurrence_time,
          confirm_time,
          'active' as status,
          false as manual_added,
          false as manual_edited,
          'pending' as review_state,
          review_role,
          trade_date as created_date,
          anchor_time as created_ts,
          confirm_time as verified_ts,
          anchor_time as anchor_ts,
          cast(null as date) as origin_start_date,
          cast(null as date) as origin_end_date,
          price,
          price_high,
          price_low,
          price_ce,
          cast(null as timestamp) as prev_close_time,
          cast(null as double) as prev_close_price,
          cast(null as timestamp) as next_open_time,
          cast(null as double) as next_open_price,
          '{SOURCE}' as source,
          note,
          'active' as registry_status
        from records
        """,
        params,
    )
    return conn.execute(
        """
        select count(*)
        from pda_registry
        where instrument = ?
          and source = ?
          and pda_type in ('ict_midnight_day_high', 'ict_midnight_day_low')
        """,
        [instrument, SOURCE],
    ).fetchone()[0]


def main() -> None:
    args = build_parser().parse_args()
    date_from = validate_date(args.date_from)
    date_to = validate_date(args.date_to)
    target_db = Path(args.target_db)
    if not target_db.exists():
        raise FileNotFoundError(f"target db not found: {target_db}")

    conn = duckdb.connect(str(target_db))
    conn.execute(f"attach '{Path(args.source_db)}' as source_db")
    ensure_registry_columns(conn)
    if args.replace:
        delete_existing(conn, args.instrument, date_from, date_to)
    count = insert_records(conn, args.source_table, args.instrument, date_from, date_to)
    print(f"ict_midnight_records={count}")


if __name__ == "__main__":
    main()
