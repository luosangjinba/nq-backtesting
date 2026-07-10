#!/usr/bin/env python3
"""Verify target timeframe bars aggregate from source 1m bars without API changes."""

from __future__ import annotations

import pathlib
import sys
import tempfile
from datetime import datetime, timedelta

import duckdb


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

from server import target_bars_service  # noqa: E402


def create_db(path: pathlib.Path):
    with duckdb.connect(str(path)) as conn:
        conn.execute(
            """
create table futures_1m (
  instrument text,
  ts timestamp,
  open double,
  high double,
  low double,
  close double,
  volume bigint
)
""".strip()
        )


def insert_bar(conn, ts: datetime, price: float):
    conn.execute(
        "insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)",
        ["NQ", ts, price, price + 1, price - 1, price + 0.5, 10],
    )


def seed_8h(conn):
    start = datetime(2026, 6, 1, 0, 0)
    for index in range(0, 16 * 60):
        insert_bar(conn, start + timedelta(minutes=index), 100 + index)


def seed_daily(conn):
    for ts, price in [
        (datetime(2026, 6, 1, 16, 59), 10),
        (datetime(2026, 6, 1, 17, 0), 1000),
        (datetime(2026, 6, 1, 18, 0), 20),
        (datetime(2026, 6, 1, 18, 1), 21),
    ]:
        insert_bar(conn, ts, price)


with tempfile.TemporaryDirectory() as tmpdir:
    db_path = pathlib.Path(tmpdir) / "target-bars.duckdb"
    create_db(db_path)
    with duckdb.connect(str(db_path)) as conn:
        seed_8h(conn)
        seed_daily(conn)

    target_bars_service.clear_target_bars_cache()
    eight_hour = target_bars_service.query_target_bars(
        str(db_path),
        "futures_1m",
        "NQ",
        "2026-06-01 00:00",
        "2026-06-01 16:00",
        "8h",
    )
    assert eight_hour["cacheHit"] is False
    assert eight_hour["targetTimeframe"] == "8h"
    assert len(eight_hour["bars"]) == 2
    assert [bar["sourceBarCount"] for bar in eight_hour["bars"]] == [480, 480]
    assert [bar["time"] for bar in eight_hour["bars"]] == [
        "2026-06-01 00:00",
        "2026-06-01 08:00",
    ]
    assert eight_hour["bars"][0]["open"] == 100
    assert eight_hour["bars"][0]["close"] == 579.5
    assert eight_hour["bars"][1]["open"] == 580
    assert eight_hour["bars"][1]["close"] == 1059.5

    cached = target_bars_service.query_target_bars(
        str(db_path),
        "futures_1m",
        "NQ",
        "2026-06-01 00:00",
        "2026-06-01 16:00",
        "8h",
    )
    assert cached["cacheHit"] is True
    assert cached["bars"] == eight_hour["bars"]
    assert target_bars_service.target_bars_cache_summary()["windowCount"] == 1

    daily = target_bars_service.query_target_bars(
        str(db_path),
        "futures_1m",
        "NQ",
        "2026-06-01 16:00",
        "2026-06-01 19:00",
        "1D",
    )
    assert daily["targetTimeframe"] == "1D"
    assert len(daily["bars"]) == 2
    assert daily["bars"][0]["time"] == "2026-06-01"
    assert daily["bars"][0]["sourceBarCount"] == 1
    assert daily["bars"][0]["open"] == 10
    assert daily["bars"][0]["high"] == 11
    assert daily["bars"][1]["time"] == "2026-06-02"
    assert daily["bars"][1]["sourceBarCount"] == 2
    assert daily["bars"][1]["open"] == 20
    assert daily["bars"][1]["high"] == 22
    assert daily["bars"][1]["close"] == 21.5

    assert target_bars_service.normalize_target_timeframe_id("8H") == "8h"
    assert target_bars_service.normalize_target_timeframe_id("1d") == "1D"
    assert target_bars_service.normalize_target_timeframe_id("1M") == "1M"
    try:
        target_bars_service.query_target_bars(
            str(db_path),
            "futures_1m",
            "NQ",
            "2026-06-01 00:00",
            "2026-06-01 16:00",
            "1W",
        )
    except ValueError as exc:
        assert "not implemented yet" in str(exc)
    else:
        raise AssertionError("1W should not be implemented in Step 281")

print("target bars service step281 smoke passed")
