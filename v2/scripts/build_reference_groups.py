#!/usr/bin/env python3
"""Build point identity groups from PDA registry and session extremes.

This is not dedupe. It creates a separate reference layer that says:
"these records point to the same exact price/time/side".
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import duckdb


SESSION_SHIFT_HOURS = 6
POINT_TYPES = {
    "bsl": "high",
    "eqh": "high",
    "daily_high": "high",
    "ict_midnight_day_high": "high",
    "ssl": "low",
    "eql": "low",
    "daily_low": "low",
    "ict_midnight_day_low": "low",
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build V2 reference groups")
    parser.add_argument("--db", default="v2/data/v2_research.duckdb")
    parser.add_argument("--instrument", default="NQ")
    parser.add_argument("--date-from", default="", help="Session date from YYYY-MM-DD")
    parser.add_argument("--date-to", default="", help="Session date to YYYY-MM-DD")
    parser.add_argument("--replace", action="store_true", help="Delete generated groups in range before insert")
    parser.add_argument("--min-members", type=int, default=2)
    return parser


def load_sql(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def ensure_tables(conn: duckdb.DuckDBPyConnection, repo_root: Path) -> None:
    conn.execute(load_sql(repo_root / "v2/schema/reference_groups.sql"))


def validate_date(value: str) -> str:
    if not value:
        return ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("date must be YYYY-MM-DD")
    return value


def delete_existing(
    conn: duckdb.DuckDBPyConnection,
    instrument: str,
    date_from: str,
    date_to: str,
) -> None:
    clauses = ["instrument = ?", "source = 'auto_group'"]
    params: list[object] = [instrument]
    if date_from:
        clauses.append("trade_date >= cast(? as date)")
        params.append(date_from)
    if date_to:
        clauses.append("trade_date <= cast(? as date)")
        params.append(date_to)
    where_sql = " and ".join(clauses)
    group_ids = [row[0] for row in conn.execute(f"select group_id from reference_groups where {where_sql}", params).fetchall()]
    if not group_ids:
        return
    placeholders = ",".join("?" for _ in group_ids)
    conn.execute(f"delete from reference_group_members where group_id in ({placeholders})", group_ids)
    conn.execute(f"delete from reference_groups where group_id in ({placeholders})", group_ids)


def insert_groups(
    conn: duckdb.DuckDBPyConnection,
    instrument: str,
    date_from: str,
    date_to: str,
    min_members: int,
) -> tuple[int, int]:
    clauses = ["instrument = ?"]
    params: list[object] = [instrument]
    if date_from:
        clauses.append("trade_date >= cast(? as date)")
        params.append(date_from)
    if date_to:
        clauses.append("trade_date <= cast(? as date)")
        params.append(date_to)
    group_filter = " and ".join(clauses)

    point_case = "case pda_type " + " ".join(
        f"when '{pda_type}' then '{side}'" for pda_type, side in POINT_TYPES.items()
    ) + " end"
    type_list = ",".join(f"'{item}'" for item in POINT_TYPES)

    conn.execute(
        f"""
        create or replace temporary table reference_group_candidates as
        with pda_points as (
          select
            instrument,
            cast(coalesce(occurrence_time, anchor_time) + interval '{SESSION_SHIFT_HOURS} hour' as date) as trade_date,
            coalesce(occurrence_time, anchor_time) as event_time,
            price,
            {point_case} as side,
            'pda' as member_type,
            pda_id as member_ref,
            timeframe,
            pda_type,
            review_role,
            cast(null as varchar) as session_name,
            timeframe || ' ' || upper(pda_type) || ' ' || cast(price as varchar) || ' @ ' || strftime(coalesce(occurrence_time, anchor_time), '%Y-%m-%d %H:%M') as label
          from pda_registry
          where instrument = ?
            and pda_type in ({type_list})
            and price is not null
            and coalesce(occurrence_time, anchor_time) is not null
        ),
        pd_extreme_points as (
          select
            instrument,
            trade_date,
            high_time as event_time,
            high_price as price,
            'high' as side,
            'pd_extreme' as member_type,
            'pdext:' || instrument || ':' || cast(trade_date as varchar) || ':' || session_name || ':high' as member_ref,
            cast(null as varchar) as timeframe,
            cast(null as varchar) as pda_type,
            cast(null as varchar) as review_role,
            session_name,
            trade_date || ' ' || session_name || ' HIGH ' || cast(high_price as varchar) || ' @ ' || strftime(high_time, '%Y-%m-%d %H:%M') as label
          from pd_extremes
          where instrument = ?
          union all
          select
            instrument,
            trade_date,
            low_time as event_time,
            low_price as price,
            'low' as side,
            'pd_extreme' as member_type,
            'pdext:' || instrument || ':' || cast(trade_date as varchar) || ':' || session_name || ':low' as member_ref,
            cast(null as varchar) as timeframe,
            cast(null as varchar) as pda_type,
            cast(null as varchar) as review_role,
            session_name,
            trade_date || ' ' || session_name || ' LOW ' || cast(low_price as varchar) || ' @ ' || strftime(low_time, '%Y-%m-%d %H:%M') as label
          from pd_extremes
          where instrument = ?
        )
        select *
        from (
          select * from pda_points
          union all
          select * from pd_extreme_points
        )
        where {group_filter}
        """,
        [instrument, instrument, instrument, *params],
    )

    conn.execute(
        """
        create or replace temporary table grouped_points as
        select
          instrument,
          trade_date,
          event_time,
          price,
          side,
          count(*) as member_count,
          sum(case when member_type = 'pda' then 1 else 0 end) as pda_count,
          sum(case when member_type = 'pd_extreme' then 1 else 0 end) as pd_extreme_count,
          string_agg(distinct coalesce(timeframe, ''), ',' order by coalesce(timeframe, '')) as timeframes,
          string_agg(distinct coalesce(review_role, session_name, pda_type, ''), ',' order by coalesce(review_role, session_name, pda_type, '')) as roles
        from reference_group_candidates
        group by instrument, trade_date, event_time, price, side
        having count(*) >= ?
        """,
        [min_members],
    )

    conn.execute(
        """
        insert into reference_groups (
          group_id, instrument, trade_date, event_time, price, side,
          member_count, pda_count, pd_extreme_count, timeframes, roles, source, note
        )
        select
          'rg_' || instrument || '_' ||
            strftime(event_time, '%Y%m%d_%H%M') || '_' ||
            side || '_' ||
            replace(replace(cast(price as varchar), '.', 'p'), '-', 'm') as group_id,
          instrument,
          trade_date,
          event_time,
          price,
          side,
          member_count,
          pda_count,
          pd_extreme_count,
          nullif(trim(both ',' from timeframes), ''),
          nullif(trim(both ',' from roles), ''),
          'auto_group',
          ''
        from grouped_points
        """
    )

    conn.execute(
        """
        insert into reference_group_members (
          group_id, member_type, member_ref, instrument, trade_date, event_time, price, side,
          timeframe, pda_type, review_role, session_name, label, source
        )
        select
          'rg_' || c.instrument || '_' ||
            strftime(c.event_time, '%Y%m%d_%H%M') || '_' ||
            c.side || '_' ||
            replace(replace(cast(c.price as varchar), '.', 'p'), '-', 'm') as group_id,
          c.member_type,
          c.member_ref,
          c.instrument,
          c.trade_date,
          c.event_time,
          c.price,
          c.side,
          c.timeframe,
          c.pda_type,
          c.review_role,
          c.session_name,
          c.label,
          'auto_group'
        from reference_group_candidates c
        join grouped_points g
          on g.instrument = c.instrument
         and g.trade_date = c.trade_date
         and g.event_time = c.event_time
         and g.price = c.price
         and g.side = c.side
        """
    )

    group_count = conn.execute("select count(*) from reference_groups where source = 'auto_group'").fetchone()[0]
    member_count = conn.execute("select count(*) from reference_group_members where source = 'auto_group'").fetchone()[0]
    return int(group_count), int(member_count)


def main() -> None:
    args = build_parser().parse_args()
    date_from = validate_date(args.date_from)
    date_to = validate_date(args.date_to)
    repo_root = Path(__file__).resolve().parents[2]
    db_path = Path(args.db)
    if not db_path.exists():
        raise FileNotFoundError(f"db not found: {db_path}")

    conn = duckdb.connect(str(db_path))
    ensure_tables(conn, repo_root)
    if args.replace:
        delete_existing(conn, args.instrument, date_from, date_to)
    group_count, member_count = insert_groups(conn, args.instrument, date_from, date_to, args.min_members)
    print(f"reference_groups={group_count}")
    print(f"reference_group_members={member_count}")


if __name__ == "__main__":
    main()
