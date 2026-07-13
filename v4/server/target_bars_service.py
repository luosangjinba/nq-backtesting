from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Dict, Tuple

from server.price_lookup import open_db, _parse_datetime


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
SESSION_AWARE_TARGET_TIMEFRAMES = {"1D", "1W", "1M"}
SESSION_AWARE_DATE_TRUNC_UNITS = {
    "1D": "day",
    "1W": "week",
    "1M": "month",
}
SUPPORTED_TARGET_TIMEFRAMES = tuple(FIXED_TARGET_TIMEFRAME_MINUTES.keys()) + tuple(
    sorted(SESSION_AWARE_TARGET_TIMEFRAMES)
)

_TARGET_BARS_CACHE: Dict[Tuple[str, str, str, str, str, str], Dict[str, object]] = {}


def clear_target_bars_cache():
    _TARGET_BARS_CACHE.clear()


def target_bars_cache_summary():
    return {
        "keys": ["|".join(key) for key in sorted(_TARGET_BARS_CACHE.keys())],
        "windowCount": len(_TARGET_BARS_CACHE),
    }


def normalize_target_timeframe_id(value) -> str:
    raw = str(value or "").strip()
    if not raw:
        raise ValueError("'tf' must be a supported target timeframe id")

    if raw in SESSION_AWARE_TARGET_TIMEFRAMES:
        return raw
    if raw.lower() in ("1d", "1w"):
        return raw.upper()
    if raw == "1M":
        return "1M"

    unit = raw[-1:]
    if unit.lower() in ("m", "h"):
        number_text = raw[:-1]
    else:
        number_text = raw
        unit = "m"
    try:
        multiplier = int(number_text)
    except ValueError as exc:
        raise ValueError("'tf' must be a supported target timeframe id") from exc
    if multiplier <= 0:
        raise ValueError("'tf' must be a supported target timeframe id")

    minutes = multiplier * 60 if unit.lower() == "h" else multiplier
    for target_id, target_minutes in FIXED_TARGET_TIMEFRAME_MINUTES.items():
        if minutes == target_minutes:
            return target_id
    raise ValueError("'tf' must be a supported target timeframe id")


def _format_bar_time(timestamp):
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")


def _cache_key(instrument, target_id, start, end):
    return (
        str(instrument).strip().upper(),
        target_id,
        str(start).strip(),
        str(end).strip(),
        "target-bars-v1",
        "source-futures-1m",
    )


def _query_fixed_target_bars(db_path, table, instrument, start_dt, end_dt, target_id):
    tf = FIXED_TARGET_TIMEFRAME_MINUTES[target_id]
    anchor_epoch = 946684800
    anchor_offset = 7200 if target_id == "4h" else 0
    effective_anchor = anchor_epoch + anchor_offset

    sql = f"""
with bars as (
  select
    date_trunc('minute', ts) as ts,
    open, high, low, close, volume
  from {table}
  where instrument = ?
    and ts >= ?
    and ts < ?
)
select
  floor((extract(epoch from ts) - {effective_anchor}) / (60 * ?)) as bucket,
  first(open order by ts) as open,
  max(high) as high,
  min(low) as low,
  last(close order by ts) as close,
  sum(coalesce(volume, 0)) as volume,
  min(ts) as source_start_ts,
  max(ts) as source_end_ts,
  count(*) as source_bar_count
from bars
group by bucket
order by bucket
""".strip()

    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, start_dt, end_dt, tf]).fetchall()

    result = []
    for row in rows:
        timestamp = effective_anchor + int(row[0]) * tf * 60
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


def _query_session_aware_target_bars(db_path, table, instrument, start_dt, end_dt, target_id):
    trunc_unit = SESSION_AWARE_DATE_TRUNC_UNITS[target_id]
    sql = f"""
with bars as (
  select
    date_trunc('minute', ts) as ts,
    open, high, low, close, volume
  from {table}
  where instrument = ?
    and ts >= ?
    and ts < ?
    and not (extract(hour from ts) = 17)
), bucketed as (
  select
    date_trunc('{trunc_unit}', ts + interval '6 hours') - interval '6 hours' as bucket_start,
    ts, open, high, low, close, volume
  from bars
)
select
  bucket_start,
  first(open order by ts) as open,
  max(high) as high,
  min(low) as low,
  last(close order by ts) as close,
  sum(coalesce(volume, 0)) as volume,
  min(ts) as source_start_ts,
  max(ts) as source_end_ts,
  count(*) as source_bar_count
from bucketed
group by bucket_start
order by bucket_start
""".strip()

    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, start_dt, end_dt]).fetchall()

    result = []
    for row in rows:
        bucket_start = row[0].replace(tzinfo=timezone.utc)
        bucket_start_epoch = int(bucket_start.timestamp())
        trading_key_date = bucket_start + timedelta(hours=6)
        trading_key = trading_key_date.strftime(
            "%Y-%m" if target_id == "1M" else "%Y-%m-%d"
        )
        record = {
            "time": trading_key if target_id == "1D" else _format_bar_time(bucket_start_epoch),
            "timestamp": bucket_start_epoch,
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
        if target_id == "1D":
            record["tradingDay"] = trading_key
        elif target_id == "1W":
            record["tradingWeek"] = trading_key
        else:
            record["tradingMonth"] = trading_key
        result.append(record)
    return result


def query_target_bars(db_path, table, instrument, start, end, tf):
    target_id = normalize_target_timeframe_id(tf)

    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")

    normalized_instrument = str(instrument or "NQ").strip().upper()
    key = _cache_key(normalized_instrument, target_id, start, end)
    cached = _TARGET_BARS_CACHE.get(key)
    if cached:
        return {
            **cached,
            "cacheHit": True,
        }

    if target_id in SESSION_AWARE_TARGET_TIMEFRAMES:
        bars = _query_session_aware_target_bars(
            db_path, table, normalized_instrument, start_dt, end_dt, target_id
        )
    else:
        bars = _query_fixed_target_bars(db_path, table, normalized_instrument, start_dt, end_dt, target_id)

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
    _TARGET_BARS_CACHE[key] = record
    return record
