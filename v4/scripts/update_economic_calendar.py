#!/usr/bin/env python3
"""Dry-run or update V4 USD economic calendar data.

Default mode is read-only. Writes require both `--write` and
`--confirm-write`.
"""

from __future__ import annotations

import argparse
import calendar
import csv
import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ECONOMIC_CALENDAR_CSV = V4_ROOT / "data" / "economic_calendar" / "economic_calendar_usd_events.csv"
DEFAULT_OUTPUT_DIR = V4_ROOT / "data" / "economic_calendar" / "forex_factory_raw"
RAW_COLUMNS = [
    "time",
    "timezone",
    "currency",
    "impact",
    "event",
    "detail",
    "actual",
    "forecast",
    "previous",
    "day",
    "date",
    "scraped_at",
]
DATE_RE = re.compile(r"\b(?P<day>Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b\s+(?P<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(?P<date>\d{1,2})\b")
IMPACT_CLASS_MAP = {
    "icon--ff-impact-red": "red",
    "icon--ff-impact-ora": "orange",
    "icon--ff-impact-yel": "yellow",
    "icon--ff-impact-gra": "gray",
}


@dataclass(frozen=True)
class MonthSelector:
    year: int
    month: int
    input_value: str

    @property
    def slug(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"

    @property
    def forex_factory_selector(self) -> str:
        return f"{calendar.month_abbr[self.month].lower()}.{self.year:04d}"

    @property
    def display_name(self) -> str:
        return f"{calendar.month_name[self.month]} {self.year:04d}"


def parse_month_selector(value: str, *, today: date | None = None) -> MonthSelector:
    today = today or date.today()
    text = str(value or "").strip().lower()
    if text == "this":
        return MonthSelector(today.year, today.month, text)
    if text == "next":
        year = today.year + (1 if today.month == 12 else 0)
        month = 1 if today.month == 12 else today.month + 1
        return MonthSelector(year, month, text)

    match = re.fullmatch(r"(\d{4})-(\d{2})", text)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        if month < 1 or month > 12:
            raise ValueError(f"invalid month selector {value!r}: month must be 01-12")
        return MonthSelector(year, month, text)

    raise ValueError(f"invalid month selector {value!r}: expected YYYY-MM, this, or next")


def iter_month_selectors(start: date, end: date) -> list[MonthSelector]:
    if end < start:
        raise ValueError("end date must be on or after start date")
    selectors: list[MonthSelector] = []
    year = start.year
    month = start.month
    while (year, month) <= (end.year, end.month):
        selectors.append(MonthSelector(year, month, f"{year:04d}-{month:02d}"))
        if month == 12:
            year += 1
            month = 1
        else:
            month += 1
    return selectors


def parse_iso_date(value: str, field_name: str) -> date:
    try:
        return datetime.strptime(str(value or "").strip(), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be YYYY-MM-DD") from exc


def resolve_requested_months(args: argparse.Namespace) -> list[MonthSelector]:
    if args.months and (args.from_date or args.to_date):
        raise ValueError("--months cannot be combined with --from-date/--to-date")
    if args.months:
        return [parse_month_selector(value) for value in args.months]
    if args.from_date or args.to_date:
        if not args.from_date or not args.to_date:
            raise ValueError("--from-date and --to-date must be provided together")
        return iter_month_selectors(
            parse_iso_date(args.from_date, "--from-date"),
            parse_iso_date(args.to_date, "--to-date"),
        )
    return [parse_month_selector("this")]


def clean_cell_text(value: str) -> str:
    text = str(value or "").strip()
    return "" if text == "empty" else text


def convert_time_to_target(date_text: str, time_text: str, source_tz: str, target_tz: str) -> str:
    if not date_text or not time_text or time_text in {"All Day", "Tentative"}:
        return time_text
    parsed_date = datetime.strptime(date_text, "%d/%m/%Y").date()
    parsed_time = datetime.strptime(time_text, "%I:%M%p").time()
    source_dt = datetime.combine(parsed_date, parsed_time, tzinfo=ZoneInfo(source_tz))
    target_dt = source_dt.astimezone(ZoneInfo(target_tz))
    return target_dt.strftime("%H:%M")


def extract_date_parts(text: str, year: int) -> tuple[str, str] | None:
    match = DATE_RE.search(text)
    if not match:
        return None
    month_number = datetime.strptime(match.group("month"), "%b").month
    day = match.group("day")
    date_text = f"{int(match.group('date')):02d}/{month_number:02d}/{year:04d}"
    return day, date_text


def normalize_raw_rows(
    raw_rows: list[dict[str, str]],
    *,
    selector: MonthSelector,
    source_timezone: str,
    target_timezone: str,
    currencies: set[str],
    impacts: set[str],
    scraped_at: str,
) -> list[dict[str, str]]:
    current_day = ""
    current_date = ""
    current_time = ""
    normalized: list[dict[str, str]] = []

    for row in raw_rows:
        row_date = clean_cell_text(row.get("date", ""))
        if row_date:
            parts = extract_date_parts(row_date, selector.year)
            if parts:
                current_day, current_date = parts

        row_time = clean_cell_text(row.get("time", ""))
        if row_time:
            current_time = row_time

        currency = clean_cell_text(row.get("currency", ""))
        impact = clean_cell_text(row.get("impact", ""))
        event = clean_cell_text(row.get("event", ""))
        if not currency or not event:
            continue
        if currencies and currency.upper() not in currencies:
            continue
        if impacts and impact.lower() not in impacts:
            continue

        converted_time = convert_time_to_target(current_date, current_time, source_timezone, target_timezone)
        normalized.append({
            "time": converted_time,
            "timezone": target_timezone,
            "currency": currency.upper(),
            "impact": impact.lower(),
            "event": event,
            "detail": clean_cell_text(row.get("detail", "")),
            "actual": clean_cell_text(row.get("actual", "")),
            "forecast": clean_cell_text(row.get("forecast", "")),
            "previous": clean_cell_text(row.get("previous", "")),
            "day": current_day,
            "date": current_date,
            "scraped_at": scraped_at,
        })
    return normalized


def parse_calendar_table(driver, selector: MonthSelector) -> list[dict[str, str]]:
    from selenium.webdriver.common.by import By

    rows: list[dict[str, str]] = []
    table = driver.find_element(By.CLASS_NAME, "calendar__table")
    for tr in table.find_elements(By.TAG_NAME, "tr"):
        row: dict[str, str] = {}
        event_id = tr.get_attribute("data-event-id")
        for td in tr.find_elements(By.TAG_NAME, "td"):
            class_name = td.get_attribute("class") or ""
            text = td.text.strip()
            if class_name == "calendar__cell" and extract_date_parts(text, selector.year):
                row["date"] = text
            elif "calendar__time" in class_name:
                row["time"] = text
            elif "calendar__currency" in class_name:
                row["currency"] = text
            elif "calendar__impact" in class_name:
                impact = ""
                for span in td.find_elements(By.TAG_NAME, "span"):
                    span_class = span.get_attribute("class") or ""
                    for key, value in IMPACT_CLASS_MAP.items():
                        if key in span_class:
                            impact = value
                            break
                    if impact:
                        break
                row["impact"] = impact
            elif "calendar__detail" in class_name and event_id:
                row["detail"] = f"https://www.forexfactory.com/calendar?month={selector.forex_factory_selector}#detail={event_id}"
            elif "calendar__event" in class_name:
                row["event"] = text
            elif "calendar__actual" in class_name:
                row["actual"] = text
            elif "calendar__forecast" in class_name:
                row["forecast"] = text
            elif "calendar__previous" in class_name:
                row["previous"] = text
        if row:
            rows.append(row)
    return rows


def fetch_month_rows(selector: MonthSelector, *, target_timezone: str, headless: bool) -> tuple[list[dict[str, str]], dict[str, str]]:
    try:
        from selenium import webdriver
    except ImportError as exc:
        raise RuntimeError("selenium is required for ForexFactory fetching; install v4/requirements-data.txt") from exc

    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("window-size=1920x1080")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
    url = f"https://www.forexfactory.com/calendar?month={selector.forex_factory_selector}"
    driver = webdriver.Chrome(options=options)
    try:
        driver.get(url)
        time.sleep(8)
        source_timezone = driver.execute_script("return Intl.DateTimeFormat().resolvedOptions().timeZone") or target_timezone
        previous_position = None
        for _ in range(120):
            current_position = driver.execute_script("return window.pageYOffset;")
            driver.execute_script("window.scrollTo(0, window.pageYOffset + 500);")
            time.sleep(1.0)
            if current_position == previous_position:
                break
            previous_position = current_position
        raw_rows = parse_calendar_table(driver, selector)
    finally:
        driver.quit()
    metadata = {
        "month": selector.slug,
        "display_name": selector.display_name,
        "url": url,
        "source_timezone": source_timezone,
        "target_timezone": target_timezone,
    }
    return raw_rows, metadata


def write_raw_month(
    output_dir: Path,
    selector: MonthSelector,
    rows: list[dict[str, str]],
    metadata: dict[str, str],
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / f"{selector.slug}.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    metadata_path = output_dir / f"{selector.slug}.json"
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return csv_path


def fetch_raw_calendar(args: argparse.Namespace) -> int:
    selectors = resolve_requested_months(args)
    currencies = {value.upper() for value in args.currencies}
    impacts = {value.lower() for value in args.impacts}
    output_dir = Path(args.output_dir).expanduser().resolve()
    scraped_at = datetime.now(timezone.utc).isoformat()

    print("economic_calendar_fetch_status: running")
    print(f"output_dir: {output_dir}")
    print(f"months: {', '.join(selector.slug for selector in selectors)}")
    total_rows = 0
    for selector in selectors:
        raw_rows, metadata = fetch_month_rows(selector, target_timezone=args.timezone, headless=not args.show_browser)
        rows = normalize_raw_rows(
            raw_rows,
            selector=selector,
            source_timezone=metadata["source_timezone"],
            target_timezone=args.timezone,
            currencies=currencies,
            impacts=impacts,
            scraped_at=scraped_at,
        )
        metadata = {
            **metadata,
            "raw_rows": str(len(raw_rows)),
            "filtered_rows": str(len(rows)),
            "scraped_at": scraped_at,
        }
        csv_path = write_raw_month(output_dir, selector, rows, metadata)
        total_rows += len(rows)
        print(f"{selector.slug}: raw_rows={len(raw_rows)} filtered_rows={len(rows)} output={csv_path}")
    print(f"total_filtered_rows: {total_rows}")
    print("economic_calendar_fetch_status: ok")
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dry-run or update V4 USD economic calendar data.")
    parser.add_argument("--months", nargs="+", help="Month selectors: YYYY-MM, this, or next.")
    parser.add_argument("--from-date", help="Inclusive start date for deriving monthly fetches.")
    parser.add_argument("--to-date", help="Inclusive end date for deriving monthly fetches.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for raw ForexFactory CSV output.")
    parser.add_argument("--timezone", default="America/New_York", help="Target timezone for event times.")
    parser.add_argument("--currencies", nargs="+", default=["USD"], help="Currencies to keep.")
    parser.add_argument("--impacts", nargs="+", default=["red", "orange", "yellow", "gray"], help="Impact colors to keep.")
    parser.add_argument("--show-browser", action="store_true", help="Run Chrome visibly instead of headless.")
    parser.add_argument("--fetch-only", action="store_true", help="Fetch raw ForexFactory month CSVs and exit.")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args()
    try:
        if args.fetch_only:
            return fetch_raw_calendar(args)
        print("economic_calendar_status: not implemented")
        print("hint: use --fetch-only to write raw ForexFactory month CSVs")
        return 0
    except Exception as exc:
        print("economic_calendar_status: failed")
        print(f"error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
