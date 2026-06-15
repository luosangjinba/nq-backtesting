#!/usr/bin/env python3
"""Verify V4 economic calendar CSV integrity."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = V4_ROOT / "data" / "economic_calendar" / "economic_calendar_usd_events.csv"
V4_COLUMNS = [
    "event_date",
    "event_time_et",
    "event_time_utc",
    "currency",
    "title",
    "impact",
    "event_type",
    "all_day",
    "default_visible",
    "actual",
    "forecast",
    "previous",
]
VALID_IMPACTS = {"High", "Medium", "Low"}
VALID_BOOL = {"true", "false"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify V4 economic calendar CSV integrity.")
    parser.add_argument("--csv", default=str(DEFAULT_CSV), help="Economic calendar CSV path.")
    return parser.parse_args()


def read_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def event_key(row: dict[str, str]) -> tuple[str, str, str, str]:
    return (
        str(row.get("event_date") or "").strip(),
        str(row.get("event_time_et") or "").strip(),
        str(row.get("currency") or "").strip(),
        str(row.get("title") or "").strip(),
    )


def verify_timestamp_pair(row: dict[str, str]) -> bool:
    event_time_et = str(row.get("event_time_et") or "").strip()
    event_time_utc = str(row.get("event_time_utc") or "").strip()
    if not event_time_et and not event_time_utc:
        return True
    if not event_time_et or not event_time_utc:
        return False
    try:
        parsed_et = datetime.fromisoformat(event_time_et)
        parsed_utc = datetime.strptime(event_time_utc, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    return parsed_et.astimezone(timezone.utc) == parsed_utc


def verify_csv(path: Path) -> tuple[int, list[str], dict[str, str]]:
    hard_errors = 0
    messages: list[str] = []
    stats = {
        "rows": "0",
        "date_min": "n/a",
        "date_max": "n/a",
        "duplicate_keys": "0",
        "malformed_rows": "0",
    }
    if not path.exists():
        return 1, [f"missing CSV: {path}"], stats

    header, rows = read_rows(path)
    if header != V4_COLUMNS:
        hard_errors += 1
        messages.append("header mismatch")

    seen: set[tuple[str, str, str, str]] = set()
    duplicate_keys = 0
    malformed_rows = 0
    sort_keys: list[tuple[str, str, str, str]] = []
    dates: list[str] = []
    for index, row in enumerate(rows, start=2):
        row_error = False
        event_date = str(row.get("event_date") or "").strip()
        try:
            datetime.strptime(event_date, "%Y-%m-%d")
        except ValueError:
            row_error = True
        if str(row.get("impact") or "").strip() not in VALID_IMPACTS:
            row_error = True
        if str(row.get("all_day") or "").strip() not in VALID_BOOL:
            row_error = True
        if str(row.get("default_visible") or "").strip() not in VALID_BOOL:
            row_error = True
        all_day = str(row.get("all_day") or "").strip() == "true"
        if all_day and (str(row.get("event_time_et") or "").strip() or str(row.get("event_time_utc") or "").strip()):
            row_error = True
        if not all_day and not verify_timestamp_pair(row):
            row_error = True
        key = event_key(row)
        if key in seen:
            duplicate_keys += 1
        seen.add(key)
        sort_keys.append(key)
        if event_date:
            dates.append(event_date)
        if row_error:
            malformed_rows += 1
            if len(messages) < 10:
                messages.append(f"malformed row {index}: {key}")

    if sort_keys != sorted(sort_keys):
        hard_errors += 1
        messages.append("rows are not sorted by event_date,event_time_et,currency,title")
    if duplicate_keys:
        hard_errors += 1
    if malformed_rows:
        hard_errors += 1
    stats = {
        "rows": str(len(rows)),
        "date_min": min(dates) if dates else "n/a",
        "date_max": max(dates) if dates else "n/a",
        "duplicate_keys": str(duplicate_keys),
        "malformed_rows": str(malformed_rows),
    }
    return hard_errors, messages, stats


def main() -> int:
    args = parse_args()
    path = Path(args.csv).expanduser().resolve()
    hard_errors, messages, stats = verify_csv(path)
    print("economic_calendar_verify_status: ok" if hard_errors == 0 else "economic_calendar_verify_status: failed")
    print(f"csv: {path}")
    for key in ("rows", "date_min", "date_max", "duplicate_keys", "malformed_rows"):
        print(f"{key}: {stats[key]}")
    for message in messages:
        print(f"error: {message}")
    return 0 if hard_errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
