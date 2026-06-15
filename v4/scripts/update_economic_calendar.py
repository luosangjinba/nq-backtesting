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
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ECONOMIC_CALENDAR_CSV = V4_ROOT / "data" / "economic_calendar" / "economic_calendar_usd_events.csv"
DEFAULT_OUTPUT_DIR = V4_ROOT / "data" / "economic_calendar" / "forex_factory_raw"
DEFAULT_CANDIDATE_CSV = V4_ROOT / "data" / "economic_calendar" / "economic_calendar_candidate.csv"
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
EVENT_KEY_FIELDS = ["event_date", "event_time_et", "currency", "title"]
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
IMPACT_LABEL_MAP = {
    "red": "High",
    "orange": "Medium",
    "yellow": "Low",
    "gray": "Low",
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


def parse_raw_date(value: str) -> date:
    return datetime.strptime(str(value or "").strip(), "%d/%m/%Y").date()


def is_all_day_time(value: str) -> bool:
    return str(value or "").strip() in {"All Day", "Tentative", ""}


def convert_raw_row_to_v4(row: dict[str, str]) -> dict[str, str]:
    event_date = parse_raw_date(row.get("date", "")).isoformat()
    time_text = str(row.get("time") or "").strip()
    timezone_text = str(row.get("timezone") or "America/New_York").strip() or "America/New_York"
    currency = str(row.get("currency") or "USD").strip().upper() or "USD"
    title = str(row.get("event") or "").strip()
    impact = IMPACT_LABEL_MAP.get(str(row.get("impact") or "").strip().lower(), "Low")
    all_day = is_all_day_time(time_text)
    is_holiday = "holiday" in title.lower()
    event_type = "holiday" if is_holiday else ("all_day" if all_day else "economic")
    event_time_et = ""
    event_time_utc = ""
    if not all_day:
        try:
            hour, minute = [int(part) for part in time_text.split(":", 1)]
        except ValueError as exc:
            raise ValueError(f"invalid event time {time_text!r} for {event_date} {title!r}") from exc
        dt_et = datetime(
            int(event_date[:4]),
            int(event_date[5:7]),
            int(event_date[8:10]),
            hour,
            minute,
            tzinfo=ZoneInfo(timezone_text),
        )
        event_time_et = dt_et.isoformat()
        event_time_utc = dt_et.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    default_visible = is_holiday or impact in {"High", "Medium"}
    return {
        "event_date": event_date,
        "event_time_et": event_time_et,
        "event_time_utc": event_time_utc,
        "currency": currency,
        "title": title,
        "impact": impact,
        "event_type": event_type,
        "all_day": "true" if all_day else "false",
        "default_visible": "true" if default_visible else "false",
        "actual": str(row.get("actual") or "").strip(),
        "forecast": str(row.get("forecast") or "").strip(),
        "previous": str(row.get("previous") or "").strip(),
    }


def convert_raw_rows_to_v4(
    rows: list[dict[str, str]],
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict[str, str]]:
    converted: list[dict[str, str]] = []
    for row in rows:
        converted_row = convert_raw_row_to_v4(row)
        row_date = date.fromisoformat(converted_row["event_date"])
        if date_from and row_date < date_from:
            continue
        if date_to and row_date > date_to:
            continue
        if not converted_row["title"]:
            continue
        converted.append(converted_row)
    converted.sort(key=lambda item: (item["event_date"], item["event_time_et"], item["title"]))
    return converted


def read_raw_csvs(raw_dir: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted(raw_dir.glob("*.csv")):
        with path.open(newline="", encoding="utf-8") as handle:
            rows.extend(csv.DictReader(handle))
    return rows


def write_v4_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=V4_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def read_v4_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def event_key(row: dict[str, str]) -> tuple[str, str, str, str]:
    return tuple(str(row.get(field) or "").strip() for field in EVENT_KEY_FIELDS)


def duplicate_key_count(rows: list[dict[str, str]]) -> int:
    seen: set[tuple[str, str, str, str]] = set()
    duplicates = 0
    for row in rows:
        key = event_key(row)
        if key in seen:
            duplicates += 1
        seen.add(key)
    return duplicates


def max_event_date(rows: list[dict[str, str]]) -> str:
    dates = [str(row.get("event_date") or "").strip() for row in rows if str(row.get("event_date") or "").strip()]
    return max(dates) if dates else "n/a"


def min_event_date(rows: list[dict[str, str]]) -> str:
    dates = [str(row.get("event_date") or "").strip() for row in rows if str(row.get("event_date") or "").strip()]
    return min(dates) if dates else "n/a"


def count_nonempty(rows: list[dict[str, str]], field: str) -> int:
    return sum(1 for row in rows if str(row.get(field) or "").strip())


def build_candidate_rows(args: argparse.Namespace) -> tuple[list[dict[str, str]], list[MonthSelector]]:
    selectors = resolve_requested_months(args)
    if args.raw_dir:
        raw_rows = read_raw_csvs(Path(args.raw_dir).expanduser().resolve())
    else:
        raw_rows = []
        currencies = {value.upper() for value in args.currencies}
        impacts = {value.lower() for value in args.impacts}
        scraped_at = datetime.now(timezone.utc).isoformat()
        output_dir = Path(args.output_dir).expanduser().resolve()
        for selector in selectors:
            fetched_rows, metadata = fetch_month_rows(selector, target_timezone=args.timezone, headless=not args.show_browser)
            normalized = normalize_raw_rows(
                fetched_rows,
                selector=selector,
                source_timezone=metadata["source_timezone"],
                target_timezone=args.timezone,
                currencies=currencies,
                impacts=impacts,
                scraped_at=scraped_at,
            )
            raw_rows.extend(normalized)
            write_raw_month(output_dir, selector, normalized, {
                **metadata,
                "raw_rows": str(len(fetched_rows)),
                "filtered_rows": str(len(normalized)),
                "scraped_at": scraped_at,
            })
    date_from = parse_iso_date(args.from_date, "--from-date") if args.from_date else None
    date_to = parse_iso_date(args.to_date, "--to-date") if args.to_date else None
    return convert_raw_rows_to_v4(raw_rows, date_from=date_from, date_to=date_to), selectors


def default_from_date(existing_rows: list[dict[str, str]]) -> str:
    latest = max_event_date(existing_rows)
    if latest == "n/a":
        return "1900-01-01"
    return (date.fromisoformat(latest) + timedelta(days=1)).isoformat()


def dry_run_report(args: argparse.Namespace) -> int:
    csv_path = Path(args.csv).expanduser().resolve()
    existing_rows = read_v4_rows(csv_path)
    if not args.from_date:
        args.from_date = default_from_date(existing_rows)
    if not args.to_date:
        args.to_date = date.today().isoformat()

    candidate_rows, selectors = build_candidate_rows(args)
    existing_keys = {event_key(row) for row in existing_rows}
    candidate_keys = [event_key(row) for row in candidate_rows]
    append_rows = [row for row in candidate_rows if event_key(row) not in existing_keys]
    existing_candidate_keys = sum(1 for key in candidate_keys if key in existing_keys)
    overlap_new_keys = [
        row for row in candidate_rows
        if max_event_date(existing_rows) != "n/a"
        and row["event_date"] <= max_event_date(existing_rows)
        and event_key(row) not in existing_keys
    ]

    print("economic_calendar_dry_run_status: ok")
    print(f"csv: {csv_path}")
    print(f"existing_rows: {len(existing_rows)}")
    print(f"existing_date_min: {min_event_date(existing_rows)}")
    print(f"existing_date_max: {max_event_date(existing_rows)}")
    print(f"requested_range: {args.from_date} -> {args.to_date}")
    print(f"months: {', '.join(selector.slug for selector in selectors)}")
    print(f"candidate_rows: {len(candidate_rows)}")
    print(f"candidate_date_min: {min_event_date(candidate_rows)}")
    print(f"candidate_date_max: {max_event_date(candidate_rows)}")
    print(f"duplicate_candidate_keys: {duplicate_key_count(candidate_rows)}")
    print(f"existing_candidate_keys: {existing_candidate_keys}")
    print(f"overlap_new_keys: {len(overlap_new_keys)}")
    print(f"would_append_rows: {len(append_rows)}")
    print(f"actual_nonempty: {count_nonempty(candidate_rows, 'actual')}")
    print(f"forecast_nonempty: {count_nonempty(candidate_rows, 'forecast')}")
    print(f"previous_nonempty: {count_nonempty(candidate_rows, 'previous')}")
    print("write_status: dry-run; no CSV changes were made")
    return 0


def convert_raw_calendar(args: argparse.Namespace) -> int:
    raw_dir = Path(args.raw_dir or args.output_dir).expanduser().resolve()
    candidate_csv = Path(args.candidate_csv).expanduser().resolve()
    date_from = parse_iso_date(args.from_date, "--from-date") if args.from_date else None
    date_to = parse_iso_date(args.to_date, "--to-date") if args.to_date else None
    raw_rows = read_raw_csvs(raw_dir)
    rows = convert_raw_rows_to_v4(raw_rows, date_from=date_from, date_to=date_to)
    write_v4_rows(candidate_csv, rows)
    print("economic_calendar_convert_status: ok")
    print(f"raw_dir: {raw_dir}")
    print(f"raw_rows: {len(raw_rows)}")
    print(f"converted_rows: {len(rows)}")
    if rows:
        print(f"date_min: {rows[0]['event_date']}")
        print(f"date_max: {rows[-1]['event_date']}")
    print(f"candidate_csv: {candidate_csv}")
    return 0


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
    parser.add_argument("--csv", default=str(DEFAULT_ECONOMIC_CALENDAR_CSV), help="Target V4 economic calendar CSV path.")
    parser.add_argument("--raw-dir", help="Directory containing raw ForexFactory CSVs for conversion.")
    parser.add_argument("--candidate-csv", default=str(DEFAULT_CANDIDATE_CSV), help="Converted V4-format candidate CSV path.")
    parser.add_argument("--timezone", default="America/New_York", help="Target timezone for event times.")
    parser.add_argument("--currencies", nargs="+", default=["USD"], help="Currencies to keep.")
    parser.add_argument("--impacts", nargs="+", default=["red", "orange", "yellow", "gray"], help="Impact colors to keep.")
    parser.add_argument("--show-browser", action="store_true", help="Run Chrome visibly instead of headless.")
    parser.add_argument("--fetch-only", action="store_true", help="Fetch raw ForexFactory month CSVs and exit.")
    parser.add_argument("--convert-only", action="store_true", help="Convert raw ForexFactory month CSVs to V4 candidate CSV and exit.")
    parser.add_argument("--dry-run", action="store_true", help="Report append-only update impact without writing the main CSV.")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args()
    try:
        selected_modes = sum(bool(value) for value in (args.fetch_only, args.convert_only, args.dry_run))
        if selected_modes > 1:
            raise ValueError("--fetch-only, --convert-only, and --dry-run are mutually exclusive")
        if args.fetch_only:
            return fetch_raw_calendar(args)
        if args.convert_only:
            return convert_raw_calendar(args)
        if args.dry_run:
            return dry_run_report(args)
        print("economic_calendar_status: not implemented")
        print("hint: use --fetch-only to write raw ForexFactory month CSVs")
        return 0
    except Exception as exc:
        print("economic_calendar_status: failed")
        print(f"error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
