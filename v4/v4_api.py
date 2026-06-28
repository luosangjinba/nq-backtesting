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
import io
import yaml
import subprocess
import shlex
import shutil
import sys
import threading
import time
from datetime import date, datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from zoneinfo import ZoneInfo

from server.price_lookup import query_v2_bars, query_price, open_db, _parse_datetime
from server.bars_handler import handle_bars_request, handle_price_request
from server.economic_calendar_handler import handle_economic_events_request
from server.maintenance_handler import handle_data_maintenance_post_request
from server.workspace_handler import handle_workspace_get_request, handle_workspace_put_request
from server import workspace_store

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
ECONOMIC_CALENDAR_BACKUP_DIR = os.path.join(V4_ROOT, "data", "economic_calendar", "backups")
LOCAL_ENV_PATH = os.path.join(V4_ROOT, ".env.local")
_ECONOMIC_EVENTS_CACHE = None
_MAINTENANCE_LOCK = threading.Lock()
_MAINTENANCE_JOB = None
_MAINTENANCE_PROCESS = None
MAINTENANCE_REQUEST_HEADER = "X-V4-Maintenance-Request"
MAINTENANCE_REQUEST_VALUE = "data-maintenance"
WORKSPACE_REQUEST_HEADER = "X-V4-Workspace-Request"
WORKSPACE_REQUEST_VALUE = "workspace"
DEFAULT_WORKSPACE_ID = workspace_store.DEFAULT_WORKSPACE_ID
WORKSPACE_BASE_DIR = os.path.join(V4_ROOT, "data", "users", "default", "workspaces", DEFAULT_WORKSPACE_ID)
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
ECONOMIC_MANUAL_COLUMNS = ["Title", "Country", "Date", "Time", "Impact", "Forecast", "Previous", "URL"]
ECONOMIC_EVENT_KEY_FIELDS = ["event_date", "event_time_et", "currency", "title"]
ECONOMIC_IMPACT_VALUES = {"High", "Medium", "Low"}
def _parse_allowed_maintenance_origins():
    origins = {
        "http://127.0.0.1:8001",
        "http://localhost:8001",
    }
    for raw in os.environ.get("V4_ALLOWED_WEB_ORIGINS", "").split(","):
        origin = raw.strip().rstrip("/")
        if origin:
            origins.add(origin)
    return origins


ALLOWED_MAINTENANCE_ORIGINS = _parse_allowed_maintenance_origins()
LOCAL_ENV_VARIABLES = {
    "DATABENTO_API_KEY": {
        "label": "Databento API key",
        "secret": True,
        "requiresRestart": False,
        "description": "Used by Refresh Range dry-run/write and roll volume scans.",
    },
    "V4_TRADING_DB": {
        "label": "Trading DB path",
        "secret": False,
        "requiresRestart": True,
        "description": "Optional override for data/trading_data.duckdb.",
    },
    "V4_WEB_PORT": {
        "label": "Web port",
        "secret": False,
        "requiresRestart": True,
        "description": "Optional web port override for start.sh.",
    },
    "V4_API_HOST": {
        "label": "API bind host",
        "secret": False,
        "requiresRestart": True,
        "description": "Optional API bind host. Use 0.0.0.0 on a trusted server/VPN network.",
    },
    "V4_ALLOWED_WEB_ORIGINS": {
        "label": "Allowed web origins",
        "secret": False,
        "requiresRestart": True,
        "description": "Comma-separated origins allowed to run data-maintenance POST actions.",
    },
}

# CME 交易日分界：18:00 ET（数据时间戳就是美东时间）
# 日线 = 前一天18:00 ~ 当天16:59
DAILY_ANCHOR_OFFSET = 18 * 3600  # 64800 seconds
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


def current_user_id(handler=None):
    return workspace_store.current_user_id(handler)


def current_workspace_id(handler=None):
    return workspace_store.current_workspace_id(handler)


def read_workspace_document(domain, instrument=None):
    workspace_store.configure_workspace_store(base_dir=WORKSPACE_BASE_DIR)
    return workspace_store.read_workspace_document(domain, instrument)


def write_workspace_document(payload):
    workspace_store.configure_workspace_store(base_dir=WORKSPACE_BASE_DIR)
    return workspace_store.write_workspace_document(payload)


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
    global _MAINTENANCE_PROCESS
    env = os.environ.copy()
    process = subprocess.Popen(
        args,
        cwd=REPO_ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    _MAINTENANCE_PROCESS = process
    try:
        output, _ = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        output, _ = process.communicate()
        raise
    finally:
        if _MAINTENANCE_PROCESS is process:
            _MAINTENANCE_PROCESS = None
    command_label = " ".join(args[:3] + (["..."] if len(args) > 3 else []))
    return {
        "ok": process.returncode == 0,
        "returncode": process.returncode,
        "command": command_label,
        "output": output,
    }


def _parse_local_env_lines(path=LOCAL_ENV_PATH):
    entries = []
    if not os.path.exists(path):
        return entries
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f.read().splitlines():
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#") or "=" not in raw_line:
                entries.append({"kind": "raw", "line": raw_line})
                continue
            key, value = raw_line.split("=", 1)
            key = key.strip()
            if not key.replace("_", "A").isalnum() or key[:1].isdigit():
                entries.append({"kind": "raw", "line": raw_line})
                continue
            value = value.strip()
            try:
                parts = shlex.split(value, posix=True)
                value = parts[0] if parts else ""
            except ValueError:
                if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
            entries.append({"kind": "entry", "key": key, "value": value, "line": raw_line})
    return entries


def _format_env_line(key, value):
    clean_value = _clean_text(value, 1000)
    return f"{key}={shlex.quote(clean_value)}"


def _write_local_env_entries(entries, path=LOCAL_ENV_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lines = []
    for entry in entries:
        if entry.get("kind") == "entry":
            lines.append(_format_env_line(entry["key"], entry.get("value", "")))
        else:
            lines.append(entry.get("line", ""))
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines).rstrip() + "\n")


def _mask_env_value(value, secret=False):
    if value is None or value == "":
        return "unset"
    text = str(value)
    if not secret:
        return "set"
    suffix = text[-4:] if len(text) >= 4 else "****"
    return f"set ****{suffix} length={len(text)}"


def _get_local_env_status(path=LOCAL_ENV_PATH):
    entries = _parse_local_env_lines(path)
    file_values = {
        entry["key"]: entry.get("value", "")
        for entry in entries
        if entry.get("kind") == "entry" and entry.get("key") in LOCAL_ENV_VARIABLES
    }
    rows = []
    for key, definition in LOCAL_ENV_VARIABLES.items():
        file_value = file_values.get(key, "")
        process_value = os.environ.get(key, "")
        rows.append({
            "key": key,
            "label": definition["label"],
            "secret": definition["secret"],
            "requiresRestart": definition["requiresRestart"],
            "description": definition["description"],
            "fileSet": bool(file_value),
            "processSet": bool(process_value),
            "fileMasked": _mask_env_value(file_value, definition["secret"]),
            "processMasked": _mask_env_value(process_value, definition["secret"]),
        })
    return rows


def _format_local_env_status(rows, path=LOCAL_ENV_PATH):
    lines = [
        "local_environment_status: ok",
        f"file: {path}",
        f"file_exists: {str(os.path.exists(path)).lower()}",
        "",
        "variables",
    ]
    for row in rows:
        restart = " restart_required" if row["requiresRestart"] else ""
        lines.append(
            f"- {row['key']}: file={row['fileMasked']} process={row['processMasked']}{restart}"
        )
    return "\n".join(lines) + "\n"


def _set_local_env_value(key, value, path=LOCAL_ENV_PATH):
    if key not in LOCAL_ENV_VARIABLES:
        raise ValueError(f"Unsupported local environment key: {key}")
    clean_value = _clean_text(value, 1000)
    entries = _parse_local_env_lines(path)
    updated = False
    next_entries = []
    for entry in entries:
        if entry.get("kind") == "entry" and entry.get("key") == key:
            if not updated:
                next_entries.append({"kind": "entry", "key": key, "value": clean_value})
                updated = True
            continue
        next_entries.append(entry)
    if not updated:
        if next_entries and next_entries[-1].get("line", "") != "":
            next_entries.append({"kind": "raw", "line": ""})
        next_entries.append({"kind": "entry", "key": key, "value": clean_value})
    _write_local_env_entries(next_entries, path)
    os.environ[key] = clean_value
    return _get_local_env_status(path)


def _delete_local_env_value(key, path=LOCAL_ENV_PATH):
    if key not in LOCAL_ENV_VARIABLES:
        raise ValueError(f"Unsupported local environment key: {key}")
    entries = _parse_local_env_lines(path)
    next_entries = [
        entry for entry in entries
        if not (entry.get("kind") == "entry" and entry.get("key") == key)
    ]
    _write_local_env_entries(next_entries, path)
    os.environ.pop(key, None)
    return _get_local_env_status(path)


def _run_local_env_action(payload):
    action = _choice(payload.get("action"), {"environment_status", "environment_write", "environment_delete"}, "action")
    if action == "environment_status":
        rows = _get_local_env_status()
        return {
            "ok": True,
            "returncode": 0,
            "command": "local environment status",
            "output": _format_local_env_status(rows),
            "environment": rows,
        }
    key = _choice(payload.get("key"), set(LOCAL_ENV_VARIABLES), "key")
    if action == "environment_write":
        value = _clean_text(payload.get("value"), 1000)
        if not value:
            raise ValueError("Environment value cannot be empty; use Delete to remove a value")
        rows = _set_local_env_value(key, value)
        return {
            "ok": True,
            "returncode": 0,
            "command": "local environment write",
            "output": _format_local_env_status(rows) + f"write_status: saved\nupdated_key: {key}\n",
            "environment": rows,
        }
    rows = _delete_local_env_value(key)
    return {
        "ok": True,
        "returncode": 0,
        "command": "local environment delete",
        "output": _format_local_env_status(rows) + f"delete_status: deleted\nupdated_key: {key}\n",
        "environment": rows,
    }


def _terminate_active_maintenance_process(timeout=2.0):
    process = _MAINTENANCE_PROCESS
    if not process or process.poll() is not None:
        return "none"
    process.terminate()
    try:
        process.wait(timeout=timeout)
        return "terminated"
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=timeout)
        return "killed"


def _schedule_api_restart():
    def restart_later():
        time.sleep(0.6)
        log_path = os.path.join(V4_ROOT, ".api-restart.log")
        try:
            log = open(log_path, "a", encoding="utf-8")
            log.write(f"\n[{datetime.now(timezone.utc).isoformat()}] scheduled restart\n")
            log.flush()
            subprocess.Popen(
                ["bash", "start.sh", "restart"],
                cwd=V4_ROOT,
                env=os.environ.copy(),
                stdin=subprocess.DEVNULL,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        except Exception as exc:
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"restart_schedule_error: {exc}\n")
            except Exception:
                pass

    thread = threading.Thread(target=restart_later, name="v4-api-restart", daemon=True)
    thread.start()


def _run_api_restart_action(payload):
    confirm_text = _clean_text(payload.get("confirmText"), 80)
    if confirm_text != "RESTART API":
        raise ValueError("Type 'RESTART API' to restart the V4 API")
    if os.name == "nt":
        raise ValueError("Restart API from data-maintenance.html is only supported on Linux; use v4/start_windows.ps1 restart on Windows")
    child_status = _terminate_active_maintenance_process()
    _schedule_api_restart()
    return {
        "ok": True,
        "returncode": 0,
        "command": "api restart scheduled",
        "output": (
            "api_restart_status: scheduled\n"
            "restart_delay_seconds: 0.6\n"
            f"active_maintenance_process: {child_status}\n"
            "service: V4 API\n"
            "health_url: http://127.0.0.1:8766/v4/health\n"
            "note: The API may be unavailable for a few seconds while start.sh restarts it.\n"
        ),
    }


def _economic_event_key(row):
    return tuple(str(row.get(field) or "").strip() for field in ECONOMIC_EVENT_KEY_FIELDS)


def _read_economic_calendar_rows(path=None):
    path = path or ECONOMIC_CALENDAR_PATH
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def _write_economic_calendar_rows(rows, path=None):
    path = path or ECONOMIC_CALENDAR_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=ECONOMIC_CALENDAR_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def _max_economic_event_date(rows):
    dates = [str(row.get("event_date") or "").strip() for row in rows if str(row.get("event_date") or "").strip()]
    return max(dates) if dates else "n/a"


def _min_economic_event_date(rows):
    dates = [str(row.get("event_date") or "").strip() for row in rows if str(row.get("event_date") or "").strip()]
    return min(dates) if dates else "n/a"


def _count_economic_duplicates(rows):
    seen = set()
    duplicates = 0
    for row in rows:
        key = _economic_event_key(row)
        if key in seen:
            duplicates += 1
        seen.add(key)
    return duplicates


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


def _manual_economic_rows_from_csv(csv_text, *, currency_filter="USD", timezone_name="America/New_York"):
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
    return {key: str(row.get(key) or "") for key in ECONOMIC_CALENDAR_COLUMNS}


def _build_manual_economic_import_result(payload, *, write=False):
    csv_text = payload.get("csvText")
    if not csv_text:
        raise ValueError("Choose a manual economic CSV first")
    currency_filter = _clean_text(payload.get("currency") or "USD", 12).upper() or "USD"
    timezone_name = _clean_text(payload.get("timezone") or "America/New_York", 64) or "America/New_York"
    candidate_rows, parse_stats = _manual_economic_rows_from_csv(
        csv_text,
        currency_filter=currency_filter,
        timezone_name=timezone_name,
    )
    existing_rows = _read_economic_calendar_rows()
    existing_latest = _max_economic_event_date(existing_rows)
    existing_keys = {_economic_event_key(row) for row in existing_rows}
    candidate_keys = [_economic_event_key(row) for row in candidate_rows]
    existing_candidate_keys = sum(1 for key in candidate_keys if key in existing_keys)
    duplicate_candidate_keys = _count_economic_duplicates(candidate_rows)
    overlap_new_rows = [
        row for row in candidate_rows
        if existing_latest != "n/a"
        and row["event_date"] <= existing_latest
        and _economic_event_key(row) not in existing_keys
    ]
    append_rows = [
        row for row in candidate_rows
        if _economic_event_key(row) not in existing_keys
        and (existing_latest == "n/a" or row["event_date"] > existing_latest)
    ]

    output_lines = [
        "economic_manual_import_status: preview" if not write else "economic_manual_import_status: write",
        f"source_filename: {_clean_text(payload.get('filename'), 200) or 'manual.csv'}",
        f"currency_filter: {parse_stats['currency_filter']}",
        f"timezone: {timezone_name}",
        f"csv: {ECONOMIC_CALENDAR_PATH}",
        f"existing_rows: {len(existing_rows)}",
        f"existing_date_min: {_min_economic_event_date(existing_rows)}",
        f"existing_date_max: {existing_latest}",
        f"candidate_rows: {len(candidate_rows)}",
        f"candidate_date_min: {_min_economic_event_date(candidate_rows)}",
        f"candidate_date_max: {_max_economic_event_date(candidate_rows)}",
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
            os.makedirs(ECONOMIC_CALENDAR_BACKUP_DIR, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = os.path.join(
                ECONOMIC_CALENDAR_BACKUP_DIR,
                f"economic_calendar_usd_events_{timestamp}.csv",
            )
            if os.path.exists(ECONOMIC_CALENDAR_PATH):
                shutil.copy2(ECONOMIC_CALENDAR_PATH, backup_path)
            merged = [*_read_economic_calendar_rows(), *[_strip_internal_economic_fields(row) for row in append_rows]]
            merged.sort(key=lambda row: (row["event_date"], row["event_time_et"], row["currency"], row["title"]))
            _write_economic_calendar_rows(merged)
            global _ECONOMIC_EVENTS_CACHE
            _ECONOMIC_EVENTS_CACHE = None
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


def run_data_maintenance_action(payload):
    action = _choice(payload.get("action"), {
        "environment_status",
        "environment_write",
        "environment_delete",
        "api_restart",
        "roll_report",
        "roll_scan_volume",
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
        "economic_manual_preview",
        "economic_manual_write",
    }, "action")

    if action in {"environment_status", "environment_write", "environment_delete"}:
        return _run_local_env_action(payload)

    if action == "api_restart":
        return _run_api_restart_action(payload)

    python = sys.executable
    if action == "roll_report":
        return _run_maintenance_command([python, "v4/scripts/scan_roll_volume_candidates.py", "--report-calendar"])

    if action == "roll_scan_volume":
        instrument = _choice(payload.get("instrument"), {"ES", "NQ"}, "instrument")
        old_contract = _clean_text(payload.get("oldContract"), 20)
        new_contract = _clean_text(payload.get("newContract"), 20)
        start = _optional_datetime(payload.get("scanStart"), "scanStart")
        end = _optional_datetime(payload.get("scanEnd"), "scanEnd")
        if not start or not end:
            raise ValueError("scanStart and scanEnd are required")
        return _run_maintenance_command([
            python, "v4/scripts/scan_roll_volume_candidates.py",
            "--instrument", instrument,
            "--old-contract", old_contract,
            "--new-contract", new_contract,
            "--start", start,
            "--end", end,
        ], timeout=1800)

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

    if action in {"economic_manual_preview", "economic_manual_write"}:
        return _build_manual_economic_import_result(payload, write=action == "economic_manual_write")

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
    if action == "api_restart":
        return run_data_maintenance_action(payload)
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


def _is_valid_maintenance_request(headers):
    return headers.get(MAINTENANCE_REQUEST_HEADER, "") == MAINTENANCE_REQUEST_VALUE


def _is_valid_workspace_request(headers):
    return headers.get(WORKSPACE_REQUEST_HEADER, "") == WORKSPACE_REQUEST_VALUE


def _is_allowed_maintenance_origin(headers):
    origin = str(headers.get("Origin", "") or "").strip()
    if not origin:
        return True
    return origin in ALLOWED_MAINTENANCE_ORIGINS


def _get_allowed_cors_origin(headers):
    origin = str(headers.get("Origin", "") or "").strip()
    return origin if origin in ALLOWED_MAINTENANCE_ORIGINS else ""


def _is_allowed_maintenance_post(headers):
    return _is_valid_maintenance_request(headers) and _is_allowed_maintenance_origin(headers)


def _parse_price_request(params):
    timestamp = params.get("timestamp", [None])[0]
    instrument = params.get("instrument", ["NQ"])[0]
    if not timestamp:
        raise ValueError("Missing 'timestamp' parameter")
    return int(timestamp), instrument


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
    def _send_json(self, data, status=200, cors_origin="*"):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        if cors_origin:
            self.send_header("Access-Control-Allow-Origin", cors_origin)
            if cors_origin != "*":
                self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, message, status=400, cors_origin="*"):
        self._send_json({"error": message}, status, cors_origin=cors_origin)

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
        elif path == "/v4/workspace":
            self._handle_workspace_get(params)
        else:
            self._send_error(f"Unknown endpoint: {path}", 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path != "/v4/data_maintenance/run":
            self._send_error(f"Unknown endpoint: {path}", 404)
            return

        allowed_origin = _get_allowed_cors_origin(self.headers)
        if not _is_valid_maintenance_request(self.headers):
            self._send_error("Missing or invalid data maintenance request header", 403, cors_origin=allowed_origin)
            return

        if not _is_allowed_maintenance_origin(self.headers):
            self._send_error("Origin is not allowed for data maintenance requests", 403, cors_origin="")
            return

        try:
            handle_data_maintenance_post_request(
                self,
                send_json=self._send_json,
                send_error=self._send_error,
                cors_origin=allowed_origin,
                read_json_body=_read_json_body,
                run_action_guarded=run_data_maintenance_action_guarded,
            )
        except Exception as e:
            self._send_error(str(e), 500, cors_origin=allowed_origin)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path != "/v4/workspace":
            self._send_error(f"Unknown endpoint: {path}", 404)
            return

        allowed_origin = _get_allowed_cors_origin(self.headers)
        if not _is_valid_workspace_request(self.headers):
            self._send_error("Missing or invalid workspace request header", 403, cors_origin=allowed_origin)
            return

        if not _is_allowed_maintenance_origin(self.headers):
            self._send_error("Origin is not allowed for workspace requests", 403, cors_origin="")
            return

        try:
            handle_workspace_put_request(
                self,
                send_json=self._send_json,
                send_error=self._send_error,
                cors_origin=allowed_origin,
                read_json_body=_read_json_body,
                write_workspace_document=write_workspace_document,
            )
        except Exception as e:
            self._send_error(str(e), 500, cors_origin=allowed_origin)

    def _handle_bars(self, params):
        handle_bars_request(
            params,
            send_json=self._send_json,
            send_error=self._send_error,
            db_path=DB_PATH,
            table_name=TABLE_NAME,
            validate_range=_validate_bars_request_range,
            query_bars=query_v4_bars,
        )

    def _handle_price(self, params):
        handle_price_request(
            params,
            send_json=self._send_json,
            send_error=self._send_error,
            parse_price_request=_parse_price_request,
            query_price=lambda timestamp, instrument: query_price(timestamp, DB_PATH, TABLE_NAME, instrument),
        )

    def _handle_economic_events(self, params):
        handle_economic_events_request(
            params,
            send_json=self._send_json,
            send_error=self._send_error,
            query_economic_events=query_economic_events,
        )

    def _handle_workspace_get(self, params):
        handle_workspace_get_request(
            params,
            send_json=self._send_json,
            send_error=self._send_error,
            read_workspace_document=read_workspace_document,
        )

    def do_OPTIONS(self):
        parsed = urlparse(self.path)
        allowed_origin = _get_allowed_cors_origin(self.headers)
        self.send_response(204)
        if parsed.path == "/v4/data_maintenance/run":
            if allowed_origin:
                self.send_header("Access-Control-Allow-Origin", allowed_origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", f"Content-Type, {MAINTENANCE_REQUEST_HEADER}")
        elif parsed.path == "/v4/workspace":
            if allowed_origin:
                self.send_header("Access-Control-Allow-Origin", allowed_origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", f"Content-Type, {WORKSPACE_REQUEST_HEADER}")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    host = os.environ.get("V4_API_HOST", "").strip() or V4_CONFIG["api"]["host"]
    port = V4_CONFIG["api"]["port"]
    server = ThreadingHTTPServer((host, port), V4Handler)
    print(f"[V4 API] Running on http://{host}:{port}")
    print(f"[V4 API] DB: {DB_PATH}")
    print(f"[V4 API] Endpoints: /v4/health, /v4/bars, /v4/price, /v4/economic_events, /v4/workspace")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[V4 API] Stopped")
        server.server_close()


if __name__ == "__main__":
    main()
