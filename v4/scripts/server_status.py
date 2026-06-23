#!/usr/bin/env python3
"""Read-only V4 server status check."""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import duckdb


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = Path(os.environ.get("V4_TRADING_DB", V4_ROOT / "data" / "trading_data.duckdb"))
DEFAULT_DATA_DIR = V4_ROOT / "data"
DEFAULT_WEB_URL = "http://127.0.0.1:8001/index.html"
DEFAULT_API_URL = "http://127.0.0.1:8766"
KEY_FILES = [
    "economic_calendar/economic_calendar_usd_events.csv",
    "vix-daily.csv",
    "vix-monthly.csv",
    "daily-regime-nq.csv",
    "daily-regime-es.csv",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check V4 server runtime status.")
    parser.add_argument("--web-url", default=DEFAULT_WEB_URL, help="index.html URL.")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="V4 API base URL.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path.")
    parser.add_argument("--data-dir", default=str(DEFAULT_DATA_DIR), help="V4 data directory.")
    parser.add_argument("--skip-http", action="store_true", help="Skip web/API HTTP checks.")
    parser.add_argument("--instrument", action="append", choices=["ES", "NQ"], help="Instrument to check. Repeatable.")
    return parser.parse_args()


def check_url(url: str, *, expect_json: bool = False) -> tuple[bool, str]:
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            body = response.read(2048).decode("utf-8", errors="replace")
            status = response.getcode()
    except urllib.error.URLError as exc:
        return False, f"{url} error={exc}"
    if status < 200 or status >= 300:
        return False, f"{url} status={status}"
    if expect_json:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as exc:
            return False, f"{url} invalid_json={exc}"
        return payload.get("status") == "ok", f"{url} payload={payload}"
    return True, f"{url} status={status}"


def get_db_coverage(db_path: Path, instrument: str) -> tuple[bool, str]:
    try:
        with duckdb.connect(str(db_path), read_only=True) as conn:
            row = conn.execute(
                """
select count(*) as rows, min(ts) as min_ts, max(ts) as max_ts
from futures_1m
where instrument = ?
""".strip(),
                [instrument],
            ).fetchone()
    except Exception as exc:
        return False, f"{instrument}: db_error={exc}"
    rows, min_ts, max_ts = row
    ok = int(rows or 0) > 0 and max_ts is not None
    return ok, f"{instrument}: rows={int(rows or 0)} min_ts={min_ts or 'n/a'} max_ts={max_ts or 'n/a'}"


def main() -> int:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    data_dir = Path(args.data_dir).expanduser().resolve()
    instruments = args.instrument or ["ES", "NQ"]
    hard_errors = 0
    warnings = 0

    print("server_status: running")
    print(f"web_url: {args.web_url}")
    print(f"api_url: {args.api_url}")
    print(f"database: {db_path}")
    print(f"data_dir: {data_dir}")

    if not args.skip_http:
        web_ok, web_detail = check_url(args.web_url)
        api_ok, api_detail = check_url(f"{args.api_url.rstrip('/')}/v4/health", expect_json=True)
        print(f"web_status: {'ok' if web_ok else 'failed'}")
        print(f"web_detail: {web_detail}")
        print(f"api_status: {'ok' if api_ok else 'failed'}")
        print(f"api_detail: {api_detail}")
        hard_errors += 0 if web_ok else 1
        hard_errors += 0 if api_ok else 1
    else:
        print("web_status: skipped")
        print("api_status: skipped")

    if not db_path.exists():
        print("database_status: failed")
        print("database_error: database not found")
        hard_errors += 1
    else:
        print("database_status: ok")
        for instrument in instruments:
            ok, detail = get_db_coverage(db_path, instrument)
            print(f"db_{instrument.lower()}_status: {'ok' if ok else 'failed'}")
            print(f"db_{instrument.lower()}_detail: {detail}")
            hard_errors += 0 if ok else 1

    if not data_dir.exists():
        print("data_dir_status: failed")
        hard_errors += 1
    else:
        print("data_dir_status: ok")
        for relative in KEY_FILES:
            path = data_dir / relative
            exists = path.exists()
            size = path.stat().st_size if exists else 0
            print(f"file_status: {relative} {'ok' if exists and size > 0 else 'failed'} size={size}")
            hard_errors += 0 if exists and size > 0 else 1

    print("summary")
    print(f"hard_errors: {hard_errors}")
    print(f"warnings: {warnings}")
    print(f"server_status: {'ok' if hard_errors == 0 else 'failed'}")
    return 0 if hard_errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
