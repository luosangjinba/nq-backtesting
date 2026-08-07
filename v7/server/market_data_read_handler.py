"""Read-only HTTP adapter for the V7-owned market-data query surface."""

from __future__ import annotations

from datetime import timezone
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from market_data_economic_calendar import query_economic_events
from market_data_queries import (
    SUPPORTED_PROJECTED_CALENDAR_TIMEFRAMES,
    SUPPORTED_PROJECTED_TIMEFRAME_MINUTES,
    SUPPORTED_TARGET_TIMEFRAMES,
    parse_datetime,
    query_available_dates,
    query_bars,
    query_price,
    query_projected_history,
    query_target_bars,
    validate_bars_request_range,
    validate_table_name,
)
from market_data_revision import (
    DatasetRevisionMismatch,
    DatasetRevisionUnstable,
    require_expected_revision,
    resolve_dataset_revision,
    resolve_dataset_revision_if_ready,
)


ROUTE_PREFIX = "/v7/market-data"
READ_ONLY_GET_PATHS = frozenset({
    f"{ROUTE_PREFIX}/health",
    f"{ROUTE_PREFIX}/bars",
    f"{ROUTE_PREFIX}/available-dates",
    f"{ROUTE_PREFIX}/target-bars",
    f"{ROUTE_PREFIX}/projected-history",
    f"{ROUTE_PREFIX}/price",
    f"{ROUTE_PREFIX}/economic-events",
})


def _requested_instruments(params):
    values = []
    for raw in params.get("instrument", []):
        values.extend(part.strip() for part in raw.split(",") if part.strip())
    return values


def build_market_data_read_handler(*, db_path, table_name, economic_calendar_path):
    """Bind immutable V7 data-source configuration to a read-only handler."""

    validated_table = validate_table_name(table_name)

    class MarketDataReadHandler(BaseHTTPRequestHandler):
        server_version = "ReplayLabMarketData/7.0"

        def _send_json(self, data, status=200):
            encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode(
                "utf-8"
            )
            try:
                self.send_response(status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(encoded)
            except (BrokenPipeError, ConnectionResetError):
                self.close_connection = True

        def _send_error(self, message, status=400):
            self._send_json({"error": message}, status)

        def _reject_mutation(self):
            self.send_response(405)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Allow", "GET, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Mutation is disabled on the V7 read-only market-data API",
            }).encode("utf-8"))

        def do_GET(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path
            if path not in READ_ONLY_GET_PATHS:
                self._send_error(f"Unknown endpoint: {path}", 404)
                return
            params = parse_qs(parsed.query)
            handlers = {
                f"{ROUTE_PREFIX}/health": self._handle_health,
                f"{ROUTE_PREFIX}/bars": lambda: self._handle_bars(params),
                f"{ROUTE_PREFIX}/available-dates": (
                    lambda: self._handle_available_dates(params)
                ),
                f"{ROUTE_PREFIX}/target-bars": lambda: self._handle_target_bars(params),
                f"{ROUTE_PREFIX}/projected-history": (
                    lambda: self._handle_projected_history(params)
                ),
                f"{ROUTE_PREFIX}/price": lambda: self._handle_price(params),
                f"{ROUTE_PREFIX}/economic-events": (
                    lambda: self._handle_economic_events(params)
                ),
            }
            handlers[path]()

        def do_POST(self):  # noqa: N802
            self._reject_mutation()

        do_PUT = do_POST
        do_PATCH = do_POST
        do_DELETE = do_POST

        def do_OPTIONS(self):  # noqa: N802
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Allow", "GET, OPTIONS")
            self.end_headers()

        def _handle_health(self):
            try:
                revision = resolve_dataset_revision_if_ready(db_path, validated_table)
            except OSError as error:
                self._send_error(f"market database cannot be inspected: {error}", 503)
                return
            self._send_json({
                "status": "ok",
                "version": "7.0",
                "databaseReady": revision is not None,
                "datasetRevision": revision,
                "capabilities": {
                    "bars": True,
                    "availableDates": True,
                    "targetBars": True,
                    "targetTimeframes": list(SUPPORTED_TARGET_TIMEFRAMES),
                    "projectedHistory": True,
                    "projectedHistoryTimeframes": [
                        *sorted(SUPPORTED_PROJECTED_TIMEFRAME_MINUTES),
                        *SUPPORTED_PROJECTED_CALENDAR_TIMEFRAMES.keys(),
                    ],
                },
            })

        def _handle_bars(self, params):
            start = params.get("start", [None])[0]
            end = params.get("end", [None])[0]
            instrument = params.get("instrument", ["NQ"])[0]
            if not start or not end:
                self._send_error(
                    "Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)"
                )
                return
            try:
                timeframe = int(params.get("tf", ["1"])[0])
                validation = validate_bars_request_range(start, end, timeframe)
                expected_revision = params.get("datasetRevision", [None])[0]
                bars = None
                revision = None
                for _attempt in range(2):
                    revision = resolve_dataset_revision(db_path, validated_table)
                    require_expected_revision(expected_revision, revision)
                    bars = query_bars(
                        db_path,
                        validated_table,
                        instrument,
                        start,
                        end,
                        timeframe,
                    )
                    revision_after_read = resolve_dataset_revision(
                        db_path,
                        validated_table,
                    )
                    if revision_after_read == revision:
                        break
                    require_expected_revision(expected_revision, revision_after_read)
                else:
                    raise DatasetRevisionUnstable(
                        "market database changed repeatedly while bars were being read"
                    )
                start_dt = validation["start_dt"]
                end_dt = validation["end_dt"]
                self._send_json({
                    "bars": bars,
                    "datasetRevision": revision,
                    "requestedRange": {
                        "startTs": int(
                            start_dt.replace(tzinfo=timezone.utc).timestamp()
                        ),
                        "endTs": int(end_dt.replace(tzinfo=timezone.utc).timestamp()),
                    },
                })
            except DatasetRevisionMismatch as error:
                self._send_error(str(error), 409)
            except OverflowError as error:
                self._send_error(str(error), 413)
            except ValueError as error:
                self._send_error(str(error), 400)
            except Exception as error:
                self._send_error(str(error), 500)

        def _handle_available_dates(self, params):
            instruments = _requested_instruments(params)
            if not instruments:
                self._send_error("Missing 'instrument' parameter")
                return
            try:
                records = query_available_dates(
                    db_path,
                    validated_table,
                    instruments,
                )
                self._send_json({
                    "schemaVersion": 1,
                    "timeZone": "America/New_York",
                    "instruments": records,
                })
            except ValueError as error:
                self._send_error(str(error), 400)
            except Exception as error:
                self._send_error(str(error), 500)

        def _handle_target_bars(self, params):
            start = params.get("start", [None])[0]
            end = params.get("end", [None])[0]
            timeframe = params.get("tf", [None])[0]
            if not start or not end:
                self._send_error(
                    "Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)"
                )
                return
            if not timeframe:
                self._send_error("Missing 'tf' parameter")
                return
            try:
                self._send_json(query_target_bars(
                    db_path,
                    validated_table,
                    params.get("instrument", ["NQ"])[0],
                    start,
                    end,
                    timeframe,
                ))
            except ValueError as error:
                self._send_error(str(error), 400)
            except Exception as error:
                self._send_error(str(error), 500)

        def _handle_projected_history(self, params):
            start = params.get("start", [None])[0]
            end = params.get("end", [None])[0]
            timeframe = params.get("tf", [None])[0]
            session_mode = params.get("session", [None])[0]
            if not start or not end:
                self._send_error(
                    "Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)"
                )
                return
            if not timeframe or not session_mode:
                self._send_error("Missing 'tf' and/or 'session' parameter")
                return
            try:
                self._send_json(query_projected_history(
                    db_path,
                    validated_table,
                    params.get("instrument", ["NQ"])[0],
                    start,
                    end,
                    timeframe,
                    session_mode,
                    params.get("datasetRevision", [None])[0],
                ))
            except DatasetRevisionMismatch as error:
                self._send_error(str(error), 409)
            except ValueError as error:
                self._send_error(str(error), 400)
            except Exception as error:
                self._send_error(str(error), 500)

        def _handle_price(self, params):
            try:
                timestamp = params.get("timestamp", [None])[0]
                if not timestamp:
                    raise ValueError("Missing 'timestamp' parameter")
                self._send_json(query_price(
                    int(timestamp),
                    db_path,
                    validated_table,
                    params.get("instrument", ["NQ"])[0],
                ))
            except ValueError as error:
                self._send_error(str(error), 400)
            except Exception as error:
                self._send_error(str(error), 500)

        def _handle_economic_events(self, params):
            try:
                events = query_economic_events(params, economic_calendar_path)
                self._send_json({"events": events, "count": len(events)})
            except ValueError as error:
                self._send_error(str(error), 400)
            except Exception as error:
                self._send_error(str(error), 500)

        def log_message(self, message, *args):
            pass

    return MarketDataReadHandler
