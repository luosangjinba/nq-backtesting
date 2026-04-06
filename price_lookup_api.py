#!/usr/bin/env python3
"""Small local HTTP API for querying DuckDB minute bars."""

from __future__ import annotations

import argparse
import json
import mimetypes
import re
import uuid
from datetime import datetime, timedelta
from email.parser import BytesParser
from email.policy import default as default_email_policy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict
from urllib.parse import parse_qs, urlparse

import duckdb


VALID_FIELDS = {"open", "high", "low", "close"}
ALLOWED_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
IMAGE_ROUTE_PREFIX = "/backtesting-images/"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local price lookup API for yaml_panel.html")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host, default 127.0.0.1")
    parser.add_argument("--port", type=int, default=8765, help="Bind port, default 8765")
    parser.add_argument("--db-file", default="trading_data.duckdb", help="DuckDB file path")
    parser.add_argument("--table", default="futures_1m", help="Target table name")
    parser.add_argument("--image-root", default="backtesting-images", help="Directory used to store uploaded images")
    return parser


def resolve_db_path(db_file: str) -> str:
    value = db_file.strip()
    if not value:
        raise ValueError("db file path cannot be empty")
    if any(sep in value for sep in ("/", "\\")) or value.lower().endswith(".duckdb"):
        return value
    return value + ".duckdb"


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


def validate_section(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", value):
        raise ValueError("invalid section")
    return value


def sanitize_filename_part(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9_\-]+", "-", (value or "").strip())
    text = re.sub(r"-{2,}", "-", text).strip("-_")
    return text[:40] or "image"


def open_db(db_path: str) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(db_path, read_only=False)


def ensure_table_exists(db_path: str, table: str) -> None:
    with open_db(db_path) as conn:
        exists = conn.execute(
            "select count(*) from information_schema.tables where table_name = ?",
            [table],
        ).fetchone()
    if not exists or exists[0] == 0:
        raise RuntimeError(f"table not found: {table}")


def query_price(
    db_path: str,
    table: str,
    instrument: str,
    date_str: str,
    time_str: str,
    tf: int,
    field: str,
) -> Dict[str, object]:
    start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    end_dt = start_dt + timedelta(minutes=tf)

    sql = f"""
select ts, open, high, low, close
from {table}
where instrument = ?
  and ts >= ?
  and ts < ?
order by ts
""".strip()

    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, start_dt, end_dt]).fetchall()

    if not rows:
        raise LookupError("no data found for requested time window")

    opens = float(rows[0][1])
    highs = max(float(row[2]) for row in rows)
    lows = min(float(row[3]) for row in rows)
    closes = float(rows[-1][4])
    found = len(rows)
    values = {
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
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
        "missingBars": max(tf - found, 0),
        "startTs": rows[0][0].strftime("%Y-%m-%d %H:%M:%S"),
        "endTs": rows[-1][0].strftime("%Y-%m-%d %H:%M:%S"),
    }


class Handler(BaseHTTPRequestHandler):
    db_path = "trading_data.duckdb"
    table = "futures_1m"
    image_root = Path("backtesting-images")

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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

    def _send_file(self, path: Path) -> None:
        mime_type, _ = mimetypes.guess_type(str(path))
        payload = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def _public_base_url(self) -> str:
        host = self.headers.get("Host") or f"{self.server.server_address[0]}:{self.server.server_address[1]}"
        return f"http://{host}"

    def _parse_multipart_form(self) -> tuple[dict[str, str], dict[str, tuple[str, bytes]]]:
        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        if content_length <= 0:
            raise ValueError("empty upload body")
        if "multipart/form-data" not in content_type:
            raise ValueError("content type must be multipart/form-data")
        if content_length > MAX_UPLOAD_BYTES + 1024 * 1024:
            raise ValueError("upload too large")

        raw_body = self.rfile.read(content_length)
        if not raw_body:
            raise ValueError("empty upload body")

        parser = BytesParser(policy=default_email_policy)
        message = parser.parsebytes(
            f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8") + raw_body
        )

        fields: dict[str, str] = {}
        files: dict[str, tuple[str, bytes]] = {}
        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            if not name:
                continue
            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b""
            if filename:
                files[name] = (filename, payload)
            else:
                fields[name] = payload.decode("utf-8", errors="replace")
        return fields, files

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith(IMAGE_ROUTE_PREFIX):
            rel_path = parsed.path[len(IMAGE_ROUTE_PREFIX) :].lstrip("/")
            candidate = (self.image_root / rel_path).resolve()
            root = self.image_root.resolve()
            if root not in candidate.parents and candidate != root:
                self._send_json(403, {"ok": False, "error": "forbidden"})
                return
            if not candidate.exists() or not candidate.is_file():
                self._send_json(404, {"ok": False, "error": "image not found"})
                return
            self._send_file(candidate)
            return

        if parsed.path == "/health":
            try:
                ensure_table_exists(self.db_path, self.table)
                details = f"db={self.db_path}\ttable={self.table}"
                self._send_json(200, {"ok": True, "database": self.db_path, "details": details})
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
            result = query_price(self.db_path, table, instrument, date_str, time_str, tf, field)
            self._send_json(200, {"ok": True, "result": result})
        except KeyError as exc:
            self._send_json(400, {"ok": False, "error": f"missing parameter: {exc.args[0]}"})
        except LookupError as exc:
            self._send_json(404, {"ok": False, "error": str(exc)})
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(500, {"ok": False, "error": str(exc)})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/upload-image":
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        try:
            fields, files = self._parse_multipart_form()
            upload = files.get("file")
            if upload is None:
                raise ValueError("missing file")

            original_name, file_bytes = upload
            date_str = validate_date(fields.get("date", ""))
            section = validate_section(fields.get("section", "image"))
            title = fields.get("title", "")

            original_name = Path(original_name or "upload").name
            suffix = Path(original_name).suffix.lower()
            if suffix not in ALLOWED_IMAGE_SUFFIXES:
                raise ValueError("unsupported image type")
            if not file_bytes:
                raise ValueError("empty file")
            if len(file_bytes) > MAX_UPLOAD_BYTES:
                raise ValueError("image must be 10MB or smaller")

            year = date_str[:4]
            dest_dir = self.image_root / year / date_str
            dest_dir.mkdir(parents=True, exist_ok=True)
            file_stem = sanitize_filename_part(section)
            if title:
                file_stem += "-" + sanitize_filename_part(title)
            file_stem += "-" + uuid.uuid4().hex[:8]
            dest_path = dest_dir / f"{file_stem}{suffix}"

            dest_path.write_bytes(file_bytes)

            rel_path = dest_path.relative_to(self.image_root).as_posix()
            url = f"{self._public_base_url()}{IMAGE_ROUTE_PREFIX}{rel_path}"
            self._send_json(
                200,
                {
                    "ok": True,
                    "url": url,
                    "path": str(dest_path.as_posix()),
                    "filename": dest_path.name,
                },
            )
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(500, {"ok": False, "error": str(exc)})

    def log_message(self, format: str, *args) -> None:
        return


def main() -> int:
    args = build_parser().parse_args()
    db_path = resolve_db_path(args.db_file)
    if not Path(db_path).exists():
        raise SystemExit(f"duckdb file not found: {db_path}")

    Handler.db_path = db_path
    Handler.table = args.table
    Handler.image_root = Path(args.image_root)
    Handler.image_root.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(
        f"price lookup api listening on http://{args.host}:{args.port} "
        f"(db={db_path}, table={args.table}, images={Handler.image_root})"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
