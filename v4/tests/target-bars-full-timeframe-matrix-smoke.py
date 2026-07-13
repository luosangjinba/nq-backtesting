#!/usr/bin/env python3
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


TARGET_MATRIX = ("30m", "1h", "2h", "4h", "8h", "12h", "1D", "1W", "1M")


def insert_bar(conn, timestamp: datetime, price: float):
    conn.execute(
        "insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)",
        ["NQ", timestamp, price, price + 2, price - 2, price + 0.5, 10],
    )


with tempfile.TemporaryDirectory() as tmpdir:
    db_path = pathlib.Path(tmpdir) / "target-matrix.duckdb"
    with duckdb.connect(str(db_path)) as conn:
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
        timestamps = [
            datetime(2026, 5, 31, 18, 0),
            datetime(2026, 6, 1, 9, 30),
            datetime(2026, 6, 7, 17, 59),
            datetime(2026, 6, 7, 18, 0),
            datetime(2026, 6, 30, 17, 59),
            datetime(2026, 6, 30, 18, 0),
            datetime(2026, 7, 6, 9, 30),
            datetime(2026, 7, 31, 17, 59),
        ]
        for index, timestamp in enumerate(timestamps):
            insert_bar(conn, timestamp, 100 + index * 10)
        dense_start = datetime(2026, 6, 1, 0, 0)
        for index in range(24 * 60):
            insert_bar(conn, dense_start + timedelta(minutes=index), 1000 + index)

    target_bars_service.clear_target_bars_cache()
    results = {}
    for timeframe in TARGET_MATRIX:
        record = target_bars_service.query_target_bars(
            str(db_path),
            "futures_1m",
            "NQ",
            "2026-05-31 18:00",
            "2026-08-01 00:00",
            timeframe,
        )
        bars = record["bars"]
        assert record["targetTimeframe"] == timeframe
        assert bars, f"{timeframe} returned no target bars"
        assert all(bar["timeframe"] == timeframe for bar in bars)
        assert all(bar["low"] <= bar["open"] <= bar["high"] for bar in bars)
        assert all(bar["low"] <= bar["close"] <= bar["high"] for bar in bars)
        timestamps = [bar["timestamp"] for bar in bars]
        assert timestamps == sorted(set(timestamps))
        results[timeframe] = len(bars)

    assert results["1W"] >= 3
    assert results["1M"] >= 2

print("target bars full timeframe matrix smoke passed", results)
