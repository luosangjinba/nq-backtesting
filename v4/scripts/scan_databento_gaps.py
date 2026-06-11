#!/usr/bin/env python3
"""Read-only gap scan for future Databento insert-only updates.

The script compares local DuckDB coverage with Databento historical availability
and prints candidate max-ts-forward refresh windows. It does not download bars
and never writes to DuckDB.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb

try:
    import databento as db
except ImportError as exc:  # pragma: no cover - exercised by CLI environment
    raise SystemExit("Missing dependency: databento. Install with `python3 -m pip install databento`.") from exc


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"
ET = ZoneInfo("America/New_York")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan V4 futures_1m coverage and Databento candidate refresh windows.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path, default v4/data/trading_data.duckdb.")
    parser.add_argument("--dataset", default="GLBX.MDP3", help="Databento dataset, default GLBX.MDP3.")
    parser.add_argument("--schema", default="ohlcv-1m", help="Databento schema, default ohlcv-1m.")
    parser.add_argument("--instrument", action="append", default=["ES", "NQ"], help="Instrument to scan. Repeatable.")
    return parser.parse_args()


def get_db_coverage(db_path: Path, instruments: list[str]) -> list[dict[str, object]]:
    placeholders = ", ".join(["?"] * len(instruments))
    query = f"""
select instrument, min(ts) as min_ts, max(ts) as max_ts, count(*) as rows
from futures_1m
where instrument in ({placeholders})
group by instrument
order by instrument
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        return conn.execute(query, instruments).fetchdf().to_dict("records")


def get_databento_end(dataset: str, schema: str) -> datetime:
    client = db.Historical()
    available = client.metadata.get_dataset_range(dataset=dataset)
    schema_end = available.get("schema", {}).get(schema, {}).get("end") or available.get("end")
    if not schema_end:
        raise RuntimeError(f"cannot determine Databento end for {dataset} {schema}")
    return datetime.fromisoformat(str(schema_end).replace("Z", "+00:00"))


def main() -> None:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    if not db_path.exists():
        raise SystemExit(f"database not found: {db_path}")

    db_coverage = get_db_coverage(db_path, args.instrument)
    db_by_instrument = {str(row["instrument"]): row for row in db_coverage}
    databento_end_utc = get_databento_end(args.dataset, args.schema)
    databento_end_et_naive = databento_end_utc.astimezone(ET).replace(tzinfo=None)
    now_utc = datetime.now(timezone.utc)

    print(f"now_utc: {now_utc.isoformat()}")
    print(f"databento_end_utc: {databento_end_utc.isoformat()}")
    print(f"databento_end_et_naive: {databento_end_et_naive}")
    print()
    print("instrument coverage and candidate max-ts-forward windows")
    for instrument in args.instrument:
        row = db_by_instrument.get(instrument)
        if not row:
            print(f"{instrument}: not present in DB")
            continue
        max_ts = row["max_ts"]
        if max_ts is None:
            print(f"{instrument}: empty coverage")
            continue
        start_candidate = max_ts
        missing_minutes_upper_bound = max(0, int((databento_end_et_naive - start_candidate).total_seconds() // 60))
        print(
            f"{instrument}: min={row['min_ts']} max={max_ts} rows={row['rows']} "
            f"candidate_start_after={start_candidate} candidate_end_before_or_at={databento_end_et_naive} "
            f"minute_span_upper_bound={missing_minutes_upper_bound}"
        )


if __name__ == "__main__":
    main()
