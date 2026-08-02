#!/usr/bin/env python3
"""Prove V7 projected history serves ETH/RTH calendar-aligned display context."""

from __future__ import annotations

import pathlib
import sys
import tempfile
from datetime import datetime, timezone

import duckdb


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

from server import projected_history_service  # noqa: E402


def insert_bar(connection, timestamp, price):
    connection.execute(
        "insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)",
        ["NQ", timestamp, price, price + 2, price - 2, price + 1, 10],
    )


def epoch(value):
    return int(datetime.fromisoformat(value).replace(tzinfo=timezone.utc).timestamp())


with tempfile.TemporaryDirectory() as tmpdir:
    db_path = pathlib.Path(tmpdir) / "calendar-projected.duckdb"
    with duckdb.connect(str(db_path)) as connection:
        connection.execute(
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
        for index, timestamp in enumerate([
            datetime(2026, 5, 3, 18, 0),
            datetime(2026, 5, 4, 9, 30),
            datetime(2026, 5, 4, 16, 14),
            datetime(2026, 5, 4, 16, 59),
            datetime(2026, 5, 8, 16, 14),
            datetime(2026, 5, 8, 16, 59),
            datetime(2026, 5, 31, 18, 0),
            datetime(2026, 6, 1, 9, 30),
            datetime(2026, 6, 30, 16, 14),
            datetime(2026, 6, 30, 16, 59),
        ]):
            insert_bar(connection, timestamp, 100 + index * 10)

    projected_history_service.clear_projected_history_cache()
    results = {}
    for mode in ("eth", "rth"):
        for timeframe in ("1D", "1W", "1M"):
            record = projected_history_service.query_projected_history(
                str(db_path),
                "futures_1m",
                "NQ",
                "2026-05-01 00:00",
                "2026-07-02 00:00",
                timeframe,
                mode,
            )
            assert record["targetTimeframe"] == timeframe
            assert record["sessionHoursMode"] == mode
            assert record["bars"]
            assert [bar["timestamp"] for bar in record["bars"]] == sorted(
                {bar["timestamp"] for bar in record["bars"]}
            )
            results[(mode, timeframe)] = record["bars"]

    eth_daily = results[("eth", "1D")][0]
    assert eth_daily["timestamp"] == epoch("2026-05-03T22:00:00")
    assert eth_daily["displayTimestamp"] == epoch("2026-05-04T20:59:00")
    assert eth_daily["labelDate"] == "2026-05-04"

    rth_daily = results[("rth", "1D")][0]
    assert rth_daily["timestamp"] == epoch("2026-05-04T13:30:00")
    assert rth_daily["displayTimestamp"] == epoch("2026-05-04T20:14:00")
    assert rth_daily["labelDate"] == "2026-05-04"

    eth_weekly = results[("eth", "1W")][0]
    assert eth_weekly["timestamp"] == epoch("2026-05-03T22:00:00")
    assert eth_weekly["displayTimestamp"] == epoch("2026-05-08T20:59:00")
    assert eth_weekly["labelDate"] == "2026-05-04"

    june_eth = results[("eth", "1M")][-1]
    assert june_eth["timestamp"] == epoch("2026-05-31T22:00:00")
    assert june_eth["displayTimestamp"] == epoch("2026-06-30T20:59:00")
    assert june_eth["labelDate"] == "2026-06-01"

    cached = projected_history_service.query_projected_history(
        str(db_path), "futures_1m", "NQ", "2026-05-01 00:00", "2026-07-02 00:00", "1M", "eth"
    )
    assert cached["cacheHit"] is True

print("projected history calendar timeframe smoke passed", {
    f"{mode}-{timeframe}": len(bars) for (mode, timeframe), bars in results.items()
})
