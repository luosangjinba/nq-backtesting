#!/usr/bin/env python3
"""Read-only V4 market-data HTTP entry used by deployed Replay Lab services.

The local ``v4_api.py`` process intentionally retains its maintenance and legacy
workspace routes.  Production Linux deployments start this entry instead: only
the market-data GET surface is admitted and every mutation method is rejected at
the application boundary, independently of reverse-proxy policy.
"""

import os
import sys
from http.server import ThreadingHTTPServer

import yaml


V4_ROOT = os.path.dirname(os.path.abspath(__file__))
if V4_ROOT not in sys.path:
    sys.path.insert(0, V4_ROOT)

from server.market_data_read_handler import (  # noqa: E402
    READ_ONLY_GET_PATHS,
    build_market_data_read_handler,
)


CONFIG_PATH = os.path.join(V4_ROOT, "v4_config.yaml")
with open(CONFIG_PATH, "r", encoding="utf-8") as config_file:
    V4_CONFIG = yaml.safe_load(config_file)


def _resolve_db_path():
    configured = (
        os.environ.get("V4_TRADING_DB", "").strip()
        or V4_CONFIG["database"]["trading_data"]["path"]
    )
    if os.path.isabs(configured):
        return configured
    return os.path.abspath(os.path.join(V4_ROOT, configured))


DB_PATH = _resolve_db_path()
TABLE_NAME = V4_CONFIG["database"]["trading_data"]["table"]
ECONOMIC_CALENDAR_PATH = os.path.join(
    V4_ROOT,
    "data",
    "economic_calendar",
    "economic_calendar_usd_events.csv",
)
V4ReadOnlyHandler = build_market_data_read_handler(
    db_path=DB_PATH,
    table_name=TABLE_NAME,
    economic_calendar_path=ECONOMIC_CALENDAR_PATH,
)


def create_server(host, port):
    """Build the deployed read-only server for production and smoke tests."""

    return ThreadingHTTPServer((host, port), V4ReadOnlyHandler)


def main():
    host = os.environ.get("V4_API_HOST", "").strip() or V4_CONFIG["api"]["host"]
    port = int(os.environ.get("V4_API_PORT", "") or V4_CONFIG["api"]["port"])
    server = create_server(host, port)
    print(f"[V4 read-only API] Running on http://{host}:{port}")
    print(f"[V4 read-only API] DB: {DB_PATH}")
    print("[V4 read-only API] Methods: GET, OPTIONS")
    print(f"[V4 read-only API] Endpoints: {', '.join(sorted(READ_ONLY_GET_PATHS))}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[V4 read-only API] Stopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
