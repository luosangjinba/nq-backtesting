"""Read-only HTTP adapter for the deployed V4 market-data query surface."""

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from server import bars_service
from server import economic_calendar_service
from server import market_data_calendar_service
from server import market_data_revision
from server import projected_history_service
from server import target_bars_service
from server.bars_handler import (
    handle_bars_request,
    handle_price_request,
    handle_projected_history_request,
    handle_target_bars_request,
)
from server.economic_calendar_handler import handle_economic_events_request
from server.market_data_calendar_handler import handle_available_dates_request
from server.price_lookup import query_price


READ_ONLY_GET_PATHS = frozenset({
    "/v4/health",
    "/v4/bars",
    "/v4/available_dates",
    "/v4/target_bars",
    "/v4/projected_history",
    "/v4/price",
    "/v4/economic_events",
})


def build_market_data_read_handler(*, db_path, table_name, economic_calendar_path):
    """Bind immutable data-source configuration to a read-only HTTP handler."""

    class MarketDataReadHandler(BaseHTTPRequestHandler):
        def _send_json(self, data, status=200):
            try:
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
            except (BrokenPipeError, ConnectionResetError):
                self.close_connection = True

        def _send_error(self, message, status=400):
            self._send_json({"error": message}, status)

        def _reject_mutation(self):
            self.send_response(405)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Allow", "GET, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Mutation is disabled on the deployed read-only market-data API",
            }).encode())

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path
            if path not in READ_ONLY_GET_PATHS:
                self._send_error(f"Unknown endpoint: {path}", 404)
                return

            params = parse_qs(parsed.query)
            if path == "/v4/health":
                self._handle_health()
            elif path == "/v4/bars":
                self._handle_bars(params)
            elif path == "/v4/available_dates":
                self._handle_available_dates(params)
            elif path == "/v4/target_bars":
                self._handle_target_bars(params)
            elif path == "/v4/projected_history":
                self._handle_projected_history(params)
            elif path == "/v4/price":
                self._handle_price(params)
            elif path == "/v4/economic_events":
                self._handle_economic_events(params)

        def do_POST(self):
            self._reject_mutation()

        def do_PUT(self):
            self._reject_mutation()

        def do_PATCH(self):
            self._reject_mutation()

        def do_DELETE(self):
            self._reject_mutation()

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Allow", "GET, OPTIONS")
            self.end_headers()

        def _handle_health(self):
            try:
                revision = market_data_revision.resolve_dataset_revision_if_ready(
                    db_path, table_name
                )
            except OSError as exc:
                self._send_error(f"market database cannot be inspected: {exc}", 503)
                return
            self._send_json({
                "status": "ok",
                "version": "4.0",
                "databaseReady": revision is not None,
                "datasetRevision": revision,
                "capabilities": {
                    "bars": True,
                    "availableDates": True,
                    "targetBars": True,
                    "targetTimeframes": list(
                        target_bars_service.SUPPORTED_TARGET_TIMEFRAMES
                    ),
                    "projectedHistory": True,
                    "projectedHistoryTimeframes": [
                        *sorted(projected_history_service.SUPPORTED_TIMEFRAME_MINUTES),
                        *projected_history_service.SUPPORTED_CALENDAR_TIMEFRAMES.keys(),
                    ],
                },
            })

        def _handle_bars(self, params):
            handle_bars_request(
                params,
                send_json=self._send_json,
                send_error=self._send_error,
                db_path=db_path,
                table_name=table_name,
                validate_range=bars_service.validate_bars_request_range,
                query_bars=bars_service.query_v4_bars,
                resolve_dataset_revision=market_data_revision.resolve_dataset_revision,
            )

        def _handle_available_dates(self, params):
            handle_available_dates_request(
                params,
                send_json=self._send_json,
                send_error=self._send_error,
                db_path=db_path,
                table_name=table_name,
                query_available_dates=(
                    market_data_calendar_service.query_available_market_dates
                ),
            )

        def _handle_target_bars(self, params):
            handle_target_bars_request(
                params,
                send_json=self._send_json,
                send_error=self._send_error,
                db_path=db_path,
                table_name=table_name,
                query_target_bars=target_bars_service.query_target_bars,
            )

        def _handle_projected_history(self, params):
            handle_projected_history_request(
                params,
                send_json=self._send_json,
                send_error=self._send_error,
                db_path=db_path,
                table_name=table_name,
                query_projected_history=projected_history_service.query_projected_history,
            )

        def _handle_price(self, params):
            def parse_price_request():
                timestamp = params.get("timestamp", [None])[0]
                instrument = params.get("instrument", ["NQ"])[0]
                if not timestamp:
                    raise ValueError("Missing 'timestamp' parameter")
                return int(timestamp), instrument

            handle_price_request(
                params,
                send_json=self._send_json,
                send_error=self._send_error,
                parse_price_request=lambda _params: parse_price_request(),
                query_price=lambda timestamp, instrument: query_price(
                    timestamp, db_path, table_name, instrument
                ),
            )

        def _handle_economic_events(self, params):
            def query_economic_events(request_params):
                economic_calendar_service.configure_economic_calendar(
                    path=economic_calendar_path
                )
                return economic_calendar_service.query_economic_events(request_params)

            handle_economic_events_request(
                params,
                send_json=self._send_json,
                send_error=self._send_error,
                query_economic_events=query_economic_events,
            )

        def log_message(self, format, *args):
            pass

    return MarketDataReadHandler
