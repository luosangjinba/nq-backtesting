#!/usr/bin/env python3
"""Loopback entry point for the V7-owned read-only market-data service."""

from __future__ import annotations

import argparse
import os
from http.server import ThreadingHTTPServer

from market_data_read_handler import READ_ONLY_GET_PATHS, build_market_data_read_handler


DEFAULT_DATABASE = "/srv/replay-lab-data/trading_data.duckdb"
DEFAULT_ECONOMIC_CALENDAR = (
    "/srv/replay-lab-data/economic_calendar_usd_events.csv"
)


def create_server(host, port, *, db_path, table_name, economic_calendar_path):
    handler = build_market_data_read_handler(
        db_path=db_path,
        table_name=table_name,
        economic_calendar_path=economic_calendar_path,
    )
    return ThreadingHTTPServer((host, port), handler)


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Replay Lab V7 read-only market-data service"
    )
    parser.add_argument(
        "--host",
        default=os.environ.get("V7_MARKET_DATA_HOST", "127.0.0.1"),
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("V7_MARKET_DATA_PORT", "8766")),
    )
    parser.add_argument(
        "--db",
        default=os.environ.get("V7_MARKET_DATA_DB", DEFAULT_DATABASE),
    )
    parser.add_argument(
        "--table",
        default=os.environ.get("V7_MARKET_DATA_TABLE", "futures_1m"),
    )
    parser.add_argument(
        "--economic-calendar",
        default=os.environ.get(
            "V7_ECONOMIC_CALENDAR",
            DEFAULT_ECONOMIC_CALENDAR,
        ),
    )
    return parser.parse_args()


def main():
    arguments = parse_arguments()
    if arguments.host not in {"127.0.0.1", "::1", "localhost"}:
        raise SystemExit("market-data service must bind to loopback")
    if arguments.port < 1 or arguments.port > 65_535:
        raise SystemExit("market-data service port must be between 1 and 65535")
    server = create_server(
        arguments.host,
        arguments.port,
        db_path=os.path.abspath(os.path.expanduser(arguments.db)),
        table_name=arguments.table,
        economic_calendar_path=os.path.abspath(
            os.path.expanduser(arguments.economic_calendar)
        ),
    )
    print(
        f"[V7 Market Data] Running on http://{arguments.host}:{arguments.port}",
        flush=True,
    )
    print(f"[V7 Market Data] DB: {arguments.db}", flush=True)
    print("[V7 Market Data] Methods: GET, OPTIONS", flush=True)
    print(
        f"[V7 Market Data] Endpoints: {', '.join(sorted(READ_ONLY_GET_PATHS))}",
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
