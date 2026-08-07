#!/usr/bin/env python3
"""Loopback HTTP boundary for first-run CSV/DuckDB market-data import."""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from database_import_store import DatabaseImportStore, ImportRequestError, require_user_id

USER_HEADER = "X-Replay-Lab-User"
FILENAME_HEADER = "X-Replay-Lab-File-Name"
MAX_JSON_BYTES = 8_192


def _environment_flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class DatabaseImportRequestHandler(BaseHTTPRequestHandler):
    server_version = "ReplayLabDatabaseImport/1.0"

    @property
    def import_store(self) -> DatabaseImportStore:
        return self.server.import_store  # type: ignore[attr-defined]

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)

    def _error(self, error: ImportRequestError) -> None:
        self._json(error.status, {"error": {"code": error.code, "message": error.message}})

    def _user_id(self) -> str | None:
        try:
            return require_user_id(self.headers.get(USER_HEADER))
        except ImportRequestError as error:
            self._error(error)
            return None

    def _content_length(self, maximum: int) -> int | None:
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            length = -1
        if length < 1:
            self._error(ImportRequestError(411, "DATABASE_LENGTH_REQUIRED", "valid Content-Length is required"))
            return None
        if length > maximum:
            self._error(ImportRequestError(413, "DATABASE_BODY_TOO_LARGE", "request body exceeds its byte limit"))
            return None
        return length

    def _read_json(self) -> dict[str, Any] | None:
        length = self._content_length(MAX_JSON_BYTES)
        if length is None:
            return None
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self._error(ImportRequestError(415, "DATABASE_JSON_REQUIRED", "Content-Type must be application/json"))
            return None
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._error(ImportRequestError(400, "DATABASE_JSON_INVALID", "request must be valid UTF-8 JSON"))
            return None
        if not isinstance(value, dict):
            self._error(ImportRequestError(400, "DATABASE_JSON_OBJECT", "request body must be a JSON object"))
            return None
        return value

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/v7/database/health":
            self._json(200, self.import_store.health())
            return
        if parsed.path not in {
            "/v7/database/import/current",
            "/v7/database/import/status",
        }:
            self._error(ImportRequestError(404, "DATABASE_ROUTE_NOT_FOUND", "database route was not found"))
            return
        user_id = self._user_id()
        if user_id is None:
            return
        try:
            if parsed.path.endswith("/current"):
                self._json(200, self.import_store.current(user_id))
            else:
                upload_id = parse_qs(parsed.query).get("uploadId", [""])[0]
                self._json(200, self.import_store.status(user_id, upload_id))
        except ImportRequestError as error:
            self._error(error)

    def do_PUT(self) -> None:  # noqa: N802
        if urlparse(self.path).path != "/v7/database/import/upload":
            self._error(ImportRequestError(404, "DATABASE_ROUTE_NOT_FOUND", "database route was not found"))
            return
        user_id = self._user_id()
        if user_id is None:
            return
        length = self._content_length(self.import_store.max_upload_bytes)
        if length is None:
            return
        try:
            result = self.import_store.upload(
                user_id,
                unquote(self.headers.get(FILENAME_HEADER, "")),
                self.headers.get("Content-Type", ""),
                length,
                self.rfile,
            )
            self._json(201, result)
        except ImportRequestError as error:
            self._error(error)
        except Exception:
            self._error(ImportRequestError(503, "DATABASE_UPLOAD_FAILED", "upload could not be staged"))

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path not in {
            "/v7/database/import/prepare",
            "/v7/database/import/discard",
            "/v7/database/import/activate",
        }:
            self._error(ImportRequestError(404, "DATABASE_ROUTE_NOT_FOUND", "database route was not found"))
            return
        user_id = self._user_id()
        if user_id is None:
            return
        payload = self._read_json()
        if payload is None:
            return
        try:
            if path.endswith("/prepare"):
                result = self.import_store.prepare(user_id, payload.get("uploadId"))
                self._json(202, result)
            elif path.endswith("/discard"):
                result = self.import_store.discard(user_id, payload.get("uploadId"))
                self._json(200, result)
            else:
                result = self.import_store.activate(
                    user_id,
                    payload.get("uploadId"),
                    payload.get("confirmation"),
                )
                self._json(200, result)
        except ImportRequestError as error:
            self._error(error)
        except Exception:
            self._error(ImportRequestError(503, "DATABASE_OPERATION_FAILED", "database operation failed"))

    def do_DELETE(self) -> None:  # noqa: N802
        self._error(ImportRequestError(405, "DATABASE_METHOD_NOT_ALLOWED", "method is not allowed"))

    do_PATCH = do_DELETE

    def log_message(self, message: str, *args: Any) -> None:
        print(f"[V7 Database Import] {self.address_string()} {message % args}", flush=True)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Replay Lab V7 database import service")
    parser.add_argument("--host", default=os.environ.get("V7_DATABASE_IMPORT_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("V7_DATABASE_IMPORT_PORT", "8768")))
    parser.add_argument(
        "--db",
        default=os.environ.get("V7_MARKET_DATA_DB", "/srv/replay-lab-data/trading_data.duckdb"),
    )
    parser.add_argument(
        "--staging-root",
        default=os.environ.get(
            "V7_DATABASE_IMPORT_ROOT",
            "/var/lib/replay-lab/database-import",
        ),
    )
    parser.add_argument(
        "--max-upload-bytes",
        type=int,
        default=int(os.environ.get("V7_DATABASE_IMPORT_MAX_BYTES", "5000000000")),
    )
    parser.add_argument(
        "--enabled",
        action="store_true",
        default=_environment_flag("V7_DATABASE_IMPORT_ENABLED"),
        help="enable the one-time first-run importer",
    )
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    if arguments.host not in {"127.0.0.1", "::1", "localhost"}:
        raise SystemExit("database import service must bind to loopback")
    if arguments.port < 1 or arguments.port > 65_535:
        raise SystemExit("database import service port must be between 1 and 65535")
    if arguments.max_upload_bytes < 1:
        raise SystemExit("database import byte limit must be positive")
    server = ThreadingHTTPServer((arguments.host, arguments.port), DatabaseImportRequestHandler)
    server.import_store = DatabaseImportStore(  # type: ignore[attr-defined]
        arguments.db,
        arguments.staging_root,
        import_enabled=arguments.enabled,
        max_upload_bytes=arguments.max_upload_bytes,
    )
    print(
        f"[V7 Database Import] Running on http://{arguments.host}:{arguments.port}/v7/database/health",
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
