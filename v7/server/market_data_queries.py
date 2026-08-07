"""V7-owned, read-only DuckDB market-data queries.

This module is the complete data-access boundary for the V7 market-data HTTP
service.  Connections are always opened read-only and SQL identifiers are
validated before interpolation.
"""

from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
from threading import Lock
from typing import Dict, Tuple, Union

import duckdb

from duckdb_runtime import duckdb_connection_config

from market_data_revision import (
    DatasetRevisionUnstable,
    require_expected_revision,
    resolve_dataset_revision,
)


TABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SUPPORTED_INSTRUMENTS = ("ES", "NQ")
DAILY_ANCHOR_OFFSET = 18 * 3600
LOAD_RANGE_LIMITS_DAYS = {
    1: 45,
    2: 45,
    3: 45,
    4: 45,
    5: 90,
    10: 180,
    15: 365,
    30: 365,
    60: 730,
    240: 1460,
    1440: 3650,
    10080: 3650,
}
DEFAULT_LOAD_RANGE_LIMIT_DAYS = 365
FIXED_TARGET_TIMEFRAME_MINUTES = {
    "1m": 1,
    "2m": 2,
    "3m": 3,
    "4m": 4,
    "5m": 5,
    "10m": 10,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "2h": 120,
    "4h": 240,
    "8h": 480,
    "12h": 720,
}
SESSION_AWARE_TARGET_TIMEFRAMES = ("1D", "1M", "1W")
SESSION_AWARE_DATE_TRUNC_UNITS = {"1D": "day", "1W": "week", "1M": "month"}
SUPPORTED_TARGET_TIMEFRAMES = tuple(FIXED_TARGET_TIMEFRAME_MINUTES) + (
    "1D",
    "1M",
    "1W",
)
SUPPORTED_PROJECTED_TIMEFRAME_MINUTES = frozenset({60, 120, 240, 480, 720})
SUPPORTED_PROJECTED_CALENDAR_TIMEFRAMES = {
    "1D": "day",
    "1W": "week",
    "1M": "month",
}
SUPPORTED_SESSION_MODES = frozenset({"eth", "rth"})
MAXIMUM_PROJECTED_HISTORY_DAYS = 25 * 366
PROJECTED_HISTORY_CACHE_LIMIT = 64

_AVAILABLE_DATES_CACHE = {}
_AVAILABLE_DATES_CACHE_LOCK = Lock()
_TARGET_BARS_CACHE: Dict[Tuple[str, ...], Dict[str, object]] = {}
_TARGET_BARS_CACHE_LOCK = Lock()
_PROJECTED_HISTORY_CACHE: OrderedDict[
    Tuple[str, Union[int, str], str, str, str, str, str], Dict[str, object]
] = OrderedDict()
_PROJECTED_HISTORY_CACHE_LOCK = Lock()


def validate_table_name(table_name: str) -> str:
    normalized = str(table_name or "").strip()
    if not TABLE_NAME.fullmatch(normalized):
        raise ValueError("market-data table name is invalid")
    return normalized


def open_database(db_path: str) -> duckdb.DuckDBPyConnection:
    path = Path(db_path).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"database file not found: {path}")
    return duckdb.connect(
        str(path),
        read_only=True,
        config=duckdb_connection_config(allow_external_access=False),
    )


def parse_datetime(text: str) -> datetime:
    for format_text in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(text, format_text)
        except ValueError:
            continue
    raise ValueError(f"cannot parse datetime: {text}")


def validate_bars_request_range(start: str, end: str, timeframe: int, padding=19):
    if timeframe <= 0:
        raise ValueError("'tf' must be a positive timeframe in minutes")
    start_dt = parse_datetime(start)
    end_dt = parse_datetime(end)
    if end_dt < start_dt:
        raise ValueError("'end' must be on or after 'start'")
    duration_seconds = (end_dt - start_dt).total_seconds()
    estimated = int(duration_seconds // (timeframe * 60)) + 1 + padding * 2
    limit_days = LOAD_RANGE_LIMITS_DAYS.get(
        timeframe,
        DEFAULT_LOAD_RANGE_LIMIT_DAYS,
    )
    maximum = int((limit_days * 24 * 60) // timeframe) + 1 + padding * 2
    if estimated > maximum:
        label = "1m" if timeframe == 1 else f"{timeframe}m"
        raise OverflowError(
            f"{label} request is too large: estimated {estimated} bars, limit {maximum}. "
            "Narrow the date range or use a higher timeframe."
        )
    return {"start_dt": start_dt, "end_dt": end_dt}


def _serialize_bar(row, timestamp: int, time_text: str):
    return {
        "time": time_text,
        "timestamp": timestamp,
        "open": float(row[1]),
        "high": float(row[2]),
        "low": float(row[3]),
        "close": float(row[4]),
        "volume": int(row[5]) if row[5] is not None else 0,
    }


def query_bars(
    db_path: str,
    table_name: str,
    instrument: str,
    start: str,
    end: str,
    timeframe: int,
    padding=19,
):
    table = validate_table_name(table_name)
    start_dt = parse_datetime(start)
    end_dt = parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")
    query_start = start_dt - timedelta(minutes=padding * timeframe)
    query_end = end_dt + timedelta(minutes=padding * timeframe)

    if timeframe <= 1:
        sql = f"""
select ts, open, high, low, close, volume
from {table}
where instrument = ? and ts >= ? and ts < ?
order by ts
""".strip()
        with open_database(db_path) as connection:
            rows = connection.execute(
                sql,
                [instrument, query_start, query_end],
            ).fetchall()
        return [
            _serialize_bar(
                row,
                int(row[0].replace(tzinfo=timezone.utc).timestamp()),
                row[0].strftime("%Y-%m-%d %H:%M"),
            )
            for row in rows
        ]

    anchor_epoch = 946684800
    anchor_offset = (
        DAILY_ANCHOR_OFFSET
        if timeframe == 1440
        else (7200 if timeframe == 240 else 0)
    )
    effective_anchor = anchor_epoch + anchor_offset
    session_filter = "and not (extract(hour from ts) = 17)" if timeframe == 1440 else ""
    sql = f"""
with bars as (
  select date_trunc('minute', ts) as ts, open, high, low, close, volume
  from {table}
  where instrument = ? and ts >= ? and ts < ? {session_filter}
)
select
  floor((extract(epoch from ts) - {effective_anchor}) / (60 * ?)) as bucket,
  first(open order by ts), max(high), min(low), last(close order by ts),
  sum(coalesce(volume, 0))
from bars
group by bucket
order by bucket
""".strip()
    with open_database(db_path) as connection:
        rows = connection.execute(
            sql,
            [instrument, query_start, query_end, timeframe],
        ).fetchall()
    result = []
    for row in rows:
        timestamp = effective_anchor + int(row[0]) * timeframe * 60
        if timeframe == 1440:
            trading_day = (
                datetime.fromtimestamp(timestamp, tz=timezone.utc) + timedelta(days=1)
            ).strftime("%Y-%m-%d")
            record = _serialize_bar(row, timestamp, trading_day)
            record["tradingDay"] = trading_day
        else:
            record = _serialize_bar(
                row,
                timestamp,
                datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime(
                    "%Y-%m-%d %H:%M"
                ),
            )
        result.append(record)
    return result


def query_price(timestamp: int, db_path: str, table_name: str, instrument="NQ"):
    table = validate_table_name(table_name)
    target_dt = datetime.fromtimestamp(
        int(timestamp),
        tz=timezone.utc,
    ).replace(tzinfo=None)
    sql = f"""
select ts, open, high, low, close, volume
from {table}
where instrument = ? and ts = ?
limit 1
""".strip()
    with open_database(db_path) as connection:
        row = connection.execute(sql, [instrument, target_dt]).fetchone()
    if row is None:
        raise LookupError("no data found for requested timestamp")
    record = _serialize_bar(
        row,
        int(row[0].replace(tzinfo=timezone.utc).timestamp()),
        row[0].strftime("%Y-%m-%d %H:%M"),
    )
    record.update({
        "instrument": instrument,
        "ohlc": {
            "open": record["open"],
            "high": record["high"],
            "low": record["low"],
            "close": record["close"],
        },
    })
    return record


def _normalize_instruments(instruments):
    requested = tuple(dict.fromkeys(str(value).strip().upper() for value in instruments))
    if not requested or any(value not in SUPPORTED_INSTRUMENTS for value in requested):
        raise ValueError("Available-date instruments must be ES and/or NQ")
    return requested


def query_available_dates(db_path: str, table_name: str, instruments):
    table = validate_table_name(table_name)
    requested = _normalize_instruments(instruments)
    path = Path(db_path).expanduser().resolve()
    if not path.is_file():
        raise ValueError(f"Market-data database does not exist: {path}")
    stat = path.stat()
    signature = (stat.st_mtime_ns, stat.st_size)
    cache_key = (str(path), table, requested)
    with _AVAILABLE_DATES_CACHE_LOCK:
        cached = _AVAILABLE_DATES_CACHE.get(cache_key)
        if cached and cached[0] == signature:
            return cached[1]
    placeholders = ", ".join("?" for _ in requested)
    sql = f"""
select
  instrument,
  strftime(ts, '%Y-%m-%d') as market_date,
  strftime(min(ts), '%Y-%m-%dT%H:%M') as first_timestamp,
  strftime(max(ts), '%Y-%m-%dT%H:%M') as latest_timestamp
from {table}
where instrument in ({placeholders})
group by instrument, market_date
order by instrument, market_date
""".strip()
    dates = {instrument: [] for instrument in requested}
    first = {instrument: None for instrument in requested}
    latest = {instrument: None for instrument in requested}
    with open_database(str(path)) as connection:
        rows = connection.execute(sql, list(requested)).fetchall()
    for instrument, market_date, first_timestamp, latest_timestamp in rows:
        dates[instrument].append(market_date)
        first[instrument] = first[instrument] or first_timestamp
        latest[instrument] = latest_timestamp
    result = tuple({
        "instrument": instrument,
        "dates": tuple(dates[instrument]),
        "firstTimestamp": first[instrument],
        "latestTimestamp": latest[instrument],
    } for instrument in requested)
    with _AVAILABLE_DATES_CACHE_LOCK:
        _AVAILABLE_DATES_CACHE[cache_key] = (signature, result)
    return result


def normalize_target_timeframe(value) -> str:
    raw = str(value or "").strip()
    if raw in SESSION_AWARE_TARGET_TIMEFRAMES:
        return raw
    if raw.lower() in ("1d", "1w"):
        return raw.upper()
    unit = raw[-1:].lower()
    number = raw[:-1] if unit in ("m", "h") else raw
    try:
        minutes = int(number) * (60 if unit == "h" else 1)
    except ValueError as error:
        raise ValueError("'tf' must be a supported target timeframe id") from error
    for target_id, target_minutes in FIXED_TARGET_TIMEFRAME_MINUTES.items():
        if minutes == target_minutes:
            return target_id
    raise ValueError("'tf' must be a supported target timeframe id")


def _format_bar_time(timestamp):
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")


def _query_fixed_target_bars(
    db_path,
    table,
    instrument,
    start_dt,
    end_dt,
    target_id,
):
    timeframe = FIXED_TARGET_TIMEFRAME_MINUTES[target_id]
    anchor = 946684800 + (7200 if target_id == "4h" else 0)
    sql = f"""
with bars as (
  select date_trunc('minute', ts) as ts, open, high, low, close, volume
  from {table}
  where instrument = ? and ts >= ? and ts < ?
)
select
  floor((extract(epoch from ts) - {anchor}) / (60 * ?)) as bucket,
  first(open order by ts), max(high), min(low), last(close order by ts),
  sum(coalesce(volume, 0)), min(ts), max(ts), count(*)
from bars
group by bucket
order by bucket
""".strip()
    with open_database(db_path) as connection:
        rows = connection.execute(
            sql,
            [instrument, start_dt, end_dt, timeframe],
        ).fetchall()
    result = []
    for row in rows:
        timestamp = anchor + int(row[0]) * timeframe * 60
        result.append({
            "time": _format_bar_time(timestamp),
            "timestamp": timestamp,
            "timeframe": target_id,
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]) if row[5] is not None else 0,
            "sourceStartTime": row[6].strftime("%Y-%m-%d %H:%M"),
            "sourceEndTime": row[7].strftime("%Y-%m-%d %H:%M"),
            "sourceBarCount": int(row[8]),
        })
    return result


def _query_calendar_target_bars(
    db_path,
    table,
    instrument,
    start_dt,
    end_dt,
    target_id,
):
    trunc_unit = SESSION_AWARE_DATE_TRUNC_UNITS[target_id]
    sql = f"""
with bars as (
  select date_trunc('minute', ts) as ts, open, high, low, close, volume
  from {table}
  where instrument = ? and ts >= ? and ts < ?
    and not (extract(hour from ts) = 17)
), bucketed as (
  select date_trunc('{trunc_unit}', ts + interval '6 hours') - interval '6 hours'
    as bucket_start, ts, open, high, low, close, volume
  from bars
)
select bucket_start, first(open order by ts), max(high), min(low),
  last(close order by ts), sum(coalesce(volume, 0)), min(ts), max(ts), count(*)
from bucketed
group by bucket_start
order by bucket_start
""".strip()
    with open_database(db_path) as connection:
        rows = connection.execute(sql, [instrument, start_dt, end_dt]).fetchall()
    result = []
    for row in rows:
        bucket = row[0].replace(tzinfo=timezone.utc)
        timestamp = int(bucket.timestamp())
        trading_key = (bucket + timedelta(hours=6)).strftime(
            "%Y-%m" if target_id == "1M" else "%Y-%m-%d"
        )
        record = {
            "time": trading_key if target_id == "1D" else _format_bar_time(timestamp),
            "timestamp": timestamp,
            "timeframe": target_id,
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]) if row[5] is not None else 0,
            "sourceStartTime": row[6].strftime("%Y-%m-%d %H:%M"),
            "sourceEndTime": row[7].strftime("%Y-%m-%d %H:%M"),
            "sourceBarCount": int(row[8]),
        }
        record[{"1D": "tradingDay", "1W": "tradingWeek", "1M": "tradingMonth"}[target_id]] = trading_key
        result.append(record)
    return result


def query_target_bars(db_path, table_name, instrument, start, end, timeframe):
    table = validate_table_name(table_name)
    target_id = normalize_target_timeframe(timeframe)
    start_dt = parse_datetime(start)
    end_dt = parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")
    normalized_instrument = str(instrument or "NQ").strip().upper()
    revision = resolve_dataset_revision(db_path, table)
    cache_key = (
        normalized_instrument,
        target_id,
        str(start).strip(),
        str(end).strip(),
        revision,
        "target-bars-v1",
    )
    with _TARGET_BARS_CACHE_LOCK:
        cached = _TARGET_BARS_CACHE.get(cache_key)
    if cached:
        return {**cached, "cacheHit": True}
    if target_id in SESSION_AWARE_TARGET_TIMEFRAMES:
        bars = _query_calendar_target_bars(
            db_path,
            table,
            normalized_instrument,
            start_dt,
            end_dt,
            target_id,
        )
    else:
        bars = _query_fixed_target_bars(
            db_path,
            table,
            normalized_instrument,
            start_dt,
            end_dt,
            target_id,
        )
    if resolve_dataset_revision(db_path, table) != revision:
        raise DatasetRevisionUnstable("market database changed while target bars were read")
    record = {
        "bars": bars,
        "cacheHit": False,
        "requestedRange": {
            "startTs": int(start_dt.replace(tzinfo=timezone.utc).timestamp()),
            "endTs": int(end_dt.replace(tzinfo=timezone.utc).timestamp()),
        },
        "source": "target-bars-service",
        "targetTimeframe": target_id,
    }
    with _TARGET_BARS_CACHE_LOCK:
        _TARGET_BARS_CACHE[cache_key] = record
    return record


def _normalize_projected_timeframe(value) -> Union[int, str]:
    raw = str(value or "").strip()
    if raw in SUPPORTED_PROJECTED_CALENDAR_TIMEFRAMES:
        return raw
    try:
        minutes = int(raw)
    except (TypeError, ValueError) as error:
        raise ValueError("'tf' must be a supported projected-history timeframe") from error
    if minutes not in SUPPORTED_PROJECTED_TIMEFRAME_MINUTES:
        raise ValueError("'tf' must be 60, 120, 240, 480, 720, 1D, 1W, or 1M")
    return minutes


def _normalize_session_mode(value) -> str:
    mode = str(value or "").strip().lower()
    if mode not in SUPPORTED_SESSION_MODES:
        raise ValueError("'session' must be ETH or RTH")
    return mode


def _session_predicate(mode: str) -> str:
    minute = "extract(hour from ts) * 60 + extract(minute from ts)"
    weekday = "extract(isodow from ts)"
    if mode == "rth":
        return f"({weekday} between 1 and 5 and {minute} >= 570 and {minute} < 975)"
    return (
        f"(({weekday} = 7 and {minute} >= 1080)"
        f" or ({weekday} between 1 and 4 and ({minute} < 1020 or {minute} >= 1080))"
        f" or ({weekday} = 5 and {minute} < 1020))"
    )


def _sunday_on_or_after(year, month, day, hour):
    candidate = datetime(year, month, day, hour)
    return candidate + timedelta(days=(6 - candidate.weekday()) % 7)


def _instant_epoch_expression(start_dt, end_dt):
    ranges = [
        (
            _sunday_on_or_after(year, 3, 8, 3),
            _sunday_on_or_after(year, 11, 1, 2),
        )
        for year in range(start_dt.year, end_dt.year + 1)
    ]
    predicate = " or ".join("(ts >= ? and ts < ?)" for _ in ranges)
    return (
        f"epoch(ts) + case when ({predicate}) then 14400 else 18000 end",
        [boundary for pair in ranges for boundary in pair],
    )


def _wall_to_instant_epoch(value):
    daylight_start = _sunday_on_or_after(value.year, 3, 8, 3)
    daylight_end = _sunday_on_or_after(value.year, 11, 1, 2)
    offset = 4 if daylight_start <= value < daylight_end else 5
    return int((value + timedelta(hours=offset)).replace(tzinfo=timezone.utc).timestamp())


def _eligible_wall_minute(value, mode):
    minute = value.hour * 60 + value.minute
    weekday = value.weekday()
    if mode == "rth":
        return weekday <= 4 and 570 <= minute < 975
    return (
        (weekday == 6 and minute >= 1080)
        or (weekday <= 3 and (minute < 1020 or minute >= 1080))
        or (weekday == 4 and minute < 1020)
    )


def _next_period(value, target_id):
    if target_id == "1D":
        return value + timedelta(days=1)
    if target_id == "1W":
        return value + timedelta(days=7)
    return datetime(value.year + 1, 1, 1) if value.month == 12 else datetime(value.year, value.month + 1, 1)


def _session_wall_start(period_start, mode):
    if mode == "eth":
        return period_start - timedelta(days=1) + timedelta(hours=18)
    return period_start + timedelta(hours=9, minutes=30)


def _calendar_completion_wall(next_period_start, mode):
    candidate = _session_wall_start(next_period_start, mode) - timedelta(minutes=1)
    for _ in range(14 * 24 * 60):
        if _eligible_wall_minute(candidate, mode):
            return candidate
        candidate -= timedelta(minutes=1)
    raise ValueError("calendar projected history has no eligible completion minute")


def _query_projected_calendar_rows(
    connection,
    table,
    instrument,
    start_dt,
    end_dt,
    target_id,
    mode,
):
    minute = "extract(hour from ts) * 60 + extract(minute from ts)"
    trading_date = (
        f"case when {minute} >= 1080 then cast(ts as date) + interval '1 day' "
        "else cast(ts as date) end"
        if mode == "eth"
        else "cast(ts as date)"
    )
    trunc_unit = SUPPORTED_PROJECTED_CALENDAR_TIMEFRAMES[target_id]
    sql = f"""
with eligible as (
  select ts, open, high, low, close, volume, {trading_date} as trading_date
  from {table}
  where instrument = ? and ts >= ? and ts < ? and {_session_predicate(mode)}
), bucketed as (
  select date_trunc('{trunc_unit}', trading_date) as trading_period_start,
    ts, open, high, low, close, volume
  from eligible
)
select trading_period_start, arg_min(open, ts), max(high), min(low),
  arg_max(close, ts), sum(coalesce(volume, 0))
from bucketed
group by trading_period_start
order by trading_period_start
""".strip()
    return connection.execute(sql, [instrument, start_dt, end_dt]).fetchall()


def query_projected_history(
    db_path,
    table_name,
    instrument,
    start,
    end,
    timeframe,
    session_mode,
    expected_dataset_revision=None,
    _revision_attempt=0,
):
    table = validate_table_name(table_name)
    target = _normalize_projected_timeframe(timeframe)
    mode = _normalize_session_mode(session_mode)
    start_dt = parse_datetime(start)
    end_dt = parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")
    if end_dt - start_dt > timedelta(days=MAXIMUM_PROJECTED_HISTORY_DAYS):
        raise ValueError("projected history window exceeds the twenty-five-year limit")
    revision = resolve_dataset_revision(db_path, table)
    require_expected_revision(expected_dataset_revision, revision)
    normalized_instrument = str(instrument or "NQ").strip().upper()
    cache_key = (
        normalized_instrument,
        target,
        mode,
        str(start).strip(),
        str(end).strip(),
        revision,
        "projected-history-v7",
    )
    with _PROJECTED_HISTORY_CACHE_LOCK:
        cached = _PROJECTED_HISTORY_CACHE.get(cache_key)
        if cached:
            _PROJECTED_HISTORY_CACHE.move_to_end(cache_key)
    if cached:
        current = resolve_dataset_revision(db_path, table)
        require_expected_revision(expected_dataset_revision, current)
        if current == revision:
            return {**cached, "cacheHit": True}
        if _revision_attempt >= 1:
            raise DatasetRevisionUnstable(
                "market database changed repeatedly while projected history was read"
            )
        return query_projected_history(
            db_path,
            table,
            instrument,
            start,
            end,
            timeframe,
            mode,
            expected_dataset_revision,
            _revision_attempt + 1,
        )

    bars = []
    with open_database(db_path) as connection:
        if isinstance(target, int):
            epoch_expression, epoch_parameters = _instant_epoch_expression(start_dt, end_dt)
            sql = f"""
with eligible as (
  select {epoch_expression} as instant_epoch, ts, open, high, low, close, volume
  from {table}
  where instrument = ? and ts >= ? and ts < ? and {_session_predicate(mode)}
), bucketed as (
  select floor(instant_epoch / (60 * ?)) as bucket,
    ts, open, high, low, close, volume
  from eligible
)
select bucket, arg_min(open, ts), max(high), min(low), arg_max(close, ts),
  sum(coalesce(volume, 0))
from bucketed
group by bucket
order by bucket
""".strip()
            rows = connection.execute(
                sql,
                [*epoch_parameters, normalized_instrument, start_dt, end_dt, target],
            ).fetchall()
            duration_seconds = target * 60
            for row in rows:
                timestamp = int(row[0]) * duration_seconds
                bars.append({
                    "timestamp": timestamp,
                    "displayTimestamp": timestamp + duration_seconds - 60,
                    "labelDate": None,
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4]),
                    "volume": int(row[5]) if row[5] is not None else 0,
                })
        else:
            rows = _query_projected_calendar_rows(
                connection,
                table,
                normalized_instrument,
                start_dt,
                end_dt,
                target,
                mode,
            )
            for row in rows:
                period = row[0]
                next_period = _next_period(period, target)
                bars.append({
                    "timestamp": _wall_to_instant_epoch(_session_wall_start(period, mode)),
                    "displayTimestamp": _wall_to_instant_epoch(
                        _calendar_completion_wall(next_period, mode)
                    ),
                    "labelDate": period.strftime("%Y-%m-%d"),
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4]),
                    "volume": int(row[5]) if row[5] is not None else 0,
                })

    current = resolve_dataset_revision(db_path, table)
    require_expected_revision(expected_dataset_revision, current)
    if current != revision:
        if _revision_attempt >= 1:
            raise DatasetRevisionUnstable(
                "market database changed repeatedly while projected history was read"
            )
        return query_projected_history(
            db_path,
            table,
            instrument,
            start,
            end,
            timeframe,
            mode,
            expected_dataset_revision,
            _revision_attempt + 1,
        )
    record = {
        "bars": bars,
        "cacheHit": False,
        "datasetRevision": revision,
        "sessionHoursMode": mode,
        "source": "projected-history-service",
        "targetTimeframe": str(target),
    }
    if isinstance(target, int):
        record["targetDurationMinutes"] = target
    with _PROJECTED_HISTORY_CACHE_LOCK:
        _PROJECTED_HISTORY_CACHE[cache_key] = record
        while len(_PROJECTED_HISTORY_CACHE) > PROJECTED_HISTORY_CACHE_LIMIT:
            _PROJECTED_HISTORY_CACHE.popitem(last=False)
    return record
