#!/usr/bin/env python3
"""Scan Layer 1 mechanical PDAs into V2 DuckDB registry.

Layer 1 rules:
- Capture everything mechanical
- No dedupe across timeframes
- No structural judgment
- Later tap/fill/invalidation belong to pda_events / Layer 2

Current narrowed scope:
- Auto scan: daily_high / daily_low / bsl / ssl / fvg
- nwog / ndog keep dedicated gap logic
- 30m stays manual-only
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable

import duckdb


SESSION_SHIFT_HOURS = 6
SWING_RULES = {
    "D": (1, 1),
    "4H": (2, 2),
    "1H": (3, 3),
}
BUCKET_MINUTES = {
    "D": 24 * 60,
    "4H": 4 * 60,
    "1H": 60,
}


@dataclass
class Bar:
    bar_date: str
    bucket_start: datetime
    first_ts: datetime
    last_ts: datetime
    open: float
    high: float
    low: float
    close: float


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scan Layer 1 mechanical PDA registry")
    parser.add_argument("--source-db", default="trading_data.duckdb")
    parser.add_argument("--source-table", default="futures_1m")
    parser.add_argument("--target-db", default="v2/data/v2_research.duckdb")
    parser.add_argument("--instrument", default="NQ")
    parser.add_argument("--timeframes", default="D,4H,1H", help="Comma-separated subset of D,4H,1H")
    parser.add_argument("--date-from", default="", help="Session date from YYYY-MM-DD")
    parser.add_argument("--date-to", default="", help="Session date to YYYY-MM-DD")
    parser.add_argument("--replace", action="store_true", help="Delete existing rows for instrument/timeframes before insert")
    return parser


def validate_date(value: str) -> str:
    if not value:
        return ""
    return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d")


def resolve_timeframes(value: str) -> list[str]:
    items = [item.strip().upper() for item in value.split(",") if item.strip()]
    invalid = [item for item in items if item not in SWING_RULES]
    if invalid:
        raise ValueError(f"unsupported timeframes: {', '.join(invalid)}")
    return items


def load_sql(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def ensure_registry_tables(target_conn: duckdb.DuckDBPyConnection, repo_root: Path) -> None:
    registry_exists = bool(
        target_conn.execute(
            """
            select count(*)
            from information_schema.tables
            where table_name = 'pda_registry'
            """
        ).fetchone()[0]
    )
    if not registry_exists:
        target_conn.execute(load_sql(repo_root / "v2/schema/pda_registry.sql"))
    else:
        ensure_registry_columns(target_conn)
        ensure_registry_indexes(target_conn)
    target_conn.execute(load_sql(repo_root / "v2/schema/pda_events.sql"))
    ensure_registry_columns(target_conn)
    ensure_registry_indexes(target_conn)


def ensure_registry_columns(target_conn: duckdb.DuckDBPyConnection) -> None:
    existing = {
        row[1] for row in target_conn.execute("pragma table_info('pda_registry')").fetchall()
    }
    required_columns = {
        "trade_date": "date",
        "anchor_time": "timestamp",
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
            target_conn.execute(f"alter table pda_registry add column {column_name} {column_def}")


def ensure_registry_indexes(target_conn: duckdb.DuckDBPyConnection) -> None:
    target_conn.execute(
        """
        create index if not exists idx_pda_registry_instrument_tf_status
          on pda_registry (instrument, timeframe, registry_status)
        """
    )
    target_conn.execute(
        """
        create index if not exists idx_pda_registry_created_date
          on pda_registry (created_date)
        """
    )
    target_conn.execute(
        """
        create index if not exists idx_pda_registry_trade_date
          on pda_registry (trade_date)
        """
    )
    target_conn.execute(
        """
        create index if not exists idx_pda_registry_type_direction
          on pda_registry (pda_type, direction)
        """
    )


def build_bar_query(table: str, timeframe: str) -> str:
    bucket_minutes = BUCKET_MINUTES[timeframe]
    if timeframe == "D":
        bucket_expr = "date_trunc('day', ts + interval '6 hour') - interval '6 hour'"
    else:
        bucket_expr = f"""
        session_start + floor(date_diff('minute', session_start, ts) / {bucket_minutes}) * interval '{bucket_minutes} minute'
        """.strip()
    return f"""
with base as (
  select
    ts,
    open,
    high,
    low,
    close,
    date_trunc('day', ts + interval '{SESSION_SHIFT_HOURS} hour') - interval '{SESSION_SHIFT_HOURS} hour' as session_start,
    cast(ts + interval '{SESSION_SHIFT_HOURS} hour' as date) as session_date
  from source_db.{table}
  where instrument = ?
    and (? = '' or cast(ts + interval '{SESSION_SHIFT_HOURS} hour' as date) >= cast(? as date))
    and (? = '' or cast(ts + interval '{SESSION_SHIFT_HOURS} hour' as date) <= cast(? as date))
),
bucketed as (
  select
    *,
    {bucket_expr} as bucket_start
  from base
),
agg as (
  select
    bucket_start,
    min(ts) as first_ts,
    max(ts) as last_ts,
    max(high) as high,
    min(low) as low
  from bucketed
  group by bucket_start
)
select
  cast(a.bucket_start + interval '{SESSION_SHIFT_HOURS} hour' as date) as bar_date,
  a.bucket_start,
  a.first_ts,
  a.last_ts,
  o.open,
  a.high,
  a.low,
  c.close
from agg a
join bucketed o on o.bucket_start = a.bucket_start and o.ts = a.first_ts
join bucketed c on c.bucket_start = a.bucket_start and c.ts = a.last_ts
order by a.bucket_start
""".strip()


def fetch_bars(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    instrument: str,
    timeframe: str,
    date_from: str,
    date_to: str,
) -> list[Bar]:
    rows = conn.execute(
        build_bar_query(table, timeframe),
        [instrument, date_from, date_from, date_to, date_to],
    ).fetchall()
    return [
        Bar(
            bar_date=row[0].strftime("%Y-%m-%d") if isinstance(row[0], date) else str(row[0]),
            bucket_start=row[1],
            first_ts=row[2],
            last_ts=row[3],
            open=float(row[4]),
            high=float(row[5]),
            low=float(row[6]),
            close=float(row[7]),
        )
        for row in rows
    ]


def midpoint(high: float, low: float) -> float:
    return (high + low) / 2.0


def fetch_calendar_dates(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    instrument: str,
    date_from: str,
    date_to: str,
) -> list[str]:
    rows = conn.execute(
        f"""
        select distinct cast(ts as date) as calendar_date
        from source_db.{table}
        where instrument = ?
          and (? = '' or cast(ts as date) >= cast(? as date))
          and (? = '' or cast(ts as date) <= cast(? as date))
        order by calendar_date
        """,
        [instrument, date_from, date_from, date_to, date_to],
    ).fetchall()
    return [row[0].strftime("%Y-%m-%d") if isinstance(row[0], date) else str(row[0]) for row in rows]


def lookup_prev_close(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    instrument: str,
    target_date: str,
    target_time: str = "16:59",
    max_lookback_minutes: int = 360,
) -> tuple[datetime, float] | None:
    target_ts = f"{target_date} {target_time}:00"
    row = conn.execute(
        f"""
        select ts, close
        from source_db.{table}
        where instrument = ?
          and ts <= cast(? as timestamp)
          and ts >= cast(? as timestamp) - interval '{max_lookback_minutes} minute'
        order by ts desc
        limit 1
        """,
        [instrument, target_ts, target_ts],
    ).fetchone()
    if not row:
        return None
    return row[0], float(row[1])


def lookup_exact_open(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    instrument: str,
    target_date: str,
    target_time: str = "18:00",
) -> tuple[datetime, float] | None:
    target_ts = f"{target_date} {target_time}:00"
    row = conn.execute(
        f"""
        select ts, open
        from source_db.{table}
        where instrument = ?
          and ts = cast(? as timestamp)
        limit 1
        """,
        [instrument, target_ts],
    ).fetchone()
    if not row:
        return None
    return row[0], float(row[1])


def gap_records(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    instrument: str,
    counters: dict[tuple[str, str, str], int],
    calendar_dates: list[str],
) -> list[dict]:
    results: list[dict] = []
    for trade_date in calendar_dates:
        day = datetime.strptime(trade_date, "%Y-%m-%d").date()
        weekday = day.weekday()

        gap_specs: list[tuple[str, str, str]] = []
        if weekday in (1, 2, 3, 4):
            prev_day = (day - timedelta(days=1)).strftime("%Y-%m-%d")
            gap_specs.append(("ndog", prev_day, prev_day))
        if weekday == 0:
            gap_specs.append(
                (
                    "nwog",
                    (day - timedelta(days=3)).strftime("%Y-%m-%d"),
                    (day - timedelta(days=1)).strftime("%Y-%m-%d"),
                )
            )

        for pda_type, prev_close_date, next_open_date in gap_specs:
            prev_close = lookup_prev_close(conn, table, instrument, prev_close_date)
            next_open = lookup_exact_open(conn, table, instrument, next_open_date)
            if not prev_close or not next_open:
                continue

            prev_close_ts, prev_close_price = prev_close
            next_open_ts, next_open_price = next_open
            if prev_close_price == next_open_price:
                continue

            high = max(prev_close_price, next_open_price)
            low = min(prev_close_price, next_open_price)
            direction = "bullish" if next_open_price > prev_close_price else "bearish"

            results.append(
                make_record(
                    pda_id=generate_id(counters, trade_date, "D", pda_type),
                    instrument=instrument,
                    timeframe="D",
                    pda_type=pda_type,
                    direction=direction,
                    trade_date=trade_date,
                    anchor_time=next_open_ts,
                    confirm_time=None,
                    origin_start_date=prev_close_ts.strftime("%Y-%m-%d"),
                    origin_end_date=next_open_ts.strftime("%Y-%m-%d"),
                    price_high=high,
                    price_low=low,
                    price_ce=midpoint(high, low),
                    prev_close_time=prev_close_ts,
                    prev_close_price=prev_close_price,
                    next_open_time=next_open_ts,
                    next_open_price=next_open_price,
                    source="auto_scan",
                )
            )
    return results


def generate_id(counters: dict[tuple[str, str, str], int], bar_date: str, timeframe: str, pda_type: str) -> str:
    key = (bar_date, timeframe, pda_type)
    counters[key] += 1
    return f"pda_{bar_date.replace('-', '')}_{timeframe}_{pda_type}_{counters[key]:03d}"


def daily_point_records(bars: list[Bar], counters: dict[tuple[str, str, str], int]) -> list[dict]:
    results: list[dict] = []
    for bar in bars:
        results.append(
            make_record(
                pda_id=generate_id(counters, bar.bar_date, "D", "daily_high"),
                instrument="NQ_PLACEHOLDER",
                timeframe="D",
                pda_type="daily_high",
                direction=None,
                trade_date=bar.bar_date,
                anchor_time=bar.bucket_start,
                confirm_time=None,
                price=bar.high,
                price_high=bar.high,
                price_low=bar.high,
                price_ce=bar.high,
                review_role="daily_high",
                source="auto_scan",
            )
        )
        results.append(
            make_record(
                pda_id=generate_id(counters, bar.bar_date, "D", "daily_low"),
                instrument="NQ_PLACEHOLDER",
                timeframe="D",
                pda_type="daily_low",
                direction=None,
                trade_date=bar.bar_date,
                anchor_time=bar.bucket_start,
                confirm_time=None,
                price=bar.low,
                price_high=bar.low,
                price_low=bar.low,
                price_ce=bar.low,
                review_role="daily_low",
                source="auto_scan",
            )
        )
    return results


def swing_records(bars: list[Bar], timeframe: str, counters: dict[tuple[str, str, str], int]) -> list[dict]:
    left, right = SWING_RULES[timeframe]
    results: list[dict] = []
    existing_keys: set[tuple[str, datetime, str, float]] = set()
    for i in range(left, len(bars) - right):
        anchor = bars[i]
        left_slice = bars[i - left : i]
        right_slice = bars[i + 1 : i + 1 + right]
        # Tie-break equal extremes in favor of the right-most bar.
        # This lets runs of equal highs/lows collapse into a single candidate
        # instead of dropping the whole run from the candidate pool.
        is_high = all(anchor.high >= b.high for b in left_slice) and all(anchor.high > b.high for b in right_slice)
        is_low = all(anchor.low <= b.low for b in left_slice) and all(anchor.low < b.low for b in right_slice)
        confirm_time = right_slice[-1].bucket_start if right_slice else anchor.bucket_start
        if is_high:
            existing_keys.add((timeframe, anchor.bucket_start, "bsl", anchor.high))
            results.append(
                make_record(
                    pda_id=generate_id(counters, anchor.bar_date, timeframe, "bsl"),
                    instrument="NQ_PLACEHOLDER",
                    timeframe=timeframe,
                    pda_type="bsl",
                    direction=None,
                    trade_date=anchor.bar_date,
                    anchor_time=anchor.bucket_start,
                    confirm_time=confirm_time,
                    price=anchor.high,
                    price_high=anchor.high,
                    price_low=anchor.high,
                    source="auto_scan",
                )
            )
        if is_low:
            existing_keys.add((timeframe, anchor.bucket_start, "ssl", anchor.low))
            results.append(
                make_record(
                    pda_id=generate_id(counters, anchor.bar_date, timeframe, "ssl"),
                    instrument="NQ_PLACEHOLDER",
                    timeframe=timeframe,
                    pda_type="ssl",
                    direction=None,
                    trade_date=anchor.bar_date,
                    anchor_time=anchor.bucket_start,
                    confirm_time=confirm_time,
                    price=anchor.low,
                    price_high=anchor.low,
                    price_low=anchor.low,
                    source="auto_scan",
                )
            )

    # Supplement for adjacent equal-valued extrema points:
    # if two consecutive local highs (or lows) on the extremum sequence have
    # exactly the same price, keep the right-hand point as an extra candidate.
    local_highs: list[int] = []
    local_lows: list[int] = []
    for i in range(1, len(bars) - 1):
        if bars[i].high > bars[i - 1].high and bars[i].high > bars[i + 1].high:
            local_highs.append(i)
        if bars[i].low < bars[i - 1].low and bars[i].low < bars[i + 1].low:
            local_lows.append(i)

    for prev_idx, curr_idx in zip(local_highs, local_highs[1:]):
        prev_bar = bars[prev_idx]
        curr_bar = bars[curr_idx]
        if prev_bar.high != curr_bar.high:
            continue
        key = (timeframe, curr_bar.bucket_start, "bsl", curr_bar.high)
        if key in existing_keys:
            continue
        results.append(
            make_record(
                pda_id=generate_id(counters, curr_bar.bar_date, timeframe, "bsl"),
                instrument="NQ_PLACEHOLDER",
                timeframe=timeframe,
                pda_type="bsl",
                direction=None,
                trade_date=curr_bar.bar_date,
                anchor_time=curr_bar.bucket_start,
                confirm_time=curr_bar.bucket_start,
                price=curr_bar.high,
                price_high=curr_bar.high,
                price_low=curr_bar.high,
                source="auto_scan",
                note="equal_extrema_right",
            )
        )
        existing_keys.add(key)

    for prev_idx, curr_idx in zip(local_lows, local_lows[1:]):
        prev_bar = bars[prev_idx]
        curr_bar = bars[curr_idx]
        if prev_bar.low != curr_bar.low:
            continue
        key = (timeframe, curr_bar.bucket_start, "ssl", curr_bar.low)
        if key in existing_keys:
            continue
        results.append(
            make_record(
                pda_id=generate_id(counters, curr_bar.bar_date, timeframe, "ssl"),
                instrument="NQ_PLACEHOLDER",
                timeframe=timeframe,
                pda_type="ssl",
                direction=None,
                trade_date=curr_bar.bar_date,
                anchor_time=curr_bar.bucket_start,
                confirm_time=curr_bar.bucket_start,
                price=curr_bar.low,
                price_high=curr_bar.low,
                price_low=curr_bar.low,
                source="auto_scan",
                note="equal_extrema_right",
            )
        )
        existing_keys.add(key)
    return results


def fvg_records(bars: list[Bar], timeframe: str, counters: dict[tuple[str, str, str], int]) -> list[dict]:
    results: list[dict] = []
    for i in range(2, len(bars)):
        a = bars[i - 2]
        b = bars[i - 1]
        c = bars[i]
        if c.low > a.high:
            high = c.low
            low = a.high
            results.append(
                make_record(
                    pda_id=generate_id(counters, b.bar_date, timeframe, "fvg"),
                    instrument="NQ_PLACEHOLDER",
                    timeframe=timeframe,
                    pda_type="fvg",
                    direction="bullish",
                    trade_date=b.bar_date,
                    anchor_time=b.bucket_start,
                    confirm_time=None,
                    price_high=high,
                    price_low=low,
                    price_ce=midpoint(high, low),
                    source="auto_scan",
                )
            )
        if c.high < a.low:
            high = a.low
            low = c.high
            results.append(
                make_record(
                    pda_id=generate_id(counters, b.bar_date, timeframe, "fvg"),
                    instrument="NQ_PLACEHOLDER",
                    timeframe=timeframe,
                    pda_type="fvg",
                    direction="bearish",
                    trade_date=b.bar_date,
                    anchor_time=b.bucket_start,
                    confirm_time=None,
                    price_high=high,
                    price_low=low,
                    price_ce=midpoint(high, low),
                    source="auto_scan",
                )
            )
    return results


def make_record(
    *,
    pda_id: str,
    instrument: str,
    timeframe: str,
    pda_type: str,
    direction: str | None,
    trade_date: str,
    anchor_time: datetime | None = None,
    confirm_time: datetime | None = None,
    origin_start_date: str | None = None,
    origin_end_date: str | None = None,
    price: float | None = None,
    price_high: float | None = None,
    price_low: float | None = None,
    price_ce: float | None = None,
    prev_close_time: datetime | None = None,
    prev_close_price: float | None = None,
    next_open_time: datetime | None = None,
    next_open_price: float | None = None,
    status: str = "active",
    review_state: str = "pending",
    review_role: str = "unclassified",
    source: str = "auto_scan",
    note: str = "",
) -> dict:
    return {
        "pda_id": pda_id,
        "instrument": instrument,
        "timeframe": timeframe,
        "pda_type": pda_type,
        "direction": direction,
        "trade_date": trade_date,
        "anchor_time": anchor_time,
        "confirm_time": confirm_time,
        "status": status,
        "manual_added": False,
        "manual_edited": False,
        "review_state": review_state,
        "review_role": review_role,
        "created_date": trade_date,
        "created_ts": anchor_time,
        "verified_ts": confirm_time,
        "anchor_ts": anchor_time,
        "origin_start_date": origin_start_date,
        "origin_end_date": origin_end_date,
        "price": price,
        "price_high": price_high,
        "price_low": price_low,
        "price_ce": price_ce,
        "prev_close_time": prev_close_time,
        "prev_close_price": prev_close_price,
        "next_open_time": next_open_time,
        "next_open_price": next_open_price,
        "registry_status": status,
        "source": source,
        "note": note,
    }


def replace_existing(conn: duckdb.DuckDBPyConnection, instrument: str, timeframes: Iterable[str]) -> None:
    items = list(timeframes)
    placeholders = ",".join("?" for _ in items)
    conn.execute(
        f"delete from pda_registry where instrument = ? and timeframe in ({placeholders}) and source = 'auto_scan'",
        [instrument, *items],
    )


def insert_records(conn: duckdb.DuckDBPyConnection, records: list[dict]) -> None:
    if not records:
        return
    rows = [
        [
            rec["pda_id"],
            rec["instrument"],
            rec["timeframe"],
            rec["pda_type"],
            rec["direction"],
            rec["trade_date"],
            rec["anchor_time"],
            rec["confirm_time"],
            rec["status"],
            rec["manual_added"],
            rec["manual_edited"],
            rec["review_state"],
            rec["review_role"],
            rec["created_date"],
            rec["created_ts"],
            rec["verified_ts"],
            rec["anchor_ts"],
            rec["origin_start_date"],
            rec["origin_end_date"],
            rec["price"],
            rec["price_high"],
            rec["price_low"],
            rec["price_ce"],
            rec["prev_close_time"],
            rec["prev_close_price"],
            rec["next_open_time"],
            rec["next_open_price"],
            rec["source"],
            rec["note"],
            rec["registry_status"],
        ]
        for rec in records
    ]
    conn.executemany(
        """
        insert into pda_registry (
          pda_id, instrument, timeframe, pda_type, direction,
          trade_date, anchor_time, confirm_time, status, manual_added, manual_edited, review_state, review_role,
          created_date, created_ts, verified_ts, anchor_ts,
          origin_start_date, origin_end_date,
          price, price_high, price_low, price_ce,
          prev_close_time, prev_close_price, next_open_time, next_open_price,
          source, note, registry_status
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    timeframes = resolve_timeframes(args.timeframes)
    date_from = validate_date(args.date_from)
    date_to = validate_date(args.date_to)

    repo_root = Path(__file__).resolve().parents[2]
    target_db = Path(args.target_db)
    target_db.parent.mkdir(parents=True, exist_ok=True)

    target_conn = duckdb.connect(str(target_db))
    target_conn.execute(f"attach '{Path(args.source_db)}' as source_db")
    ensure_registry_tables(target_conn, repo_root)

    if args.replace:
        replace_existing(target_conn, args.instrument, timeframes)

    counters: dict[tuple[str, str, str], int] = defaultdict(int)
    inserted: list[dict] = []
    calendar_dates = fetch_calendar_dates(
        target_conn,
        args.source_table,
        args.instrument,
        date_from,
        date_to,
    )

    for timeframe in timeframes:
        bars = fetch_bars(
            target_conn,
            args.source_table,
            args.instrument,
            timeframe,
            date_from,
            date_to,
        )
        tf_records = []
        if timeframe == "D":
            tf_records.extend(daily_point_records(bars, counters))
        tf_records.extend(swing_records(bars, timeframe, counters))
        tf_records.extend(fvg_records(bars, timeframe, counters))
        if timeframe == "D":
            tf_records.extend(
                gap_records(
                    target_conn,
                    args.source_table,
                    args.instrument,
                    counters,
                    calendar_dates,
                )
            )
        for rec in tf_records:
            rec["instrument"] = args.instrument
        insert_records(target_conn, tf_records)
        inserted.extend(tf_records)
        print(f"[{timeframe}] scanned {len(bars)} bars -> inserted {len(tf_records)} records")

    print(f"Done. Inserted {len(inserted)} total records into {target_db}")


if __name__ == "__main__":
    main()
