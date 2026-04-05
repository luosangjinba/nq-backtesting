#!/usr/bin/env python3
"""Small local HTTP API for querying PostgreSQL minute bars via psql."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict
from urllib.parse import parse_qs, urlparse


VALID_FIELDS = {"open", "high", "low", "close"}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local price lookup API for yaml_panel.html")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host, default 127.0.0.1")
    parser.add_argument("--port", type=int, default=8765, help="Bind port, default 8765")
    parser.add_argument("--database", default="trading_data", help="PostgreSQL database name")
    parser.add_argument("--table", default="futures_1m", help="Target table name")
    return parser


def validate_date(date_str: str) -> str:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
        raise ValueError("date must be YYYY-MM-DD")
    return date_str


def validate_time(time_str: str) -> str:
    if not re.fullmatch(r"\d{2}:\d{2}", time_str):
        raise ValueError("time must be HH:MM")
    hh = int(time_str[:2])
    mm = int(time_str[3:])
    if hh > 23 or mm > 59:
        raise ValueError("time must be HH:MM")
    return time_str


def validate_timeframe(value: str) -> int:
    tf = int(value)
    if tf not in (1, 5, 15, 30, 60, 240, 1440):
        raise ValueError("tf must be one of 1, 5, 15, 30, 60, 240, 1440")
    return tf


def validate_field(value: str) -> str:
    if value not in VALID_FIELDS:
        raise ValueError("field must be open/high/low/close")
    return value


def validate_instrument(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", value):
        raise ValueError("invalid instrument")
    return value


def validate_table(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value):
        raise ValueError("invalid table name")
    return value


def run_psql(database: str, sql: str) -> str:
    proc = subprocess.run(
        ["psql", "-d", database, "-At", "-F", "\t", "-c", sql],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "psql query failed")
    return proc.stdout.strip()


def make_sql(database: str, table: str, instrument: str, date_str: str, time_str: str, tf: int) -> str:
    _ = database
    start_ts = f"{date_str} {time_str}:00"
    return f"""
with bars as (
  select ts, open, high, low, close
  from {table}
  where instrument = '{instrument}'
    and ts >= timestamp '{start_ts}'
    and ts < timestamp '{start_ts}' + interval '{tf} minute'
  order by ts
)
select
  (array_agg(open order by ts asc))[1] as open,
  max(high) as high,
  min(low) as low,
  (array_agg(close order by ts desc))[1] as close,
  count(*) as found_bars,
  min(ts)::text as start_ts,
  max(ts)::text as end_ts
from bars;
""".strip()


def query_price(database: str, table: str, instrument: str, date_str: str, time_str: str, tf: int, field: str) -> Dict[str, object]:
    sql = make_sql(database, table, instrument, date_str, time_str, tf)
    raw = run_psql(database, sql)
    cols = raw.split("\t") if raw else []
    if len(cols) != 7 or cols[0] == "":
      raise LookupError("no data found for requested time window")

    found = int(cols[4])
    values = {
        "open": float(cols[0]),
        "high": float(cols[1]),
        "low": float(cols[2]),
        "close": float(cols[3]),
    }
    return {
        "instrument": instrument,
        "date": date_str,
        "time": time_str,
        "timeframe": tf,
        "field": field,
        "value": values[field],
        "ohlc": values,
        "foundBars": found,
        "expectedBars": tf,
        "missingBars": tf - found,
        "startTs": cols[5],
        "endTs": cols[6],
    }


class Handler(BaseHTTPRequestHandler):
    database = "trading_data"
    table = "futures_1m"

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _send_json(self, status: int, payload: Dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            try:
                output = run_psql(self.database, "select current_database(), current_user")
                self._send_json(200, {"ok": True, "database": self.database, "details": output})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path != "/price":
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        try:
            params = parse_qs(parsed.query)
            instrument = validate_instrument(params.get("instrument", ["NQ"])[0])
            date_str = validate_date(params["date"][0])
            time_str = validate_time(params["time"][0])
            tf = validate_timeframe(params.get("tf", ["1"])[0])
            field = validate_field(params.get("field", ["close"])[0])
            table = validate_table(self.table)
            result = query_price(self.database, table, instrument, date_str, time_str, tf, field)
            self._send_json(200, {"ok": True, "result": result})
        except KeyError as exc:
            self._send_json(400, {"ok": False, "error": f"missing parameter: {exc.args[0]}"})
        except LookupError as exc:
            self._send_json(404, {"ok": False, "error": str(exc)})
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(500, {"ok": False, "error": str(exc)})

    def log_message(self, format: str, *args) -> None:
        return


def main() -> int:
    args = build_parser().parse_args()
    Handler.database = args.database
    Handler.table = args.table
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"price lookup api listening on http://{args.host}:{args.port} (db={args.database}, table={args.table})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
