"""Read-only ES/NQ coverage reporting for the data-acquisition admin surface."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb


ET = ZoneInfo("America/New_York")
SUPPORTED_INSTRUMENTS = ("ES", "NQ")


def _iso(value):
    return value.isoformat(sep=" ", timespec="minutes") if value else None


def _age_hours(value, now):
    if not value:
        return None
    return round(max(0.0, (now - value).total_seconds() / 3600.0), 1)


def build_market_data_coverage(db_path, *, instruments=SUPPORTED_INSTRUMENTS, now=None):
    path = Path(db_path).expanduser().resolve()
    if not path.exists():
        raise ValueError(f"Market-data database does not exist: {path}")
    requested = tuple(str(value).strip().upper() for value in instruments)
    if not requested or any(value not in SUPPORTED_INSTRUMENTS for value in requested):
        raise ValueError("Coverage instruments must be ES and/or NQ")
    current = now or datetime.now(ET).replace(tzinfo=None)
    rows = []
    with duckdb.connect(str(path), read_only=True) as conn:
        for instrument in requested:
            count, first_ts, latest_ts = conn.execute(
                """
                select count(*), min(ts), max(ts)
                from futures_1m
                where instrument = ?
                """,
                [instrument],
            ).fetchone()
            duplicates = conn.execute(
                """
                select count(*) from (
                  select ts from futures_1m
                  where instrument = ?
                  group by ts having count(*) > 1
                ) duplicate_keys
                """,
                [instrument],
            ).fetchone()[0]
            rows.append({
                "instrument": instrument,
                "rows": int(count or 0),
                "firstTimestamp": _iso(first_ts),
                "latestTimestamp": _iso(latest_ts),
                "ageHours": _age_hours(latest_ts, current),
                "duplicateTimestamps": int(duplicates or 0),
                "integrity": "ok" if not duplicates else "failed",
            })
    return rows


def build_coverage_result(db_path):
    coverage = build_market_data_coverage(db_path)
    all_clean = all(item["integrity"] == "ok" for item in coverage)
    output = ["market_data_coverage_status: ok", f"database: {Path(db_path).expanduser().resolve()}"]
    for item in coverage:
        output.extend([
            "",
            f"== {item['instrument']} ==",
            f"rows: {item['rows']}",
            f"first_ts: {item['firstTimestamp'] or 'n/a'}",
            f"latest_ts: {item['latestTimestamp'] or 'n/a'}",
            f"age_hours: {item['ageHours'] if item['ageHours'] is not None else 'n/a'}",
            f"duplicate_timestamps: {item['duplicateTimestamps']}",
        ])
    return {
        "ok": all_clean,
        "returncode": 0 if all_clean else 1,
        "command": "market data coverage",
        "coverage": coverage,
        "output": "\n".join(output),
    }
