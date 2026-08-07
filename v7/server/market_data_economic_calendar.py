"""Optional V7 economic-calendar CSV reader for the read-only market API."""

from __future__ import annotations

import csv
from datetime import date, datetime, timezone
from pathlib import Path
from threading import Lock


_CACHE = {}
_CACHE_LOCK = Lock()


def _parse_date(value):
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def _parse_bool(value, default=False):
    if value is None:
        return default
    text = str(value).strip().lower()
    if text in ("1", "true", "yes", "y", "on"):
        return True
    if text in ("0", "false", "no", "n", "off"):
        return False
    return default


def _event_time(event_time_et):
    text = str(event_time_et or "").strip()
    if not text:
        return ""
    try:
        parsed = datetime.fromisoformat(text)
        return f"{parsed.hour:02d}:{parsed.minute:02d}"
    except ValueError:
        return text.split("T", 1)[1][:5] if "T" in text else ""


def _wall_timestamp(event_date, time_text):
    parsed_date = _parse_date(event_date)
    if parsed_date is None:
        return None
    try:
        hour, minute = [int(part) for part in str(time_text).split(":", 1)]
    except (TypeError, ValueError):
        return None
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        return None
    return int(datetime(
        parsed_date.year,
        parsed_date.month,
        parsed_date.day,
        hour,
        minute,
        tzinfo=timezone.utc,
    ).timestamp())


def _normalize_event(row, index):
    event_date = str(row.get("event_date") or "").strip()
    currency = str(row.get("currency") or "").strip() or "USD"
    title = str(row.get("title") or "").strip()
    all_day = _parse_bool(row.get("all_day"), False)
    display_time = "" if all_day else _event_time(row.get("event_time_et"))
    locate_time = "09:30" if all_day else display_time
    return {
        "id": f"econ_{event_date}_{currency}_{index}",
        "eventDate": event_date,
        "eventTimeEt": "" if all_day else str(row.get("event_time_et") or "").strip(),
        "eventTimeUtc": "" if all_day else str(row.get("event_time_utc") or "").strip(),
        "displayTime": "All Day" if all_day else display_time,
        "locateTime": locate_time,
        "locateTimestamp": _wall_timestamp(event_date, locate_time),
        "currency": currency,
        "title": title,
        "impact": str(row.get("impact") or "").strip() or "Low",
        "eventType": str(row.get("event_type") or "").strip() or "economic",
        "allDay": all_day,
        "defaultVisible": _parse_bool(row.get("default_visible"), False),
    }


def _load_events(calendar_path):
    path = Path(calendar_path).expanduser().resolve()
    if not path.is_file():
        return []
    stat = path.stat()
    signature = (stat.st_mtime_ns, stat.st_size)
    with _CACHE_LOCK:
        cached = _CACHE.get(str(path))
        if cached and cached[0] == signature:
            return cached[1]
    events = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        for index, row in enumerate(csv.DictReader(handle), start=1):
            event = _normalize_event(row, index)
            if event["eventDate"] and event["currency"] and event["title"]:
                events.append(event)
    events.sort(key=lambda event: (
        event["eventDate"],
        event["locateTimestamp"] or 0,
        event["title"],
    ))
    with _CACHE_LOCK:
        _CACHE[str(path)] = (signature, events)
    return events


def query_economic_events(params, calendar_path):
    date_from = _parse_date(params.get("date_from", params.get("start", [None]))[0])
    date_to = _parse_date(params.get("date_to", params.get("end", [None]))[0])
    if date_from is None or date_to is None:
        raise ValueError("Missing 'date_from' and/or 'date_to' parameter (format: YYYY-MM-DD)")
    if date_to < date_from:
        raise ValueError("'date_to' must be on or after 'date_from'")
    currency = str(params.get("currency", ["USD"])[0] or "USD").strip().upper()
    raw_impacts = params.get("impact", [None])[0]
    impacts = {
        part.strip().lower()
        for part in str(raw_impacts or "").split(",")
        if part.strip()
    } or None
    include_holidays = _parse_bool(
        params.get("include_holidays", ["true"])[0],
        True,
    )
    result = []
    for event in _load_events(calendar_path):
        event_date = _parse_date(event["eventDate"])
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
