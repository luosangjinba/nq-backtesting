#!/usr/bin/env python3
"""Generate non-destructive short-pivot suggestions from Layer-1 bsl/ssl candidates.

Rules for the minimal test version:
- only look at D / 4H / 1H and pda_type in (bsl, ssl)
- walk candidates in chronological order per timeframe
- compress consecutive same-type candidates into one run
- for bsl runs keep the highest point
- for ssl runs keep the lowest point
- on price ties keep the right-most point
- selected runs naturally alternate high/low by construction

The script writes results to a separate DuckDB so the main registry stays untouched.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import duckdb


TIMEFRAMES = ("D", "4H", "1H")
PDA_TYPES = ("bsl", "ssl")
BAR_DURATION = {
    "D": timedelta(days=1),
    "4H": timedelta(hours=4),
    "1H": timedelta(hours=1),
}


@dataclass
class Candidate:
    pda_id: str
    instrument: str
    timeframe: str
    pda_type: str
    trade_date: str
    anchor_time: str
    price: float | None
    price_high: float | None
    price_low: float | None
    review_role: str | None
    note: str | None
    source: str | None
    extreme_touch_ts: str = ""

    @property
    def pivot_price(self) -> float:
        if self.pda_type == "bsl":
            return float(self.price_high if self.price_high is not None else self.price or 0.0)
        return float(self.price_low if self.price_low is not None else self.price or 0.0)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate minimal short-pivot suggestions")
    parser.add_argument("--source-db", default="v2/data/v2_research.duckdb")
    parser.add_argument("--price-db", default="trading_data.duckdb")
    parser.add_argument("--price-table", default="futures_1m")
    parser.add_argument("--target-db", default="/tmp/pda_short_pivot_2012.duckdb")
    parser.add_argument("--instrument", default="NQ")
    parser.add_argument("--date-from", default="2012-01-01")
    parser.add_argument("--date-to", default="2012-12-31")
    return parser


def role_for(timeframe: str, pda_type: str) -> str:
    mapping = {
        ("D", "bsl"): "d_short_high",
        ("D", "ssl"): "d_short_low",
        ("4H", "bsl"): "h4_short_high",
        ("4H", "ssl"): "h4_short_low",
        ("1H", "bsl"): "h1_short_high",
        ("1H", "ssl"): "h1_short_low",
    }
    return mapping[(timeframe, pda_type)]


def fetch_candidates(
    conn: duckdb.DuckDBPyConnection,
    instrument: str,
    timeframe: str,
    date_from: str,
    date_to: str,
) -> list[Candidate]:
    rows = conn.execute(
        """
        select
          pda_id, instrument, timeframe, pda_type,
          cast(trade_date as varchar) as trade_date,
          strftime(anchor_time, '%Y-%m-%d %H:%M:%S') as anchor_time,
          price, price_high, price_low, review_role, note, source
        from pda_registry
        where instrument = ?
          and timeframe = ?
          and pda_type in ('bsl', 'ssl')
          and trade_date between ? and ?
        order by anchor_time, pda_type, pda_id
        """,
        [instrument, timeframe, date_from, date_to],
    ).fetchall()
    return [Candidate(*row) for row in rows]


def resolve_extreme_touch_ts(
    price_conn: duckdb.DuckDBPyConnection,
    price_table: str,
    candidate: Candidate,
) -> str:
    anchor_dt = datetime.strptime(candidate.anchor_time, "%Y-%m-%d %H:%M:%S")
    end_dt = anchor_dt + BAR_DURATION[candidate.timeframe]
    if candidate.pda_type == "bsl":
        sql = f"""
            select min(ts)
            from {price_table}
            where instrument = ?
              and ts >= ?
              and ts < ?
              and high = ?
        """
        price = candidate.pivot_price
    else:
        sql = f"""
            select min(ts)
            from {price_table}
            where instrument = ?
              and ts >= ?
              and ts < ?
              and low = ?
        """
        price = candidate.pivot_price
    row = price_conn.execute(sql, [candidate.instrument, anchor_dt, end_dt, price]).fetchone()
    if not row or not row[0]:
        return candidate.anchor_time
    return row[0].strftime("%Y-%m-%d %H:%M:%S")


def attach_intrabar_order(
    price_conn: duckdb.DuckDBPyConnection,
    price_table: str,
    candidates: list[Candidate],
) -> list[Candidate]:
    resolved: list[Candidate] = []
    cache: dict[tuple[str, str, str, float], str] = {}
    for item in candidates:
        key = (item.instrument, item.timeframe, item.pda_type, item.pivot_price)
        cache_key = (item.anchor_time, *key)
        if cache_key not in cache:
            cache[cache_key] = resolve_extreme_touch_ts(price_conn, price_table, item)
        item.extreme_touch_ts = cache[cache_key]
        resolved.append(item)
    return resolved


def choose_winner(run: list[Candidate]) -> Candidate:
    if run[0].pda_type == "bsl":
        best_price = max(item.pivot_price for item in run)
        best = [item for item in run if item.pivot_price == best_price]
        return max(best, key=lambda item: (item.anchor_time, item.pda_id))
    best_price = min(item.pivot_price for item in run)
    best = [item for item in run if item.pivot_price == best_price]
    return max(best, key=lambda item: (item.anchor_time, item.pda_id))


def build_run_outputs(candidates: list[Candidate]) -> tuple[list[tuple], list[tuple]]:
    candidate_rows: list[tuple] = []
    suggestion_rows: list[tuple] = []
    if not candidates:
        return candidate_rows, suggestion_rows

    run_index = 0
    current_run: list[Candidate] = []

    def flush_run(run: list[Candidate], idx: int) -> None:
        if not run:
            return
        winner = choose_winner(run)
        selected_role = role_for(winner.timeframe, winner.pda_type)
        for item in run:
            candidate_rows.append(
                (
                    item.timeframe,
                    item.pda_type,
                    idx,
                    len(run),
                    item.pda_id,
                    item.trade_date,
                    item.anchor_time,
                    item.extreme_touch_ts,
                    item.pivot_price,
                    item.review_role or "",
                    item.note or "",
                    item.source or "",
                    item.pda_id == winner.pda_id,
                    winner.pda_id,
                    winner.anchor_time,
                    selected_role,
                )
            )
        suggestion_rows.append(
            (
                winner.timeframe,
                winner.pda_type,
                idx,
                winner.pda_id,
                winner.trade_date,
                winner.anchor_time,
                winner.extreme_touch_ts,
                winner.pivot_price,
                selected_role,
                len(run),
            )
        )

    candidates = sorted(
        candidates,
        key=lambda item: (item.anchor_time, item.extreme_touch_ts or item.anchor_time, item.pda_type, item.pda_id),
    )

    for item in candidates:
        if not current_run or current_run[-1].pda_type == item.pda_type:
            current_run.append(item)
            continue
        run_index += 1
        flush_run(current_run, run_index)
        current_run = [item]

    if current_run:
        run_index += 1
        flush_run(current_run, run_index)

    return candidate_rows, suggestion_rows


def write_output(target_db: Path, candidate_rows: list[tuple], suggestion_rows: list[tuple]) -> None:
    if target_db.exists():
        target_db.unlink()
    conn = duckdb.connect(str(target_db))
    conn.execute(
        """
        create table short_pivot_candidates (
          timeframe varchar,
          pda_type varchar,
          run_index integer,
          run_size integer,
          pda_id varchar,
          trade_date date,
          anchor_time timestamp,
          extreme_touch_ts timestamp,
          pivot_price double,
          current_review_role varchar,
          note varchar,
          source varchar,
          is_selected boolean,
          selected_pda_id varchar,
          selected_anchor_time timestamp,
          suggested_review_role varchar
        )
        """
    )
    conn.execute(
        """
        create table short_pivot_suggestions (
          timeframe varchar,
          pda_type varchar,
          run_index integer,
          pda_id varchar,
          trade_date date,
          anchor_time timestamp,
          extreme_touch_ts timestamp,
          pivot_price double,
          suggested_review_role varchar,
          run_size integer
        )
        """
    )
    if candidate_rows:
        conn.executemany(
            """
            insert into short_pivot_candidates values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            candidate_rows,
        )
    if suggestion_rows:
        conn.executemany(
            """
            insert into short_pivot_suggestions values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            suggestion_rows,
        )
    conn.close()


def main() -> None:
    args = build_parser().parse_args()
    conn = duckdb.connect(args.source_db, read_only=True)
    price_conn = duckdb.connect(args.price_db, read_only=True)

    candidate_rows: list[tuple] = []
    suggestion_rows: list[tuple] = []
    for timeframe in TIMEFRAMES:
        items = fetch_candidates(conn, args.instrument, timeframe, args.date_from, args.date_to)
        items = attach_intrabar_order(price_conn, args.price_table, items)
        cand_rows, sug_rows = build_run_outputs(items)
        candidate_rows.extend(cand_rows)
        suggestion_rows.extend(sug_rows)

    target_db = Path(args.target_db)
    target_db.parent.mkdir(parents=True, exist_ok=True)
    write_output(target_db, candidate_rows, suggestion_rows)

    out = duckdb.connect(str(target_db), read_only=True)
    print(f"wrote {target_db}")
    print(out.execute("select timeframe, suggested_review_role, count(*) as n from short_pivot_suggestions group by 1,2 order by 1,2").fetchdf().to_string(index=False))


if __name__ == "__main__":
    main()
