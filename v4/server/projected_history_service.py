from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Dict, Tuple

from server.price_lookup import open_db, _parse_datetime


SUPPORTED_TIMEFRAME_MINUTES = frozenset({60, 120, 240, 480, 720})
SUPPORTED_SESSION_MODES = frozenset({"eth", "rth"})
MAXIMUM_PROJECTED_HISTORY_DAYS = 10 * 366
PROJECTED_HISTORY_CACHE_LIMIT = 64
_PROJECTED_HISTORY_CACHE: OrderedDict[
    Tuple[str, int, str, str, str, str], Dict[str, object]
] = OrderedDict()


def _normalize_timeframe(value) -> int:
    try:
        duration_minutes = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("'tf' must be a supported projected-history timeframe") from exc
    if duration_minutes not in SUPPORTED_TIMEFRAME_MINUTES:
        raise ValueError("'tf' must be one of 60, 120, 240, 480, or 720 minutes")
    return duration_minutes


def _normalize_session_mode(value) -> str:
    mode = str(value or "").strip().lower()
    if mode not in SUPPORTED_SESSION_MODES:
        raise ValueError("'session' must be ETH or RTH")
    return mode


def _session_predicate(mode: str) -> str:
    minute_of_day = "extract(hour from ts) * 60 + extract(minute from ts)"
    weekday = "extract(isodow from ts)"
    if mode == "rth":
        return f"({weekday} between 1 and 5 and {minute_of_day} >= 570 and {minute_of_day} < 975)"
    return (
        f"(({weekday} = 7 and {minute_of_day} >= 1080)"
        f" or ({weekday} between 1 and 4 and ({minute_of_day} < 1020 or {minute_of_day} >= 1080))"
        f" or ({weekday} = 5 and {minute_of_day} < 1020))"
    )


def _sunday_on_or_after(year: int, month: int, day: int, hour: int) -> datetime:
    candidate = datetime(year, month, day, hour)
    return candidate + timedelta(days=(6 - candidate.weekday()) % 7)


def _instant_epoch_expression(start_dt: datetime, end_dt: datetime):
    daylight_ranges = []
    for year in range(start_dt.year, end_dt.year + 1):
        daylight_ranges.append((
            _sunday_on_or_after(year, 3, 8, 3),
            _sunday_on_or_after(year, 11, 1, 2),
        ))
    daylight_predicate = " or ".join("(ts >= ? and ts < ?)" for _ in daylight_ranges)
    parameters = [boundary for pair in daylight_ranges for boundary in pair]
    return (
        f"epoch(ts) + case when ({daylight_predicate}) then 14400 else 18000 end",
        parameters,
    )


def clear_projected_history_cache():
    _PROJECTED_HISTORY_CACHE.clear()


def query_projected_history(db_path, table, instrument, start, end, tf, session_mode):
    duration_minutes = _normalize_timeframe(tf)
    mode = _normalize_session_mode(session_mode)
    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")
    if end_dt - start_dt > timedelta(days=MAXIMUM_PROJECTED_HISTORY_DAYS):
        raise ValueError("projected history window exceeds the ten-year limit")

    normalized_instrument = str(instrument or "NQ").strip().upper()
    key = (
        normalized_instrument,
        duration_minutes,
        mode,
        str(start).strip(),
        str(end).strip(),
        "projected-history-v1",
    )
    cached = _PROJECTED_HISTORY_CACHE.get(key)
    if cached:
        _PROJECTED_HISTORY_CACHE.move_to_end(key)
        return {**cached, "cacheHit": True}

    predicate = _session_predicate(mode)
    instant_epoch_expression, instant_epoch_parameters = _instant_epoch_expression(start_dt, end_dt)
    sql = f"""
with eligible as (
  select
    {instant_epoch_expression} as instant_epoch,
    ts, open, high, low, close, volume
  from {table}
  where instrument = ?
    and ts >= ?
    and ts < ?
    and {predicate}
), bucketed as (
  select
    floor(instant_epoch / (60 * ?)) as bucket,
    ts, open, high, low, close, volume
  from eligible
)
select
  bucket,
  arg_min(open, ts) as open,
  max(high) as high,
  min(low) as low,
  arg_max(close, ts) as close,
  sum(coalesce(volume, 0)) as volume
from bucketed
group by bucket
order by bucket
""".strip()

    with open_db(db_path) as connection:
        rows = connection.execute(
            sql,
            [
                *instant_epoch_parameters,
                normalized_instrument,
                start_dt,
                end_dt,
                duration_minutes,
            ],
        ).fetchall()

    duration_seconds = duration_minutes * 60
    bars = []
    for row in rows:
        start_timestamp = int(row[0]) * duration_seconds
        bars.append({
            "timestamp": start_timestamp,
            "displayTimestamp": start_timestamp + duration_seconds - 60,
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]) if row[5] is not None else 0,
        })

    record = {
        "bars": bars,
        "cacheHit": False,
        "datasetRevision": "v4-local-futures-1m-r1",
        "sessionHoursMode": mode,
        "source": "projected-history-service",
        "targetDurationMinutes": duration_minutes,
    }
    _PROJECTED_HISTORY_CACHE[key] = record
    while len(_PROJECTED_HISTORY_CACHE) > PROJECTED_HISTORY_CACHE_LIMIT:
        _PROJECTED_HISTORY_CACHE.popitem(last=False)
    return record
