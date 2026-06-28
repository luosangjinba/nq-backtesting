from datetime import datetime, timezone, timedelta

from server.price_lookup import query_v2_bars, open_db, _parse_datetime


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


def estimate_bar_count(start_dt, end_dt, tf, padding=19):
    if tf <= 0 or end_dt < start_dt:
        return None
    duration_seconds = (end_dt - start_dt).total_seconds()
    estimated = int(duration_seconds // (tf * 60)) + 1
    return max(0, estimated) + padding * 2


def get_load_range_limit_days(tf):
    return LOAD_RANGE_LIMITS_DAYS.get(tf, DEFAULT_LOAD_RANGE_LIMIT_DAYS)


def get_load_range_max_estimated_bars(tf, padding=19):
    limit_days = get_load_range_limit_days(tf)
    return int((limit_days * 24 * 60) // tf) + 1 + padding * 2


def validate_bars_request_range(start, end, tf, padding=19):
    if tf <= 0:
        raise ValueError("'tf' must be a positive timeframe in minutes")

    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    if end_dt < start_dt:
        raise ValueError("'end' must be on or after 'start'")

    estimated = estimate_bar_count(start_dt, end_dt, tf, padding)
    max_estimated = get_load_range_max_estimated_bars(tf, padding)
    if estimated is None:
        raise ValueError("Invalid bars request range")
    if estimated <= max_estimated:
        return {
            "start_dt": start_dt,
            "end_dt": end_dt,
            "estimatedBars": estimated,
            "maxEstimatedBars": max_estimated,
            "limitDays": get_load_range_limit_days(tf),
        }

    tf_label = "1m" if tf == 1 else f"{tf}m"
    raise OverflowError(
        f"{tf_label} request is too large: estimated {estimated} bars, limit {max_estimated}. "
        "Narrow the date range or use a higher timeframe."
    )


def query_v4_bars(db_path, table, instrument, start, end, tf, padding=19):
    """Wrapper around query_v2_bars with CME session-aware daily aggregation."""
    if tf != 1440:
        return query_v2_bars(db_path, table, instrument, start, end, tf, padding)

    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    pad_minutes = padding * tf
    query_start = start_dt - timedelta(minutes=pad_minutes)
    query_end = end_dt + timedelta(minutes=pad_minutes)

    anchor_epoch = 946684800 + DAILY_ANCHOR_OFFSET

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
)
select
  floor((extract(epoch from ts) - {anchor_epoch}) / (60 * ?)) as bucket,
  first(open order by ts) as open,
  max(high) as high,
  min(low) as low,
  last(close order by ts) as close,
  sum(coalesce(volume, 0)) as volume
from bars
group by bucket
order by bucket
""".strip()

    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, query_start, query_end, tf]).fetchall()

    result = []
    for row in rows:
        session_start_epoch = anchor_epoch + int(row[0]) * tf * 60
        trading_day = datetime.fromtimestamp(session_start_epoch, tz=timezone.utc) + timedelta(days=1)
        trading_day_str = trading_day.strftime("%Y-%m-%d")
        result.append({
            "time": trading_day_str,
            "timestamp": session_start_epoch,
            "tradingDay": trading_day_str,
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]) if row[5] is not None else 0,
        })
    return result
