#!/usr/bin/env python3
"""Verify V4 futures and VIX data freshness.

This script is read-only. It reports hard data integrity failures separately
from stale-data warnings so manual refresh and future schedulers can make a
clear decision.
"""

from __future__ import annotations

import argparse
import csv
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import StringIO
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"
DEFAULT_VIX_CSV = V4_ROOT / "data" / "vix-daily.csv"
ET = ZoneInfo("America/New_York")
CSV_COLUMNS = ["DATE", "OPEN", "HIGH", "LOW", "CLOSE"]


@dataclass(frozen=True)
class FuturesCoverage:
    instrument: str
    rows: int
    min_ts: datetime | None
    max_ts: datetime | None
    duplicate_timestamps: int


@dataclass(frozen=True)
class VixReport:
    rows: int
    first_date: str
    latest_date: str
    duplicate_dates: int
    malformed_rows: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify V4 futures DB and VIX CSV freshness.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path.")
    parser.add_argument("--vix-csv", default=str(DEFAULT_VIX_CSV), help="VIX daily CSV path.")
    parser.add_argument("--instrument", action="append", choices=["ES", "NQ"], help="Instrument to verify. Repeatable.")
    parser.add_argument("--warn-es-stale-hours", type=float, default=72.0, help="Warn when ES max ts is older than this many hours.")
    parser.add_argument("--warn-vix-stale-days", type=int, default=7, help="Warn when VIX latest date is older than this many calendar days.")
    parser.add_argument("--api-url", help="Optional V4 API base URL for /v4/bars smoke.")
    parser.add_argument("--api-minutes", type=int, default=30, help="Recent API smoke window in minutes.")
    parser.add_argument("--tf", type=int, default=1, help="API smoke timeframe in minutes.")
    return parser.parse_args()


def selected_instruments(args: argparse.Namespace) -> list[str]:
    return args.instrument or ["ES", "NQ"]


def get_futures_coverage(db_path: Path, instrument: str) -> FuturesCoverage:
    query = """
select count(*) as rows, min(ts) as min_ts, max(ts) as max_ts
from futures_1m
where instrument = ?
""".strip()
    duplicate_query = """
select count(*)
from (
  select ts
  from futures_1m
  where instrument = ?
  group by ts
  having count(*) > 1
) duplicates
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        rows, min_ts, max_ts = conn.execute(query, [instrument]).fetchone()
        duplicate_timestamps = conn.execute(duplicate_query, [instrument]).fetchone()[0]
    return FuturesCoverage(
        instrument=instrument,
        rows=int(rows or 0),
        min_ts=min_ts,
        max_ts=max_ts,
        duplicate_timestamps=int(duplicate_timestamps or 0),
    )


def parse_iso_date(value: str) -> date:
    return datetime.strptime(str(value or "").strip(), "%Y-%m-%d").date()


def parse_price(value: str) -> float:
    parsed = float(str(value or "").strip())
    if parsed < 0:
        raise ValueError("negative price")
    return parsed


def verify_vix_csv(path: Path) -> VixReport:
    if not path.exists():
        return VixReport(rows=0, first_date="n/a", latest_date="n/a", duplicate_dates=0, malformed_rows=1)
    text = path.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(StringIO(text))
    fieldnames = [field.strip().upper() for field in (reader.fieldnames or []) if field is not None]
    header_ok = all(column in fieldnames for column in CSV_COLUMNS)
    if not header_ok:
        return VixReport(rows=0, first_date="n/a", latest_date="n/a", duplicate_dates=0, malformed_rows=1)

    header = {field.strip().upper(): field for field in (reader.fieldnames or []) if field is not None}
    dates: list[str] = []
    seen_dates: set[str] = set()
    duplicate_dates = 0
    malformed_rows = 0
    for raw in reader:
        if not raw or not any(str(value or "").strip() for value in raw.values()):
            continue
        try:
            row_date = parse_iso_date(raw[header["DATE"]]).isoformat()
            for column in ("OPEN", "HIGH", "LOW", "CLOSE"):
                parse_price(raw[header[column]])
        except Exception:
            malformed_rows += 1
            continue
        if row_date in seen_dates:
            duplicate_dates += 1
        seen_dates.add(row_date)
        dates.append(row_date)

    ordered = sorted(dates)
    return VixReport(
        rows=len(dates),
        first_date=ordered[0] if ordered else "n/a",
        latest_date=ordered[-1] if ordered else "n/a",
        duplicate_dates=duplicate_dates,
        malformed_rows=malformed_rows,
    )


def et_now_naive() -> datetime:
    return datetime.now(ET).replace(tzinfo=None)


def hours_old(ts: datetime | None) -> float | None:
    if ts is None:
        return None
    return max(0.0, (et_now_naive() - ts).total_seconds() / 3600.0)


def days_old(date_text: str) -> int | None:
    if date_text == "n/a":
        return None
    try:
        return max(0, (date.today() - date.fromisoformat(date_text)).days)
    except ValueError:
        return None


def request_api_bars(api_url: str, coverage: FuturesCoverage, minutes: int, tf: int) -> tuple[bool, str]:
    if coverage.max_ts is None:
        return False, "no DB max timestamp"
    start = coverage.max_ts - timedelta(minutes=max(1, minutes))
    params = urllib.parse.urlencode({
        "instrument": coverage.instrument,
        "start": start.strftime("%Y-%m-%d %H:%M"),
        "end": (coverage.max_ts + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M"),
        "tf": str(tf),
    })
    url = f"{api_url.rstrip('/')}/v4/bars?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return False, f"{url} error={exc}"
    bars = payload.get("bars") or []
    if not bars:
        return False, f"{url} error=no bars returned"
    return True, f"{url} returned_bars={len(bars)} last_bar={bars[-1]}"


def print_futures_report(coverage: FuturesCoverage, warn_hours: float, api_url: str | None, api_minutes: int, tf: int) -> tuple[int, int]:
    hard_errors = 0
    warnings = 0
    age = hours_old(coverage.max_ts)
    age_text = "n/a" if age is None else f"{age:.1f}"
    print(f"\n== futures {coverage.instrument} ==")
    print(f"rows: {coverage.rows}")
    print(f"min_ts: {coverage.min_ts or 'n/a'}")
    print(f"max_ts: {coverage.max_ts or 'n/a'}")
    print(f"age_hours: {age_text}")
    print(f"duplicate_timestamps: {coverage.duplicate_timestamps}")
    if coverage.duplicate_timestamps:
        hard_errors += 1
    if coverage.instrument == "NQ":
        print("write_status: deferred; NQ full refresh remains blocked until selected roll segments are write-eligible")
    if coverage.instrument == "ES" and age is not None and age > warn_hours:
        warnings += 1
        print(f"warning: ES max_ts is older than {warn_hours:g} hours")
    if api_url:
        ok, detail = request_api_bars(api_url, coverage, api_minutes, tf)
        print(f"api_status: {'ok' if ok else 'failed'}")
        print(f"api_detail: {detail}")
        if not ok:
            hard_errors += 1
    return hard_errors, warnings


def print_vix_report(report: VixReport, warn_days: int) -> tuple[int, int]:
    hard_errors = 0
    warnings = 0
    age = days_old(report.latest_date)
    age_text = "n/a" if age is None else str(age)
    print("\n== vix daily ==")
    print(f"rows: {report.rows}")
    print(f"first_date: {report.first_date}")
    print(f"latest_date: {report.latest_date}")
    print(f"age_days: {age_text}")
    print(f"duplicate_dates: {report.duplicate_dates}")
    print(f"malformed_rows: {report.malformed_rows}")
    if report.duplicate_dates or report.malformed_rows:
        hard_errors += 1
    if age is not None and age > warn_days:
        warnings += 1
        print(f"warning: VIX latest date is older than {warn_days} calendar days")
    return hard_errors, warnings


def main() -> int:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    vix_path = Path(args.vix_csv).expanduser().resolve()
    if not db_path.exists():
        print(f"database_status: failed")
        print(f"database: {db_path}")
        print("error: database not found")
        return 1

    print("data_freshness_status: running")
    print(f"database: {db_path}")
    print(f"vix_csv: {vix_path}")
    print(f"api_url: {args.api_url or 'disabled'}")
    hard_errors = 0
    warnings = 0
    for instrument in selected_instruments(args):
        coverage = get_futures_coverage(db_path, instrument)
        instrument_errors, instrument_warnings = print_futures_report(
            coverage,
            args.warn_es_stale_hours,
            args.api_url,
            args.api_minutes,
            args.tf,
        )
        hard_errors += instrument_errors
        warnings += instrument_warnings

    vix_errors, vix_warnings = print_vix_report(verify_vix_csv(vix_path), args.warn_vix_stale_days)
    hard_errors += vix_errors
    warnings += vix_warnings

    print("\n== summary ==")
    print(f"hard_errors: {hard_errors}")
    print(f"warnings: {warnings}")
    if hard_errors:
        print("data_freshness_status: failed")
        return 1
    print("data_freshness_status: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
