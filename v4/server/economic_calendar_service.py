import csv
import os
from datetime import date, datetime, timezone


ECONOMIC_CALENDAR_COLUMNS = [
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
ECONOMIC_EVENT_KEY_FIELDS = ["event_date", "event_time_et", "currency", "title"]
ECONOMIC_CALENDAR_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "economic_calendar",
    "economic_calendar_usd_events.csv",
)
_ECONOMIC_EVENTS_CACHE = None


def configure_economic_calendar(*, path=None):
    global ECONOMIC_CALENDAR_PATH
    if path:
        next_path = str(path)
        if next_path != ECONOMIC_CALENDAR_PATH:
            ECONOMIC_CALENDAR_PATH = next_path
            clear_economic_events_cache()


def clear_economic_events_cache():
    global _ECONOMIC_EVENTS_CACHE
    _ECONOMIC_EVENTS_CACHE = None


def parse_date(value):
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def parse_bool(value, default=False):
    if value is None:
        return default
    text = str(value).strip().lower()
    if text in ("1", "true", "yes", "y", "on"):
        return True
    if text in ("0", "false", "no", "n", "off"):
        return False
    return default


def parse_impact_filter(value):
    if not value:
        return None
    impacts = {part.strip().lower() for part in str(value).split(",") if part.strip()}
    return impacts or None


def economic_event_key(row):
    return tuple(str(row.get(field) or "").strip() for field in ECONOMIC_EVENT_KEY_FIELDS)


def read_economic_calendar_rows(path=None):
    path = path or ECONOMIC_CALENDAR_PATH
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def write_economic_calendar_rows(rows, path=None):
    path = path or ECONOMIC_CALENDAR_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=ECONOMIC_CALENDAR_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def max_economic_event_date(rows):
    dates = [str(row.get("event_date") or "").strip() for row in rows if str(row.get("event_date") or "").strip()]
    return max(dates) if dates else "n/a"


def min_economic_event_date(rows):
    dates = [str(row.get("event_date") or "").strip() for row in rows if str(row.get("event_date") or "").strip()]
    return min(dates) if dates else "n/a"


def count_economic_duplicates(rows):
    seen = set()
    duplicates = 0
    for row in rows:
        key = economic_event_key(row)
        if key in seen:
            duplicates += 1
        seen.add(key)
    return duplicates


def _event_time_from_et(event_time_et):
    text = str(event_time_et or "").strip()
    if not text:
        return ""
    try:
        parsed = datetime.fromisoformat(text)
        return f"{parsed.hour:02d}:{parsed.minute:02d}"
    except ValueError:
        if "T" in text:
            return text.split("T", 1)[1][:5]
        return ""


def _wall_timestamp_from_date_time(event_date, time_text):
    parsed_date = parse_date(event_date)
    if parsed_date is None:
        return None
    try:
        hour, minute = [int(part) for part in str(time_text).split(":", 1)]
    except ValueError:
        return None
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return int(datetime(
        parsed_date.year,
        parsed_date.month,
        parsed_date.day,
        hour,
        minute,
        tzinfo=timezone.utc,
    ).timestamp())


def normalize_economic_event(row, index):
    event_date = str(row.get("event_date") or "").strip()
    currency = str(row.get("currency") or "").strip() or "USD"
    title = str(row.get("title") or "").strip()
    impact = str(row.get("impact") or "").strip() or "Low"
    event_type = str(row.get("event_type") or "").strip() or "economic"
    all_day = parse_bool(row.get("all_day"), False)
    default_visible = parse_bool(row.get("default_visible"), False)
    event_time = "" if all_day else _event_time_from_et(row.get("event_time_et"))
    locate_time = "09:30" if all_day else event_time
    locate_timestamp = _wall_timestamp_from_date_time(event_date, locate_time)
    event_id = f"econ_{event_date}_{currency}_{index}"
    return {
        "id": event_id,
        "eventDate": event_date,
        "eventTimeEt": "" if all_day else str(row.get("event_time_et") or "").strip(),
        "eventTimeUtc": "" if all_day else str(row.get("event_time_utc") or "").strip(),
        "displayTime": "All Day" if all_day else event_time,
        "locateTime": locate_time,
        "locateTimestamp": locate_timestamp,
        "currency": currency,
        "title": title,
        "impact": impact,
        "eventType": event_type,
        "allDay": all_day,
        "defaultVisible": default_visible,
    }


def load_economic_events(path=None):
    global _ECONOMIC_EVENTS_CACHE
    if path:
        configure_economic_calendar(path=path)
    if _ECONOMIC_EVENTS_CACHE is not None:
        return _ECONOMIC_EVENTS_CACHE
    events = []
    if not os.path.exists(ECONOMIC_CALENDAR_PATH):
        _ECONOMIC_EVENTS_CACHE = []
        return _ECONOMIC_EVENTS_CACHE
    with open(ECONOMIC_CALENDAR_PATH, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for index, row in enumerate(reader, start=1):
            event = normalize_economic_event(row, index)
            if event["eventDate"] and event["currency"] and event["title"]:
                events.append(event)
    events.sort(key=lambda event: (event["eventDate"], event["locateTimestamp"] or 0, event["title"]))
    _ECONOMIC_EVENTS_CACHE = events
    return _ECONOMIC_EVENTS_CACHE


def query_economic_events(params):
    date_from = parse_date(params.get("date_from", params.get("start", [None]))[0])
    date_to = parse_date(params.get("date_to", params.get("end", [None]))[0])
    currency = str(params.get("currency", ["USD"])[0] or "USD").strip().upper()
    impacts = parse_impact_filter(params.get("impact", [None])[0])
    include_holidays = parse_bool(params.get("include_holidays", ["true"])[0], True)

    if date_from is None or date_to is None:
        raise ValueError("Missing 'date_from' and/or 'date_to' parameter (format: YYYY-MM-DD)")
    if date_to < date_from:
        raise ValueError("'date_to' must be on or after 'date_from'")

    result = []
    for event in load_economic_events():
        event_date = parse_date(event["eventDate"])
        if event_date is None or event_date < date_from or event_date > date_to:
            continue
        if event["currency"].upper() != currency:
            continue
        if event["allDay"] or event["eventType"] == "holiday":
            if not include_holidays:
                continue
        elif impacts is not None and event["impact"].lower() not in impacts:
            continue
        result.append(event)
    return result
