#!/usr/bin/env python3
"""Smoke-test that V4 API can read recently available futures bars."""

from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta
from pathlib import Path

import duckdb


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify /v4/bars can read latest DB bars.")
    parser.add_argument("--instrument", default="ES", choices=["ES", "NQ"], help="Instrument to verify.")
    parser.add_argument("--api-url", default="http://127.0.0.1:8766", help="V4 API base URL.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path.")
    parser.add_argument("--minutes", type=int, default=30, help="Recent window size to request.")
    parser.add_argument("--tf", type=int, default=1, help="Timeframe in minutes.")
    return parser.parse_args()


def db_max_ts(db_path: Path, instrument: str):
    with duckdb.connect(str(db_path), read_only=True) as conn:
        return conn.execute("select max(ts) from futures_1m where instrument = ?", [instrument]).fetchone()[0]


def main() -> int:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    max_ts = db_max_ts(db_path, args.instrument)
    if max_ts is None:
        print(f"no DB rows for {args.instrument}")
        return 2

    start = max_ts - timedelta(minutes=max(1, args.minutes))
    params = urllib.parse.urlencode({
        "instrument": args.instrument,
        "start": start.strftime("%Y-%m-%d %H:%M"),
        "end": (max_ts + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M"),
        "tf": str(args.tf),
    })
    url = f"{args.api_url.rstrip('/')}/v4/bars?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        print(f"api_status: failed")
        print(f"url: {url}")
        print(f"error: {exc}")
        return 1

    bars = payload.get("bars") or []
    if not bars:
        print("api_status: failed")
        print(f"url: {url}")
        print("error: no bars returned")
        return 1

    last = bars[-1]
    print("api_status: ok")
    print(f"url: {url}")
    print(f"instrument: {args.instrument}")
    print(f"db_max_ts: {max_ts}")
    print(f"returned_bars: {len(bars)}")
    print(f"last_bar: {last}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
