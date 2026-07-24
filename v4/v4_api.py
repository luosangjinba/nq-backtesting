#!/usr/bin/env python3
"""V4 精简 API 服务器 — 仅含 K 线查询所需端点

端口 8766，与 v3 的 8765 并行运行。

日线聚合使用 CME 交易日分界 (18:00 ET)，
数据时间戳为美东时间，不做 UTC 转换。
API 返回 { bars, requestedRange } 格式，requestedRange 供前端过滤 padding。
"""

import json
import os
import yaml
import sys
from datetime import date, datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from server.price_lookup import query_price
from server import bars_service
from server import target_bars_service
from server.bars_handler import handle_bars_request, handle_price_request, handle_target_bars_request
from server.economic_calendar_handler import handle_economic_events_request
from server.maintenance_handler import handle_data_maintenance_post_request
from server.market_data_calendar_handler import handle_available_dates_request
from server import local_env_service
from server import maintenance_service
from server import market_data_backup_service
from server import market_data_coverage_service
from server import market_data_calendar_service
from server import roll_maintenance_service
from server import economic_calendar_service
from server import economic_manual_import
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
ROLL_CALENDAR_PATH = os.path.join(V4_ROOT, "data_config", "futures_roll_calendar.yml")
ROLL_CALENDAR_BACKUP_DIR = os.path.join(V4_ROOT, "data_config", "roll_calendar_backups")
ROLL_CALENDAR_AUDIT_PATH = os.path.join(V4_ROOT, "data_config", "roll_calendar_audit.jsonl")
MAINTENANCE_REQUEST_HEADER = "X-V4-Maintenance-Request"
MAINTENANCE_REQUEST_VALUE = "data-maintenance"
WORKSPACE_REQUEST_HEADER = "X-V4-Workspace-Request"
WORKSPACE_REQUEST_VALUE = "workspace"
DEFAULT_WORKSPACE_ID = workspace_store.DEFAULT_WORKSPACE_ID
WORKSPACE_BASE_DIR = os.path.join(V4_ROOT, "data", "users", "default", "workspaces", DEFAULT_WORKSPACE_ID)
def _parse_allowed_maintenance_origins():
    origins = {
        "http://127.0.0.1:8001",
        "http://localhost:8001",
        "http://127.0.0.1:8007",
        "http://localhost:8007",
    }
    for raw in os.environ.get("V4_ALLOWED_WEB_ORIGINS", "").split(","):
        origin = raw.strip().rstrip("/")
        if origin:
            origins.add(origin)
    return origins


ALLOWED_MAINTENANCE_ORIGINS = _parse_allowed_maintenance_origins()

def _estimate_bar_count(start_dt, end_dt, tf, padding=19):
    return bars_service.estimate_bar_count(start_dt, end_dt, tf, padding)


def _get_load_range_limit_days(tf):
    return bars_service.get_load_range_limit_days(tf)


def _get_load_range_max_estimated_bars(tf, padding=19):
    return bars_service.get_load_range_max_estimated_bars(tf, padding)


def _validate_bars_request_range(start, end, tf, padding=19):
    return bars_service.validate_bars_request_range(start, end, tf, padding)


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
    return maintenance_service.run_maintenance_command(args, timeout=timeout)


def _run_local_env_action(payload):
    return local_env_service.run_local_env_action(payload, path=LOCAL_ENV_PATH)


def _run_api_restart_action(payload):
    return maintenance_service.run_api_restart_action(payload, v4_root=V4_ROOT)


def _economic_event_key(row):
    return economic_calendar_service.economic_event_key(row)


def _read_economic_calendar_rows(path=None):
    economic_calendar_service.configure_economic_calendar(path=path or ECONOMIC_CALENDAR_PATH)
    return economic_calendar_service.read_economic_calendar_rows(path)


def _write_economic_calendar_rows(rows, path=None):
    economic_calendar_service.configure_economic_calendar(path=path or ECONOMIC_CALENDAR_PATH)
    economic_calendar_service.write_economic_calendar_rows(rows, path)


def _max_economic_event_date(rows):
    return economic_calendar_service.max_economic_event_date(rows)


def _min_economic_event_date(rows):
    return economic_calendar_service.min_economic_event_date(rows)


def _count_economic_duplicates(rows):
    return economic_calendar_service.count_economic_duplicates(rows)


def _build_manual_economic_import_result(payload, *, write=False):
    return economic_manual_import.build_manual_economic_import_result(
        payload,
        write=write,
        calendar_path=ECONOMIC_CALENDAR_PATH,
        backup_dir=ECONOMIC_CALENDAR_BACKUP_DIR,
    )


def run_data_maintenance_action(payload):
    action = _choice(payload.get("action"), {
        "environment_status",
        "environment_write",
        "environment_delete",
        "coverage_status",
        "backup",
        "api_restart",
        "roll_report",
        "roll_scan_volume",
        "roll_health",
        "roll_scan_v2",
        "roll_preview_v2",
        "roll_commit_v2",
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

    if action == "coverage_status":
        return market_data_coverage_service.build_coverage_result(DB_PATH)

    if action == "backup":
        return market_data_backup_service.backup_market_data_database(DB_PATH)

    if action == "api_restart":
        return _run_api_restart_action(payload)

    python = sys.executable
    if action in roll_maintenance_service.ROLL_ACTIONS:
        return roll_maintenance_service.run_roll_action(
            action,
            payload,
            calendar_path=ROLL_CALENDAR_PATH,
            db_path=DB_PATH,
            backup_dir=ROLL_CALENDAR_BACKUP_DIR,
            audit_path=ROLL_CALENDAR_AUDIT_PATH,
            python=python,
            run_command=_run_maintenance_command,
        )

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

    if action == "confirm_roll_write":
        raise ValueError(
            "Legacy roll-calendar writes are disabled; use the V7 Contract Roll v2 "
            "Scan -> Preview -> typed Commit workflow."
        )

    if action == "confirm_roll_preview":
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
        return _run_maintenance_command(args)

    if action in {"preflight", "dry_run", "write"}:
        instrument = _choice(payload.get("instrument"), {"ES", "NQ"}, "instrument")
        start = _optional_datetime(payload.get("start"), "start")
        end = _optional_datetime(payload.get("end"), "end")
        chunk_days = int(payload.get("chunkDays") or 3)
        if chunk_days <= 0 or chunk_days > 30:
            raise ValueError("chunkDays must be between 1 and 30")
        args = [
            python,
            "v4/scripts/update_databento_1m.py",
            "--db",
            DB_PATH,
            "--instrument",
            instrument,
        ]
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
    return maintenance_service.run_data_maintenance_action_guarded(
        payload,
        run_action=run_data_maintenance_action,
    )


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


def _normalize_economic_event(row, index):
    return economic_calendar_service.normalize_economic_event(row, index)


def load_economic_events():
    economic_calendar_service.configure_economic_calendar(path=ECONOMIC_CALENDAR_PATH)
    return economic_calendar_service.load_economic_events()


def query_economic_events(params):
    economic_calendar_service.configure_economic_calendar(path=ECONOMIC_CALENDAR_PATH)
    return economic_calendar_service.query_economic_events(params)


def query_v4_bars(db_path, table, instrument, start, end, tf, padding=19):
    return bars_service.query_v4_bars(db_path, table, instrument, start, end, tf, padding)


def query_target_bars(db_path, table, instrument, start, end, tf):
    return target_bars_service.query_target_bars(db_path, table, instrument, start, end, tf)


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
            self._send_json({
                "status": "ok",
                "version": "4.0",
                "capabilities": {
                    "bars": True,
                    "availableDates": True,
                    "targetBars": True,
                    "targetTimeframes": list(target_bars_service.SUPPORTED_TARGET_TIMEFRAMES),
                },
            })
        elif path == "/v4/bars":
            self._handle_bars(params)
        elif path == "/v4/available_dates":
            self._handle_available_dates(params)
        elif path == "/v4/target_bars":
            self._handle_target_bars(params)
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

    def _handle_available_dates(self, params):
        handle_available_dates_request(
            params,
            send_json=self._send_json,
            send_error=self._send_error,
            db_path=DB_PATH,
            table_name=TABLE_NAME,
            query_available_dates=market_data_calendar_service.query_available_market_dates,
        )

    def _handle_target_bars(self, params):
        handle_target_bars_request(
            params,
            send_json=self._send_json,
            send_error=self._send_error,
            db_path=DB_PATH,
            table_name=TABLE_NAME,
            query_target_bars=query_target_bars,
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
    port = int(os.environ.get("V4_API_PORT", "") or V4_CONFIG["api"]["port"])
    server = ThreadingHTTPServer((host, port), V4Handler)
    print(f"[V4 API] Running on http://{host}:{port}")
    print(f"[V4 API] DB: {DB_PATH}")
    print(f"[V4 API] Endpoints: /v4/health, /v4/bars, /v4/available_dates, /v4/target_bars, /v4/price, /v4/economic_events, /v4/workspace")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[V4 API] Stopped")
        server.server_close()


if __name__ == "__main__":
    main()
