#!/usr/bin/env python3
"""Loopback HTTP boundary for authenticated V7 user-state snapshots."""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from state_store import (
    RevisionConflict,
    StateStore,
    StateValidationError,
    require_replacement,
    require_user_id,
)

MAX_REQUEST_BYTES = 8_000_000
USER_HEADER = "X-Replay-Lab-User"


class StateRequestHandler(BaseHTTPRequestHandler):
    server_version = "ReplayLabState/1.0"

    @property
    def state_store(self) -> StateStore:
        return self.server.state_store  # type: ignore[attr-defined]

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)

    def _error(self, status: int, code: str, message: str) -> None:
        self._json(status, {"error": {"code": code, "message": message}})

    def _user_id(self) -> str | None:
        try:
            return require_user_id(self.headers.get(USER_HEADER))
        except StateValidationError as error:
            self._error(401, "STATE_USER_REQUIRED", str(error))
            return None

    def _read_json(self) -> Any | None:
        raw_length = self.headers.get("Content-Length")
        try:
            length = int(raw_length or "")
        except ValueError:
            self._error(411, "STATE_LENGTH_REQUIRED", "a valid Content-Length is required")
            return None
        if length < 1 or length > MAX_REQUEST_BYTES:
            self._error(413, "STATE_BODY_TOO_LARGE", "state body exceeds its byte budget")
            return None
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._error(415, "STATE_JSON_REQUIRED", "Content-Type must be application/json")
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._error(400, "STATE_JSON_INVALID", "state body must be valid UTF-8 JSON")
            return None

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/v7/state/health":
            try:
                self.state_store.health()
                self._json(200, {"status": "ok", "version": 1})
            except Exception:
                self._error(503, "STATE_DATABASE_UNAVAILABLE", "state database is unavailable")
            return
        if self.path != "/v7/state/snapshot":
            self._error(404, "STATE_ROUTE_NOT_FOUND", "state route was not found")
            return
        user_id = self._user_id()
        if user_id is None:
            return
        try:
            self._json(200, self.state_store.read(user_id))
        except Exception:
            self._error(503, "STATE_READ_FAILED", "state snapshot could not be read")

    def do_PUT(self) -> None:  # noqa: N802
        if self.path != "/v7/state/snapshot":
            self._error(404, "STATE_ROUTE_NOT_FOUND", "state route was not found")
            return
        user_id = self._user_id()
        if user_id is None:
            return
        payload = self._read_json()
        if payload is None:
            return
        try:
            expected_revision, entries = require_replacement(payload)
            self._json(200, self.state_store.replace(user_id, expected_revision, entries))
        except RevisionConflict as conflict:
            self._json(409, {
                "error": {
                    "code": "STATE_REVISION_CONFLICT",
                    "message": "state changed on another client",
                },
                "current": conflict.current,
            })
        except StateValidationError as error:
            self._error(400, "STATE_REPLACEMENT_INVALID", str(error))
        except Exception:
            self._error(503, "STATE_WRITE_FAILED", "state snapshot could not be stored")

    def do_POST(self) -> None:  # noqa: N802
        self._error(405, "STATE_METHOD_NOT_ALLOWED", "method is not allowed")

    do_PATCH = do_POST
    do_DELETE = do_POST

    def log_message(self, message: str, *args: Any) -> None:
        print(f"[V7 State] {self.address_string()} {message % args}", flush=True)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Replay Lab V7 state service")
    parser.add_argument("--host", default=os.environ.get("V7_STATE_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("V7_STATE_PORT", "8767")))
    parser.add_argument(
        "--db",
        default=os.environ.get(
            "V7_STATE_DB",
            "/var/lib/replay-lab/state/replay-lab-state.sqlite3",
        ),
    )
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    if arguments.host not in {"127.0.0.1", "::1", "localhost"}:
        raise SystemExit("state service must bind to loopback")
    if arguments.port < 1 or arguments.port > 65_535:
        raise SystemExit("state service port must be between 1 and 65535")
    server = ThreadingHTTPServer((arguments.host, arguments.port), StateRequestHandler)
    server.state_store = StateStore(arguments.db)  # type: ignore[attr-defined]
    print(
        f"[V7 State] Running on http://{arguments.host}:{arguments.port}/v7/state/health",
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
