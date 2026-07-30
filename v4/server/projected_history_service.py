from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple, Union

from server.price_lookup import open_db, _parse_datetime


SUPPORTED_TIMEFRAME_MINUTES = frozenset({60, 120, 240, 480, 720})
SUPPORTED_CALENDAR_TIMEFRAMES = {
    "1D": "day",
    "1W": "week",
    "1M": "month",
}
SUPPORTED_SESSION_MODES = frozenset({"eth", "rth"})
MAXIMUM_PROJECTED_HISTORY_DAYS = 25 * 366
PROJECTED_HISTORY_CACHE_LIMIT = 64
_PROJECTED_HISTORY_CACHE: OrderedDict[
    Tuple[str, Union[int, str], str, str, str, str], Dict[str, object]
] = OrderedDict()


def _normalize_timeframe(value) -> Union[int, str]:
    raw = str(value or "").strip()
    if raw in SUPPORTED_CALENDAR_TIMEFRAMES:
        return raw
    try:
        duration_minutes = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("'tf' must be a supported projected-history timeframe") from exc
    if duration_minutes not in SUPPORTED_TIMEFRAME_MINUTES:
        raise ValueError("'tf' must be 60, 120, 240, 480, 720, 1D, 1W, or 1M")
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


def _wall_to_instant_epoch(value: datetime) -> int:
    daylight_start = _sunday_on_or_after(value.year, 3, 8, 3)
    daylight_end = _sunday_on_or_after(value.year, 11, 1, 2)
    offset_hours = 4 if daylight_start <= value < daylight_end else 5
    return int((value + timedelta(hours=offset_hours)).replace(tzinfo=timezone.utc).timestamp())


def _eligible_wall_minute(value: datetime, mode: str) -> bool:
    minute_of_day = value.hour * 60 + value.minute
    weekday = value.weekday()
    if mode == "rth":
        return weekday <= 4 and 570 <= minute_of_day < 975
    return (
        (weekday == 6 and minute_of_day >= 1080)
        or (weekday <= 3 and (minute_of_day < 1020 or minute_of_day >= 1080))
        or (weekday == 4 and minute_of_day < 1020)
    )


def _next_trading_period_start(value: datetime, target_id: str) -> datetime:
    if target_id == "1D":
        return value + timedelta(days=1)
    if target_id == "1W":
        return value + timedelta(days=7)
    if value.month == 12:
        return datetime(value.year + 1, 1, 1)
    return datetime(value.year, value.month + 1, 1)


def _session_wall_start(trading_period_start: datetime, mode: str) -> datetime:
    if mode == "eth":
        return trading_period_start - timedelta(days=1) + timedelta(hours=18)
    return trading_period_start + timedelta(hours=9, minutes=30)


def _calendar_completion_wall(next_trading_period_start: datetime, mode: str) -> datetime:
    candidate = _session_wall_start(next_trading_period_start, mode) - timedelta(minutes=1)
    for _ in range(14 * 24 * 60):
        if _eligible_wall_minute(candidate, mode):
            return candidate
        candidate -= timedelta(minutes=1)
    raise ValueError("calendar projected history has no eligible completion minute")


def _query_calendar_rows(connection, table, instrument, start_dt, end_dt, target_id, mode):
    minute_of_day = "extract(hour from ts) * 60 + extract(minute from ts)"
    trading_date = (
        f"case when {minute_of_day} >= 1080 "
        "then cast(ts as date) + interval '1 day' else cast(ts as date) end"
        if mode == "eth" else "cast(ts as date)"
    )
    trunc_unit = SUPPORTED_CALENDAR_TIMEFRAMES[target_id]
    sql = f"""
with eligible as (
  select
    ts, open, high, low, close, volume,
    {trading_date} as trading_date
  from {table}
  where instrument = ?
    and ts >= ?
    and ts < ?
    and {_session_predicate(mode)}
), bucketed as (
  select
    date_trunc('{trunc_unit}', trading_date) as trading_period_start,
    ts, open, high, low, close, volume
  from eligible
)
select
  trading_period_start,
  arg_min(open, ts) as open,
  max(high) as high,
  min(low) as low,
  arg_max(close, ts) as close,
  sum(coalesce(volume, 0)) as volume
from bucketed
group by trading_period_start
order by trading_period_start
""".strip()
    return connection.execute(sql, [instrument, start_dt, end_dt]).fetchall()


def clear_projected_history_cache():
    _PROJECTED_HISTORY_CACHE.clear()


def query_projected_history(db_path, table, instrument, start, end, tf, session_mode):
    target_timeframe = _normalize_timeframe(tf)
    mode = _normalize_session_mode(session_mode)
    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")
    if end_dt - start_dt > timedelta(days=MAXIMUM_PROJECTED_HISTORY_DAYS):
        raise ValueError("projected history window exceeds the twenty-five-year limit")

    normalized_instrument = str(instrument or "NQ").strip().upper()
    key = (
        normalized_instrument,
        target_timeframe,
        mode,
        str(start).strip(),
        str(end).strip(),
        "projected-history-v2",
    )
    cached = _PROJECTED_HISTORY_CACHE.get(key)
    if cached:
        _PROJECTED_HISTORY_CACHE.move_to_end(key)
        return {**cached, "cacheHit": True}

    bars = []
    with open_db(db_path) as connection:
        if isinstance(target_timeframe, int):
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
            rows = connection.execute(
                sql,
                [
                    *instant_epoch_parameters,
                    normalized_instrument,
                    start_dt,
                    end_dt,
                    target_timeframe,
                ],
            ).fetchall()
            duration_seconds = target_timeframe * 60
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
        else:
            rows = _query_calendar_rows(
                connection,
                table,
                normalized_instrument,
                start_dt,
                end_dt,
                target_timeframe,
                mode,
            )
            for row in rows:
                trading_period_start = row[0]
                next_period_start = _next_trading_period_start(
                    trading_period_start,
                    target_timeframe,
                )
                bars.append({
                    "timestamp": _wall_to_instant_epoch(
                        _session_wall_start(trading_period_start, mode)
                    ),
                    "displayTimestamp": _wall_to_instant_epoch(
                        _calendar_completion_wall(next_period_start, mode)
                    ),
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
        "targetTimeframe": str(target_timeframe),
    }
    if isinstance(target_timeframe, int):
        record["targetDurationMinutes"] = target_timeframe
    _PROJECTED_HISTORY_CACHE[key] = record
    while len(_PROJECTED_HISTORY_CACHE) > PROJECTED_HISTORY_CACHE_LIMIT:
        _PROJECTED_HISTORY_CACHE.popitem(last=False)
    return record
