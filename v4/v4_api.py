#!/usr/bin/env python3
"""V4 精简 API 服务器 — 仅含 K 线查询所需端点

端口 8766，与 v3 的 8765 并行运行。

日线聚合使用 CME 交易日分界 (18:00 ET)，
数据时间戳为美东时间，不做 UTC 转换。
API 返回 { bars, requestedRange } 格式，requestedRange 供前端过滤 padding。
"""

import json
import os
import csv
import yaml
import subprocess
import sys
import threading
from datetime import date, datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from server.price_lookup import query_v2_bars, query_price, open_db, _parse_datetime

# 加载配置
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "v4_config.yaml")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    V4_CONFIG = yaml.safe_load(f)

V4_ROOT = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(V4_ROOT)


def _resolve_db_path():
    env_path = os.environ.get("V4_TRADING_DB", "").strip()
    configured_path = env_path or V4_CONFIG["database"]["trading_data"]["path"]
    if os.path.isabs(configured_path):
        return configured_path
    return os.path.abspath(os.path.join(V4_ROOT, configured_path))


DB_PATH = _resolve_db_path()
TABLE_NAME = V4_CONFIG["database"]["trading_data"]["table"]
ECONOMIC_CALENDAR_PATH = os.path.join(
    V4_ROOT,
    "data",
    "economic_calendar",
    "economic_calendar_usd_events.csv",
)
_ECONOMIC_EVENTS_CACHE = None
_MAINTENANCE_LOCK = threading.Lock()
_MAINTENANCE_JOB = None

# CME 交易日分界：18:00 ET（数据时间戳就是美东时间）
# 日线 = 前一天18:00 ~ 当天16:59
DAILY_ANCHOR_OFFSET = 18 * 3600  # 64800 seconds
LOAD_RANGE_LIMITS_DAYS = {
    1: 45,
    5: 90,
    15: 365,
    30: 365,
    60: 730,
    240: 1460,
    1440: 3650,
    10080: 3650,
}
DEFAULT_LOAD_RANGE_LIMIT_DAYS = 365


def _estimate_bar_count(start_dt, end_dt, tf, padding=19):
    if tf <= 0 or end_dt < start_dt:
        return None
    duration_seconds = (end_dt - start_dt).total_seconds()
    estimated = int(duration_seconds // (tf * 60)) + 1
    return max(0, estimated) + padding * 2


def _get_load_range_limit_days(tf):
    return LOAD_RANGE_LIMITS_DAYS.get(tf, DEFAULT_LOAD_RANGE_LIMIT_DAYS)


def _get_load_range_max_estimated_bars(tf, padding=19):
    limit_days = _get_load_range_limit_days(tf)
    return int((limit_days * 24 * 60) // tf) + 1 + padding * 2


def _validate_bars_request_range(start, end, tf, padding=19):
    if tf <= 0:
        raise ValueError("'tf' must be a positive timeframe in minutes")

    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    if end_dt < start_dt:
        raise ValueError("'end' must be on or after 'start'")

    estimated = _estimate_bar_count(start_dt, end_dt, tf, padding)
    max_estimated = _get_load_range_max_estimated_bars(tf, padding)
    if estimated is None:
        raise ValueError("Invalid bars request range")
    if estimated <= max_estimated:
        return {
            "start_dt": start_dt,
            "end_dt": end_dt,
            "estimatedBars": estimated,
            "maxEstimatedBars": max_estimated,
            "limitDays": _get_load_range_limit_days(tf),
        }

    tf_label = "1m" if tf == 1 else f"{tf}m"
    raise OverflowError(
        f"{tf_label} request is too large: estimated {estimated} bars, limit {max_estimated}. "
        "Narrow the date range or use a higher timeframe."
    )


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


def _parse_impact_filter(value):
    if not value:
        return None
    impacts = {part.strip().lower() for part in str(value).split(",") if part.strip()}
    return impacts or None


def _read_json_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def _clean_text(value, max_length=500):
    text = str(value or "").strip()
    if "\n" in text or "\r" in text:
        raise ValueError("Values must be single-line text")
    if len(text) > max_length:
        raise ValueError(f"Value is too long; max {max_length} characters")
    return text


def _choice(value, allowed, field):
    text = _clean_text(value)
    if text not in allowed:
        raise ValueError(f"Invalid {field}: {text}")
    return text


def _optional_datetime(value, field):
    text = _clean_text(value)
    if not text:
        return ""
    # Accept date or datetime strings; downstream scripts parse the same format.
    datetime.fromisoformat(text if "T" in text or " " in text else f"{text}T00:00:00")
    return text


def _iso_date(value, field):
    text = _clean_text(value)
    date.fromisoformat(text)
    return text


def _run_maintenance_command(args, timeout=600):
    env = os.environ.copy()
    result = subprocess.run(
        args,
        cwd=REPO_ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    command_label = " ".join(args[:3] + (["..."] if len(args) > 3 else []))
    return {
        "ok": result.returncode == 0,
        "returncode": result.returncode,
        "command": command_label,
        "output": result.stdout,
    }


def run_data_maintenance_action(payload):
    action = _choice(payload.get("action"), {
        "roll_report",
        "confirm_roll_preview",
        "confirm_roll_write",
        "preflight",
        "dry_run",
        "write",
        "verify",
        "verify_api",
        "api_smoke",
        "economic_status",
        "economic_dry_run",
        "economic_write",
        "economic_verify",
    }, "action")

    python = sys.executable
    if action == "roll_report":
        return _run_maintenance_command([python, "v4/scripts/scan_roll_volume_candidates.py", "--report-calendar"])

    if action in {"confirm_roll_preview", "confirm_roll_write"}:
        instrument = _choice(payload.get("instrument"), {"ES", "NQ"}, "instrument")
        old_contract = _clean_text(payload.get("oldContract"), 20)
        new_contract = _clean_text(payload.get("newContract"), 20)
        roll_date = _iso_date(payload.get("rollDate"), "rollDate")
        status = _choice(payload.get("status"), {"validated", "volume_validated", "manual_validated"}, "status")
        note = _clean_text(payload.get("note"), 500)
        args = [
            python, "v4/scripts/scan_roll_volume_candidates.py",
            "--confirm-roll",
            "--instrument", instrument,
            "--old-contract", old_contract,
            "--new-contract", new_contract,
            "--confirmed-roll-date", roll_date,
            "--confirmed-status", status,
            "--confirmed-note", note,
        ]
        if action == "confirm_roll_write":
            args.extend(["--write", "--confirm-write"])
        return _run_maintenance_command(args)

    if action in {"preflight", "dry_run", "write"}:
        instrument = _choice(payload.get("instrument"), {"ES", "NQ"}, "instrument")
        start = _optional_datetime(payload.get("start"), "start")
        end = _optional_datetime(payload.get("end"), "end")
        chunk_days = int(payload.get("chunkDays") or 3)
        if chunk_days <= 0 or chunk_days > 30:
            raise ValueError("chunkDays must be between 1 and 30")
        args = [python, "v4/scripts/update_databento_1m.py", "--instrument", instrument]
        if start:
            args.extend(["--start", start])
        if end:
            args.extend(["--end", end])
        if action == "preflight":
            if not end:
                raise ValueError("preflight requires an end datetime")
            args.append("--roll-status-preflight")
        else:
            args.extend(["--chunk-days", str(chunk_days), "--show-sample", "2"])
            if action == "write":
                confirm_text = _clean_text(payload.get("confirmText"), 80)
                expected = f"WRITE {instrument}"
                if confirm_text != expected:
                    raise ValueError(f"Type '{expected}' to enable write")
                args.extend(["--write", "--confirm-write"])
        return _run_maintenance_command(args, timeout=900)

    if action == "verify":
        return _run_maintenance_command([python, "v4/scripts/verify_data_freshness.py"])

    if action == "verify_api":
        return _run_maintenance_command([
            python, "v4/scripts/verify_data_freshness.py",
            "--api-url", "http://127.0.0.1:8766",
        ])

    if action == "api_smoke":
        instrument = _choice(payload.get("instrument"), {"ES", "NQ"}, "instrument")
        return _run_maintenance_command([
            python, "v4/scripts/verify_v4_bars_api.py",
            "--instrument", instrument,
            "--api-url", "http://127.0.0.1:8766",
        ])

    if action in {"economic_status", "economic_verify"}:
        return _run_maintenance_command([python, "v4/scripts/verify_economic_calendar.py"])

    if action in {"economic_dry_run", "economic_write"}:
        start = _iso_date(payload.get("fromDate"), "fromDate")
        end = _iso_date(payload.get("toDate"), "toDate")
        args = [
            python,
            "v4/scripts/update_economic_calendar.py",
            "--from-date",
            start,
            "--to-date",
            end,
        ]
        if action == "economic_write":
            confirm_text = _clean_text(payload.get("confirmText"), 120)
            expected = "WRITE ECONOMIC"
            if confirm_text != expected:
                raise ValueError(f"Type '{expected}' to enable economic calendar write")
            args.extend(["--write", "--confirm-write"])
        else:
            args.append("--dry-run")
        return _run_maintenance_command(args, timeout=1800)

    raise ValueError(f"Unsupported action: {action}")


def run_data_maintenance_action_guarded(payload):
    global _MAINTENANCE_JOB
    action = str(payload.get("action") or "unknown")
    if not _MAINTENANCE_LOCK.acquire(blocking=False):
        job = _MAINTENANCE_JOB or {}
        started_at = job.get("startedAt", "unknown")
        running_action = job.get("action", "unknown")
        return {
            "ok": False,
            "returncode": 423,
            "command": "data_maintenance busy",
            "output": (
                "Another data maintenance action is already running.\n"
                f"running_action: {running_action}\n"
                f"started_at: {started_at}\n"
                "Wait for it to finish, or restart the V4 API if the job is known to be stale."
            ),
        }
    _MAINTENANCE_JOB = {
        "action": action,
        "startedAt": datetime.now(timezone.utc).isoformat(),
    }
    try:
        return run_data_maintenance_action(payload)
    finally:
        _MAINTENANCE_JOB = None
        _MAINTENANCE_LOCK.release()


def _event_time_from_et(event_time_et):
    text = str(event_time_et or "").strip()
    if not text:
        return ""
    try:
        # The CSV stores America/New_York timestamps. V4 chart timestamps carry
        # ET wall-clock values as UTC epoch seconds, so use the local clock fields.
        parsed = datetime.fromisoformat(text)
        return f"{parsed.hour:02d}:{parsed.minute:02d}"
    except ValueError:
        if "T" in text:
            return text.split("T", 1)[1][:5]
        return ""


def _wall_timestamp_from_date_time(event_date, time_text):
    parsed_date = _parse_date(event_date)
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


def _normalize_economic_event(row, index):
    event_date = str(row.get("event_date") or "").strip()
    currency = str(row.get("currency") or "").strip() or "USD"
    title = str(row.get("title") or "").strip()
    impact = str(row.get("impact") or "").strip() or "Low"
    event_type = str(row.get("event_type") or "").strip() or "economic"
    all_day = _parse_bool(row.get("all_day"), False)
    default_visible = _parse_bool(row.get("default_visible"), False)
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


def load_economic_events():
    global _ECONOMIC_EVENTS_CACHE
    if _ECONOMIC_EVENTS_CACHE is not None:
        return _ECONOMIC_EVENTS_CACHE
    events = []
    if not os.path.exists(ECONOMIC_CALENDAR_PATH):
        _ECONOMIC_EVENTS_CACHE = []
        return _ECONOMIC_EVENTS_CACHE
    with open(ECONOMIC_CALENDAR_PATH, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for index, row in enumerate(reader, start=1):
            event = _normalize_economic_event(row, index)
            if event["eventDate"] and event["currency"] and event["title"]:
                events.append(event)
    events.sort(key=lambda event: (event["eventDate"], event["locateTimestamp"] or 0, event["title"]))
    _ECONOMIC_EVENTS_CACHE = events
    return _ECONOMIC_EVENTS_CACHE


def query_economic_events(params):
    date_from = _parse_date(params.get("date_from", params.get("start", [None]))[0])
    date_to = _parse_date(params.get("date_to", params.get("end", [None]))[0])
    currency = str(params.get("currency", ["USD"])[0] or "USD").strip().upper()
    impacts = _parse_impact_filter(params.get("impact", [None])[0])
    include_holidays = _parse_bool(params.get("include_holidays", ["true"])[0], True)

    if date_from is None or date_to is None:
        raise ValueError("Missing 'date_from' and/or 'date_to' parameter (format: YYYY-MM-DD)")
    if date_to < date_from:
        raise ValueError("'date_to' must be on or after 'date_from'")

    result = []
    for event in load_economic_events():
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


def query_v4_bars(db_path, table, instrument, start, end, tf, padding=19):
    """Wrapper around query_v2_bars with CME session-aware daily aggregation.

    For tf=1440 (daily), uses 18:00 ET as the trading day boundary
    (previous day 18:00 ~ current day 16:59). Data timestamps are ET, no UTC conversion.
    All other timeframes use query_v2_bars.
    """
    if tf != 1440:
        return query_v2_bars(db_path, table, instrument, start, end, tf, padding)

    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    pad_minutes = padding * tf
    query_start = start_dt - timedelta(minutes=pad_minutes)
    query_end = end_dt + timedelta(minutes=pad_minutes)

    # Anchor: 2000-01-01 18:00 ET so daily buckets split at 18:00 ET
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

    # 日线时间戳改为交易日日期（CME session 18:00 开盘 → 交易日 = 开盘日期 + 1天）
    # 这样 LightweightCharts crosshair 显示 "13 Jan '12" 而非 "12 Jan '12 18:00"
    # 保留数值 timestamp 用于前端 padding 过滤
    result = []
    for row in rows:
        session_start_epoch = anchor_epoch + int(row[0]) * tf * 60
        # CME session 开盘于前一天 18:00，交易日 = 开盘日期 + 1天
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


class V4Handler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, message, status=400):
        self._send_json({"error": message}, status)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/v4/health":
            self._send_json({"status": "ok", "version": "4.0"})
        elif path == "/v4/bars":
            self._handle_bars(params)
        elif path == "/v4/price":
            self._handle_price(params)
        elif path == "/v4/economic_events":
            self._handle_economic_events(params)
        else:
            self._send_error(f"Unknown endpoint: {path}", 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path != "/v4/data_maintenance/run":
            self._send_error(f"Unknown endpoint: {path}", 404)
            return

        try:
            payload = _read_json_body(self)
            result = run_data_maintenance_action_guarded(payload)
            self._send_json(result, 200 if result.get("ok") else 409)
        except subprocess.TimeoutExpired:
            self._send_error("Command timed out", 504)
        except (ValueError, json.JSONDecodeError) as e:
            self._send_error(str(e), 400)
        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_bars(self, params):
        start = params.get("start", [None])[0]
        end = params.get("end", [None])[0]
        instrument = params.get("instrument", ["NQ"])[0]

        if not start or not end:
            self._send_error("Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)")
            return

        try:
            tf = int(params.get("tf", ["1"])[0])
            validation = _validate_bars_request_range(start, end, tf)
            bars = query_v4_bars(DB_PATH, TABLE_NAME, instrument, start, end, tf)
            start_dt = validation["start_dt"]
            end_dt = validation["end_dt"]
            # 数据时间戳为美东时间语义，用 UTC epoch 避免系统时区偏移
            requested_start_ts = int(start_dt.replace(tzinfo=timezone.utc).timestamp())
            requested_end_ts = int(end_dt.replace(tzinfo=timezone.utc).timestamp())
            self._send_json({
                "bars": bars,
                "requestedRange": {
                    "startTs": requested_start_ts,
                    "endTs": requested_end_ts,
                },
            })
        except OverflowError as e:
            self._send_error(str(e), 413)
        except ValueError as e:
            self._send_error(str(e), 400)
        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_price(self, params):
        timestamp = params.get("timestamp", [None])[0]

        if not timestamp:
            self._send_error("Missing 'timestamp' parameter")
            return

        try:
            result = query_price(int(timestamp), DB_PATH, TABLE_NAME)
            self._send_json(result)
        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_economic_events(self, params):
        try:
            events = query_economic_events(params)
            self._send_json({
                "events": events,
                "count": len(events),
            })
        except ValueError as e:
            self._send_error(str(e), 400)
        except Exception as e:
            self._send_error(str(e), 500)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    host = V4_CONFIG["api"]["host"]
    port = V4_CONFIG["api"]["port"]
    server = ThreadingHTTPServer((host, port), V4Handler)
    print(f"[V4 API] Running on http://{host}:{port}")
    print(f"[V4 API] DB: {DB_PATH}")
    print(f"[V4 API] Endpoints: /v4/health, /v4/bars, /v4/price, /v4/economic_events")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[V4 API] Stopped")
        server.server_close()


if __name__ == "__main__":
    main()
