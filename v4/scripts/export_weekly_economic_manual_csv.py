#!/usr/bin/env python3
"""Export a weekly ForexFactory calendar CSV for manual recap import.

This script is intentionally independent from the V4 API server. It fetches or
converts ForexFactory rows on the local machine and writes the manual-import
schema accepted by Data Maintenance:

Title,Country,Date,Time,Impact,Forecast,Previous,URL
"""

from __future__ import annotations

import argparse
import csv
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import update_economic_calendar as economic_calendar


SCRIPT_DIR = Path(__file__).resolve().parent
V4_ROOT = SCRIPT_DIR.parents[0]
DEFAULT_OUTPUT_DIR = V4_ROOT / "data" / "economic_calendar" / "manual_import_exports"
MANUAL_COLUMNS = ["Title", "Country", "Date", "Time", "Impact", "Forecast", "Previous", "URL"]


def parse_iso_date(value: str, field_name: str) -> date:
    try:
        return datetime.strptime(str(value or "").strip(), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be YYYY-MM-DD") from exc


def next_monday(anchor: date) -> date:
    return anchor + timedelta(days=(7 - anchor.weekday()) % 7 or 7)


def week_range(anchor: date, week: str) -> tuple[date, date]:
    if week == "this":
        start = anchor - timedelta(days=anchor.weekday())
    elif week == "next":
        start = next_monday(anchor)
    else:
        raise ValueError("--week must be this or next")
    return start, start + timedelta(days=6)


def default_output_path(output_dir: Path, start: date, end: date, currency: str) -> Path:
    return output_dir / f"economic_manual_{currency.lower()}_{start.isoformat()}_{end.isoformat()}.csv"


def compact_manual_time(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    dt = datetime.fromisoformat(text)
    hour = dt.hour % 12 or 12
    suffix = "am" if dt.hour < 12 else "pm"
    return f"{hour}:{dt.minute:02d}{suffix}"


def v4_row_to_manual(row: dict[str, str]) -> dict[str, str]:
    event_date = parse_iso_date(row.get("event_date", ""), "event_date")
    return {
        "Title": str(row.get("title") or "").strip(),
        "Country": str(row.get("currency") or "").strip().upper(),
        "Date": event_date.strftime("%m-%d-%Y"),
        "Time": compact_manual_time(str(row.get("event_time_et") or "").strip()),
        "Impact": str(row.get("impact") or "Low").strip() or "Low",
        "Forecast": str(row.get("forecast") or "").strip(),
        "Previous": str(row.get("previous") or "").strip(),
        "URL": "",
    }


def write_manual_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANUAL_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def build_rows(args: argparse.Namespace, start: date, end: date) -> tuple[list[dict[str, str]], list[object]]:
    calendar_args = SimpleNamespace(
        months=None,
        from_date=start.isoformat(),
        to_date=end.isoformat(),
        output_dir=args.raw_output_dir,
        csv=str(economic_calendar.DEFAULT_ECONOMIC_CALENDAR_CSV),
        backup_dir=str(economic_calendar.DEFAULT_BACKUP_DIR),
        raw_dir=args.raw_dir,
        candidate_csv=str(economic_calendar.DEFAULT_CANDIDATE_CSV),
        timezone=args.timezone,
        currencies=[args.currency],
        impacts=args.impacts,
        show_browser=args.show_browser,
    )
    return economic_calendar.build_candidate_rows(calendar_args)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export next week's economic calendar as a manual-import CSV.")
    parser.add_argument("--week", choices=["this", "next"], default="next", help="Week to export when no explicit date range is provided.")
    parser.add_argument("--anchor-date", help="Anchor date for --week, mainly for tests. Defaults to today.")
    parser.add_argument("--from-date", help="Inclusive start date override, YYYY-MM-DD.")
    parser.add_argument("--to-date", help="Inclusive end date override, YYYY-MM-DD.")
    parser.add_argument("--currency", default="USD", help="Currency to keep. Default: USD.")
    parser.add_argument("--timezone", default="America/New_York", help="Target timezone for timed events.")
    parser.add_argument("--impacts", nargs="+", default=["red", "orange", "yellow", "gray"], help="ForexFactory impact colors to keep.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for the manual-import CSV.")
    parser.add_argument("--output", help="Explicit output CSV path.")
    parser.add_argument("--raw-output-dir", default=str(economic_calendar.DEFAULT_OUTPUT_DIR), help="Directory for raw monthly fetch cache.")
    parser.add_argument("--raw-dir", help="Use existing raw ForexFactory CSVs instead of fetching.")
    parser.add_argument("--show-browser", action="store_true", help="Run Chrome visibly instead of headless.")
    parser.add_argument("--dry-run", action="store_true", help="Report what would be exported without writing a CSV.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        if bool(args.from_date) != bool(args.to_date):
            raise ValueError("--from-date and --to-date must be provided together")
        if args.from_date:
            start = parse_iso_date(args.from_date, "--from-date")
            end = parse_iso_date(args.to_date, "--to-date")
            if end < start:
                raise ValueError("--to-date must be on or after --from-date")
        else:
            anchor = parse_iso_date(args.anchor_date, "--anchor-date") if args.anchor_date else date.today()
            start, end = week_range(anchor, args.week)

        currency = str(args.currency or "USD").strip().upper() or "USD"
        args.currency = currency
        output_path = Path(args.output).expanduser().resolve() if args.output else default_output_path(
            Path(args.output_dir).expanduser().resolve(),
            start,
            end,
            currency,
        )
        v4_rows, selectors = build_rows(args, start, end)
        v4_rows = [row for row in v4_rows if str(row.get("currency") or "").strip().upper() == currency]
        manual_rows = [v4_row_to_manual(row) for row in v4_rows]

        print("economic_manual_export_status: dry-run" if args.dry_run else "economic_manual_export_status: ok")
        print(f"requested_range: {start.isoformat()} -> {end.isoformat()}")
        print(f"months: {', '.join(selector.slug for selector in selectors)}")
        print(f"currency: {currency}")
        print(f"timezone: {args.timezone}")
        print(f"candidate_rows: {len(v4_rows)}")
        print(f"manual_rows: {len(manual_rows)}")
        print(f"output_csv: {output_path}")
        if manual_rows:
            print(f"date_min: {manual_rows[0]['Date']}")
            print(f"date_max: {manual_rows[-1]['Date']}")
            for row in manual_rows[:5]:
                print(f"sample: {row['Date']} {row['Time'] or 'all-day'} {row['Country']} {row['Impact']} {row['Title']}")

        if args.dry_run:
            print("write_status: dry-run; no CSV was written")
            return 0

        write_manual_csv(output_path, manual_rows)
        print("write_status: wrote manual economic import CSV")
        return 0
    except Exception as exc:
        print("economic_manual_export_status: failed")
        print(f"error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
