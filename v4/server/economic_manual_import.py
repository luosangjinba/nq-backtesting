import csv
import io
import os
import shutil
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from server import economic_calendar_service as calendar_service


ECONOMIC_MANUAL_COLUMNS = ["Title", "Country", "Date", "Time", "Impact", "Forecast", "Previous", "URL"]


def _clean_text(value, max_length=500):
    text = str(value or "").strip()
    if "\n" in text or "\r" in text:
        raise ValueError("Values must be single-line text")
    if len(text) > max_length:
        raise ValueError(f"Value is too long; max {max_length} characters")
    return text


def _parse_manual_economic_date(value):
    text = str(value or "").strip()
    for fmt in ("%m-%d-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Invalid manual economic Date {text!r}; expected MM-DD-YYYY")


def _parse_manual_economic_time(value):
    text = str(value or "").strip()
    if not text or text.lower() in {"all day", "tentative"}:
        return "", True
    for fmt in ("%I:%M%p", "%I:%M %p"):
        try:
            return datetime.strptime(text.upper(), fmt).time(), False
        except ValueError:
            continue
    raise ValueError(f"Invalid manual economic Time {text!r}; expected h:mmam or h:mmpm")


def _normalize_manual_impact(value):
    text = str(value or "").strip().lower()
    if text == "high":
        return "High"
    if text == "medium":
        return "Medium"
    return "Low"


def manual_economic_rows_from_csv(csv_text, *, currency_filter="USD", timezone_name="America/New_York"):
    text = str(csv_text or "")
    if len(text.encode("utf-8")) > 2_000_000:
        raise ValueError("Manual economic CSV is too large")
    reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
    fieldnames = [str(name or "").strip() for name in (reader.fieldnames or [])]
    missing = [name for name in ECONOMIC_MANUAL_COLUMNS if name not in fieldnames]
    if missing:
        raise ValueError(f"Manual economic CSV missing columns: {', '.join(missing)}")
    target_currency = str(currency_filter or "USD").strip().upper()
    target_tz = ZoneInfo(timezone_name)
    rows = []
    skipped_currency = 0
    skipped_empty = 0
    for index, raw in enumerate(reader, start=2):
        title = str(raw.get("Title") or "").strip()
        currency = str(raw.get("Country") or "").strip().upper()
        if not title or not currency:
            skipped_empty += 1
            continue
        if target_currency and currency != target_currency:
            skipped_currency += 1
            continue
        event_date = _parse_manual_economic_date(raw.get("Date"))
        event_time, all_day = _parse_manual_economic_time(raw.get("Time"))
        impact = _normalize_manual_impact(raw.get("Impact"))
        event_time_et = ""
        event_time_utc = ""
        if not all_day:
            dt_et = datetime.combine(event_date, event_time, tzinfo=target_tz)
            event_time_et = dt_et.isoformat()
            event_time_utc = dt_et.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        event_type = "holiday" if "holiday" in title.lower() else ("all_day" if all_day else "economic")
        rows.append({
            "event_date": event_date.isoformat(),
            "event_time_et": event_time_et,
            "event_time_utc": event_time_utc,
            "currency": currency,
            "title": title,
            "impact": impact,
            "event_type": event_type,
            "all_day": "true" if all_day else "false",
            "default_visible": "true" if event_type == "holiday" or impact in {"High", "Medium"} else "false",
            "actual": "",
            "forecast": str(raw.get("Forecast") or "").strip(),
            "previous": str(raw.get("Previous") or "").strip(),
            "_manual_row": str(index),
            "_source_url": str(raw.get("URL") or "").strip(),
        })
    rows.sort(key=lambda row: (row["event_date"], row["event_time_et"], row["currency"], row["title"]))
    return rows, {"skipped_currency": skipped_currency, "skipped_empty": skipped_empty, "currency_filter": target_currency}


def _strip_internal_economic_fields(row):
    return {key: str(row.get(key) or "") for key in calendar_service.ECONOMIC_CALENDAR_COLUMNS}


def build_manual_economic_import_result(payload, *, write=False, calendar_path, backup_dir):
    calendar_service.configure_economic_calendar(path=calendar_path)
    csv_text = payload.get("csvText")
    if not csv_text:
        raise ValueError("Choose a manual economic CSV first")
    currency_filter = _clean_text(payload.get("currency") or "USD", 12).upper() or "USD"
    timezone_name = _clean_text(payload.get("timezone") or "America/New_York", 64) or "America/New_York"
    candidate_rows, parse_stats = manual_economic_rows_from_csv(
        csv_text,
        currency_filter=currency_filter,
        timezone_name=timezone_name,
    )
    existing_rows = calendar_service.read_economic_calendar_rows()
    existing_latest = calendar_service.max_economic_event_date(existing_rows)
    existing_keys = {calendar_service.economic_event_key(row) for row in existing_rows}
    candidate_keys = [calendar_service.economic_event_key(row) for row in candidate_rows]
    existing_candidate_keys = sum(1 for key in candidate_keys if key in existing_keys)
    duplicate_candidate_keys = calendar_service.count_economic_duplicates(candidate_rows)
    overlap_new_rows = [
        row for row in candidate_rows
        if existing_latest != "n/a"
        and row["event_date"] <= existing_latest
        and calendar_service.economic_event_key(row) not in existing_keys
    ]
    append_rows = [
        row for row in candidate_rows
        if calendar_service.economic_event_key(row) not in existing_keys
        and (existing_latest == "n/a" or row["event_date"] > existing_latest)
    ]

    output_lines = [
        "economic_manual_import_status: preview" if not write else "economic_manual_import_status: write",
        f"source_filename: {_clean_text(payload.get('filename'), 200) or 'manual.csv'}",
        f"currency_filter: {parse_stats['currency_filter']}",
        f"timezone: {timezone_name}",
        f"csv: {calendar_path}",
        f"existing_rows: {len(existing_rows)}",
        f"existing_date_min: {calendar_service.min_economic_event_date(existing_rows)}",
        f"existing_date_max: {existing_latest}",
        f"candidate_rows: {len(candidate_rows)}",
        f"candidate_date_min: {calendar_service.min_economic_event_date(candidate_rows)}",
        f"candidate_date_max: {calendar_service.max_economic_event_date(candidate_rows)}",
        f"duplicate_candidate_keys: {duplicate_candidate_keys}",
        f"existing_candidate_keys: {existing_candidate_keys}",
        f"overlap_new_keys: {len(overlap_new_rows)}",
        f"would_append_rows: {len(append_rows)}",
        f"skipped_currency_rows: {parse_stats['skipped_currency']}",
        f"skipped_empty_rows: {parse_stats['skipped_empty']}",
    ]
    if candidate_rows:
        for row in candidate_rows[:5]:
            output_lines.append(
                "sample: "
                f"{row['event_date']} {row['event_time_et'] or 'all-day'} "
                f"{row['currency']} {row['impact']} {row['title']}"
            )

    appended = 0
    if write:
        confirm_text = _clean_text(payload.get("confirmText"), 120)
        if confirm_text != "WRITE ECONOMIC":
            raise ValueError("Type 'WRITE ECONOMIC' to enable manual economic import")
        backup_path = "n/a"
        if append_rows:
            os.makedirs(backup_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = os.path.join(
                backup_dir,
                f"economic_calendar_usd_events_{timestamp}.csv",
            )
            if os.path.exists(calendar_path):
                shutil.copy2(calendar_path, backup_path)
            merged = [*calendar_service.read_economic_calendar_rows(), *[_strip_internal_economic_fields(row) for row in append_rows]]
            merged.sort(key=lambda row: (row["event_date"], row["event_time_et"], row["currency"], row["title"]))
            calendar_service.write_economic_calendar_rows(merged)
            calendar_service.clear_economic_events_cache()
            appended = len(append_rows)
        output_lines.append(f"backup_csv: {backup_path}")
        output_lines.append(f"appended_rows: {appended}")
        output_lines.append("write_status: committed manual economic import" if appended else "write_status: no new rows to append")
    else:
        output_lines.append("write_status: preview only; no CSV changes were made")

    return {
        "ok": True,
        "returncode": 0,
        "command": "manual economic import",
        "output": "\n".join(output_lines) + "\n",
    }
