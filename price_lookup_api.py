#!/usr/bin/env python3
"""Small local HTTP API for querying DuckDB minute bars."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
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
VALID_HTF_TIMEFRAMES = {"daily": "day", "weekly": "week", "monthly": "month"}
V2_BAR_BUCKET_MINUTES = {"D": 24 * 60, "4H": 4 * 60, "1H": 60, "30M": 30, "15M": 15}
MANUAL_PDA_TYPES = {"bsl", "ssl", "eqh", "eql", "fvg"}
MANUAL_PDA_TIMEFRAMES = {"D", "4H", "1H", "30M"}
REVIEW_STATES = {"pending", "main", "parked"}
REVIEW_ROLES = {
    "unclassified",
    "daily_high",
    "daily_low",
    "ict_midnight_day_high",
    "ict_midnight_day_low",
    "d_short_high",
    "d_short_low",
    "h4_short_high",
    "h4_short_low",
    "h1_short_high",
    "h1_short_low",
}
PD_EXTREME_SESSIONS = {
    "asia",
    "ldn",
    "transition",
    "premarket",
    "ny_am",
    "ny_lunch",
    "ny_pm",
}
SESSION_DAY_SHIFT_HOURS = 6
ALLOWED_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
IMAGE_ROUTE_PREFIX = "/backtesting-images/"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local price lookup API for yaml_panel.html")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host, default 127.0.0.1")
    parser.add_argument("--port", type=int, default=8765, help="Bind port, default 8765")
    parser.add_argument("--db-file", default="trading_data.duckdb", help="DuckDB file path")
    parser.add_argument("--table", default="futures_1m", help="Target table name")
    parser.add_argument("--v2-db-file", default="v2/data/v2_research.duckdb", help="V2 DuckDB file path")
    parser.add_argument("--v2-restore-dir", default="", help="Directory used to store V2 restore points")
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
    if tf <= 0:
        raise ValueError("tf must be a positive integer")
    return tf


def validate_field(value: str) -> str:
    if value not in VALID_FIELDS:
        raise ValueError("field must be open/high/low/close")
    return value


def validate_fallback(value: str) -> str:
    text = (value or "").strip().lower()
    if text in {"", "none"}:
        return "none"
    if text == "prev":
        return text
    raise ValueError("fallback must be none/prev")


def validate_lookback_minutes(value: str) -> int:
    minutes = int(value)
    if minutes < 0:
        raise ValueError("max_lookback must be >= 0")
    return minutes


def validate_instrument(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", value):
        raise ValueError("invalid instrument")
    return value


def validate_htf_timeframe(value: str) -> str:
    text = (value or "").strip().lower()
    if text not in VALID_HTF_TIMEFRAMES:
        raise ValueError("tf must be daily/weekly/monthly")
    return text


def validate_table(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value):
        raise ValueError("invalid table name")
    return value


def validate_section(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", value):
        raise ValueError("invalid section")
    return value


def validate_pda_id(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("pdaId cannot be empty")
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", text):
        raise ValueError("invalid pdaId")
    return text


def validate_review_state(value: str) -> str:
    text = (value or "").strip().lower()
    if text not in REVIEW_STATES:
        raise ValueError("reviewState must be pending/main/parked")
    return text


def validate_review_role(value: str) -> str:
    text = (value or "").strip().lower()
    if text not in REVIEW_ROLES:
        raise ValueError(
            "reviewRole must be unclassified/daily_high/daily_low/ict_midnight_day_high/ict_midnight_day_low/"
            "d_short_high/d_short_low/h4_short_high/h4_short_low/h1_short_high/h1_short_low"
        )
    return text


def normalize_note(value: object) -> str:
    text = str(value or "").strip()
    if len(text) > 1000:
        raise ValueError("note must be 1000 chars or smaller")
    return text


def validate_restore_point_id(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("restorePointId cannot be empty")
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", text):
        raise ValueError("invalid restorePointId")
    return text


def validate_pd_extreme_session(value: str) -> str:
    text = (value or "").strip().lower()
    if text not in PD_EXTREME_SESSIONS:
        raise ValueError("session_name must be asia/ldn/transition/premarket/ny_am/ny_lunch/ny_pm")
    return text


def sanitize_filename_part(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9_\-]+", "-", (value or "").strip())
    text = re.sub(r"-{2,}", "-", text).strip("-_")
    return text[:40] or "image"


def validate_manual_pda_type(value: str) -> str:
    text = (value or "").strip().lower()
    if text not in MANUAL_PDA_TYPES:
        raise ValueError("manual pdaType must be bsl/ssl/eqh/eql/fvg")
    return text


def validate_manual_timeframe(value: str) -> str:
    text = (value or "").strip().upper()
    if text not in MANUAL_PDA_TIMEFRAMES:
        raise ValueError("manual timeframe must be D/4H/1H/30M")
    return text


def validate_manual_direction(value: str) -> str:
    text = (value or "").strip().lower()
    if not text:
        return ""
    if text not in {"bullish", "bearish"}:
        raise ValueError("direction must be bullish/bearish")
    return text


def parse_optional_number(value: object, field_name: str) -> float | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be numeric") from exc


def parse_input_timestamp(value: object, field_name: str) -> datetime:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"{field_name} is required")
    normalized = text.replace("T", " ")
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(normalized, fmt)
        except ValueError:
            continue
    raise ValueError(f"{field_name} must be YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS")


def recognize_datetime_text(value: object) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    month_map = {
        "jan": "01",
        "january": "01",
        "feb": "02",
        "february": "02",
        "mar": "03",
        "march": "03",
        "apr": "04",
        "april": "04",
        "may": "05",
        "jun": "06",
        "june": "06",
        "jul": "07",
        "july": "07",
        "aug": "08",
        "august": "08",
        "sep": "09",
        "sept": "09",
        "september": "09",
        "oct": "10",
        "october": "10",
        "nov": "11",
        "november": "11",
        "dec": "12",
        "december": "12",
    }
    text = raw.replace("’", "'").replace("‘", "'").replace("–", "-").replace("—", "-")
    text = text.replace("|", "I").replace("：", ":")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\bUTC\s*([+-])\s*[A-Za-z0-9]{1,2}\b", r"UTC\1X", text, flags=re.I)
    match = re.search(
        r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\.?\s*"
        r"(\d{1,2})\s+([A-Za-z]{3,9})\s*'?\s*(\d{2,4})"
        r"(?:\s+UTC[+-][A-Za-z0-9]{1,2}[\)\]\.,;:]*)?\s+([0-9OIlS]{1,2})\s*:\s*([0-9OIlS]{2})",
        text,
        flags=re.I,
    )
    if not match:
        return ""
    day_raw, month_raw, year_raw, hour_raw, minute_raw = match.groups()
    month = month_map.get(month_raw.lower())
    if not month:
        return ""

    def clean_digits(part: str) -> str:
        return re.sub(r"\D", "", part.replace("O", "0").replace("o", "0").replace("I", "1").replace("l", "1").replace("S", "5").replace("s", "5"))

    year_num = int(year_raw)
    year = str(1900 + year_num if year_num >= 70 else 2000 + year_num) if len(year_raw) == 2 else str(year_num).zfill(4)
    hour = clean_digits(hour_raw).zfill(2)
    minute = clean_digits(minute_raw).zfill(2)
    if int(hour) > 23 or int(minute) > 59:
        return ""
    return f"{year}-{month}-{day_raw.zfill(2)} {hour}:{minute}"


def parse_optional_timestamp(value: object, field_name: str) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    return parse_input_timestamp(text, field_name)


def parse_member_refs(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_items = value
    else:
        raw_items = re.split(r"[\s,]+", str(value))
    refs = []
    for item in raw_items:
        text = str(item or "").strip()
        if not text:
            continue
        if not re.fullmatch(r"[A-Za-z0-9_:\-\.]+", text):
            raise ValueError("memberRefs contains an invalid reference")
        refs.append(text)
    return list(dict.fromkeys(refs))[:100]


def ocr_datetime_image(file_bytes: bytes, suffix: str) -> dict[str, str]:
    tesseract = shutil.which("tesseract")
    if not tesseract:
        raise RuntimeError("missing tesseract OCR engine. Install tesseract-ocr to enable image date-time recognition.")
    try:
        from PIL import Image, ImageFilter, ImageOps
    except ImportError as exc:
        raise RuntimeError("missing Pillow. Install pillow to enable image date-time recognition.") from exc

    texts: list[str] = []
    with tempfile.TemporaryDirectory(prefix="dt-ocr-") as tmp_dir:
        raw_path = Path(tmp_dir) / f"input{suffix}"
        processed_path = Path(tmp_dir) / "processed.png"
        raw_path.write_bytes(file_bytes)
        with Image.open(raw_path) as image:
            image = ImageOps.grayscale(image)
            image = ImageOps.autocontrast(image)
            image = image.resize((image.width * 4, image.height * 4))
            image = image.filter(ImageFilter.SHARPEN)
            image = image.point(lambda pixel: 255 if pixel > 125 else 0)
            image.save(processed_path)

        for psm in ("7", "6", "13"):
            completed = subprocess.run(
                [tesseract, str(processed_path), "stdout", "--psm", psm, "-l", "eng"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            text = (completed.stdout or "").strip()
            if not text:
                continue
            if text not in texts:
                texts.append(text)
            output = recognize_datetime_text(text)
            if output:
                return {"text": text, "output": output}

    joined = " ".join(texts).strip()
    return {"text": joined, "output": recognize_datetime_text(joined)}


def session_date_from_timestamp(ts: datetime) -> str:
    return (ts + timedelta(hours=SESSION_DAY_SHIFT_HOURS)).strftime("%Y-%m-%d")


def normalize_review_role(
    review_role: str | None,
    review_state: str | None,
    timeframe: str | None,
    pda_type: str | None,
) -> str:
    role = (review_role or "").strip().lower()
    tf = (timeframe or "").strip().upper()
    pda = (pda_type or "").strip().lower()
    if role:
        migration_map = {
            "pending": "unclassified",
            "daily_short_high": "d_short_high",
            "daily_short_low": "d_short_low",
            "h4_main_pda": "h4_short_high" if pda == "bsl" else ("h4_short_low" if pda == "ssl" else "unclassified"),
            "h1_main_pda": "h1_short_high" if pda == "bsl" else ("h1_short_low" if pda == "ssl" else "unclassified"),
        }
        return migration_map.get(role, role)
    state = (review_state or "").strip().lower()
    if pda == "daily_high":
        return "daily_high"
    if pda == "daily_low":
        return "daily_low"
    if pda == "ict_midnight_day_high":
        return "ict_midnight_day_high"
    if pda == "ict_midnight_day_low":
        return "ict_midnight_day_low"
    if state == "main":
        if tf == "D" and pda == "bsl":
            return "d_short_high"
        if tf == "D" and pda == "ssl":
            return "d_short_low"
        if tf == "4H" and pda == "bsl":
            return "h4_short_high"
        if tf == "4H" and pda == "ssl":
            return "h4_short_low"
        if tf == "1H" and pda == "bsl":
            return "h1_short_high"
        if tf == "1H" and pda == "ssl":
            return "h1_short_low"
    return "unclassified"


def legacy_review_state_from_role(review_role: str | None) -> str:
    role = (review_role or "").strip().lower()
    if role in {"d_short_high", "d_short_low", "h4_short_high", "h4_short_low", "h1_short_high", "h1_short_low"}:
        return "main"
    return "pending"


def allowed_review_roles_for_record(timeframe: str | None, pda_type: str | None) -> list[str]:
    tf = (timeframe or "").strip().upper()
    pda = (pda_type or "").strip().lower()
    if tf == "D" and pda == "bsl":
        return ["unclassified", "d_short_high"]
    if tf == "D" and pda == "ssl":
        return ["unclassified", "d_short_low"]
    if tf == "4H" and pda == "bsl":
        return ["unclassified", "h4_short_high"]
    if tf == "4H" and pda == "ssl":
        return ["unclassified", "h4_short_low"]
    if tf == "1H" and pda == "bsl":
        return ["unclassified", "h1_short_high"]
    if tf == "1H" and pda == "ssl":
        return ["unclassified", "h1_short_low"]
    return []


def resolve_restore_root(v2_db_path: str, configured_restore_dir: str) -> Path:
    if configured_restore_dir.strip():
        return Path(configured_restore_dir)
    return Path(v2_db_path).resolve().parent / "restore_points"


def open_db(db_path: str) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(db_path)


def ensure_table_exists(db_path: str, table: str) -> None:
    with open_db(db_path) as conn:
        exists = conn.execute(
            "select count(*) from information_schema.tables where table_name = ?",
            [table],
        ).fetchone()
    if not exists or exists[0] == 0:
        raise RuntimeError(f"table not found: {table}")


def ensure_optional_table_exists(db_path: str, table: str) -> bool:
    if not Path(db_path).exists():
        return False
    with open_db(db_path) as conn:
        exists = conn.execute(
            "select count(*) from information_schema.tables where table_name = ?",
            [table],
        ).fetchone()
    return bool(exists and exists[0] > 0)


def ensure_v2_registry_columns(db_path: str) -> None:
    if not ensure_optional_table_exists(db_path, "pda_registry"):
        raise LookupError("v2 pda_registry not found")
    with duckdb.connect(db_path) as conn:
        existing = {row[1] for row in conn.execute("pragma table_info('pda_registry')").fetchall()}
        required_columns = {
            "trade_date": "date",
            "anchor_time": "timestamp",
            "occurrence_time": "timestamp",
            "confirm_time": "timestamp",
            "status": "varchar default 'active'",
            "manual_added": "boolean default false",
            "manual_edited": "boolean default false",
            "review_state": "varchar default 'pending'",
            "review_role": "varchar default 'unclassified'",
            "review_tag": "varchar",
            "prev_close_time": "timestamp",
            "prev_close_price": "double",
            "next_open_time": "timestamp",
            "next_open_price": "double",
        }
        for column_name, column_def in required_columns.items():
            if column_name not in existing:
                conn.execute(f"alter table pda_registry add column {column_name} {column_def}")
        conn.execute(
            """
            update pda_registry
            set review_state = 'pending'
            where coalesce(review_state, '') = ''
            """
        )
        conn.execute(
            """
            update pda_registry
            set review_role = case
              when lower(coalesce(review_role, '')) = 'pending' then 'unclassified'
              when lower(coalesce(review_role, '')) = 'daily_short_high' then 'd_short_high'
              when lower(coalesce(review_role, '')) = 'daily_short_low' then 'd_short_low'
              when lower(coalesce(review_role, '')) = 'h4_main_pda' and pda_type = 'bsl' then 'h4_short_high'
              when lower(coalesce(review_role, '')) = 'h4_main_pda' and pda_type = 'ssl' then 'h4_short_low'
              when lower(coalesce(review_role, '')) = 'h1_main_pda' and pda_type = 'bsl' then 'h1_short_high'
              when lower(coalesce(review_role, '')) = 'h1_main_pda' and pda_type = 'ssl' then 'h1_short_low'
              when coalesce(review_role, '') <> '' then lower(review_role)
              when pda_type = 'daily_high' then 'daily_high'
              when pda_type = 'daily_low' then 'daily_low'
              when pda_type = 'ict_midnight_day_high' then 'ict_midnight_day_high'
              when pda_type = 'ict_midnight_day_low' then 'ict_midnight_day_low'
              when lower(coalesce(review_state, 'pending')) = 'main' and timeframe = 'D' and pda_type = 'bsl' then 'd_short_high'
              when lower(coalesce(review_state, 'pending')) = 'main' and timeframe = 'D' and pda_type = 'ssl' then 'd_short_low'
              when lower(coalesce(review_state, 'pending')) = 'main' and timeframe = '4H' and pda_type = 'bsl' then 'h4_short_high'
              when lower(coalesce(review_state, 'pending')) = 'main' and timeframe = '4H' and pda_type = 'ssl' then 'h4_short_low'
              when lower(coalesce(review_state, 'pending')) = 'main' and timeframe = '1H' and pda_type = 'bsl' then 'h1_short_high'
              when lower(coalesce(review_state, 'pending')) = 'main' and timeframe = '1H' and pda_type = 'ssl' then 'h1_short_low'
              else 'unclassified'
            end
            where coalesce(review_role, '') = ''
               or lower(review_role) in ('pending', 'daily_short_high', 'daily_short_low', 'h4_main_pda', 'h1_main_pda')
            """
        )


def ensure_v2_pda_members_table(db_path: str) -> None:
    with duckdb.connect(db_path) as conn:
        conn.execute(
            """
            create table if not exists pda_members (
              pda_id varchar not null,
              member_type varchar not null,
              member_ref varchar not null,
              role varchar,
              note varchar,
              created_at timestamp not null default current_timestamp,
              primary key (pda_id, member_type, member_ref)
            )
            """
        )
        conn.execute(
            """
            create index if not exists idx_pda_members_pda_id
              on pda_members (pda_id)
            """
        )
        conn.execute(
            """
            create index if not exists idx_pda_members_member_ref
              on pda_members (member_type, member_ref)
            """
        )


def query_v2_pda_members(v2_db_path: str, pda_id: str) -> list[Dict[str, object]]:
    if not ensure_optional_table_exists(v2_db_path, "pda_members"):
        return []
    with open_db(v2_db_path) as conn:
        rows = conn.execute(
            """
            select member_type, member_ref, role, note
            from pda_members
            where pda_id = ?
            order by member_type, member_ref
            """,
            [pda_id],
        ).fetchall()
    return [
        {
            "memberType": row[0],
            "memberRef": row[1],
            "role": row[2] or "",
            "note": row[3] or "",
        }
        for row in rows
    ]


def get_period_start(date_str: str, timeframe: str) -> datetime:
    value = datetime.strptime(date_str, "%Y-%m-%d")
    if timeframe == "daily":
        return datetime(value.year, value.month, value.day)
    if timeframe == "weekly":
        start = value - timedelta(days=value.weekday())
        return datetime(start.year, start.month, start.day)
    if timeframe == "monthly":
        return datetime(value.year, value.month, 1)
    raise ValueError("unsupported htf timeframe")


def build_htf_bar_sql(table: str, timeframe: str) -> str:
    bucket_unit = VALID_HTF_TIMEFRAMES[timeframe]
    return f"""
with raw as (
  select
    ts,
    open,
    high,
    low,
    close,
    ts + interval '{SESSION_DAY_SHIFT_HOURS} hour' as session_ts,
    date_trunc('{bucket_unit}', ts + interval '{SESSION_DAY_SHIFT_HOURS} hour') as period_start
  from {table}
  where instrument = ?
),
agg as (
  select
    period_start,
    min(ts) as first_ts,
    max(ts) as last_ts,
    max(high) as high,
    min(low) as low
  from raw
  group by period_start
)
select
  a.period_start,
  open_row.open,
  a.high,
  a.low,
  close_row.close
from agg a
join raw open_row
  on open_row.period_start = a.period_start and open_row.ts = a.first_ts
join raw close_row
  on close_row.period_start = a.period_start and close_row.ts = a.last_ts
""".strip()


def query_htf_bar(
    db_path: str,
    table: str,
    instrument: str,
    date_str: str,
    timeframe: str,
) -> Dict[str, object]:
    period_start = get_period_start(date_str, timeframe)
    sql = build_htf_bar_sql(table, timeframe) + "\nwhere a.period_start = ?"
    with open_db(db_path) as conn:
        row = conn.execute(sql, [instrument, period_start]).fetchone()
    if not row:
        raise LookupError("no data found for requested htf bar")
    return {
        "instrument": instrument,
        "timeframe": timeframe,
        "inputDate": date_str,
        "barDate": row[0].strftime("%Y-%m-%d"),
        "open": float(row[1]),
        "high": float(row[2]),
        "low": float(row[3]),
        "close": float(row[4]),
    }


def query_htf_bars(
    db_path: str,
    table: str,
    instrument: str,
    date_from: str,
    date_to: str,
    timeframe: str,
) -> Dict[str, object]:
    start_date = get_period_start(date_from, timeframe)
    end_date = get_period_start(date_to, timeframe)
    if end_date < start_date:
        start_date, end_date = end_date, start_date
    sql = build_htf_bar_sql(table, timeframe) + "\nwhere a.period_start >= ? and a.period_start <= ? order by a.period_start"
    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, start_date, end_date]).fetchall()
    if not rows:
        raise LookupError("no data found for requested htf range")
    bars = [
        {
            "barDate": row[0].strftime("%Y-%m-%d"),
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
        }
        for row in rows
    ]
    return {
        "instrument": instrument,
        "timeframe": timeframe,
        "dateFrom": start_date.strftime("%Y-%m-%d"),
        "dateTo": end_date.strftime("%Y-%m-%d"),
        "bars": bars,
    }


def build_v2_bucket_bar_sql(table: str, timeframe: str) -> str:
    if timeframe not in V2_BAR_BUCKET_MINUTES:
        raise ValueError("unsupported v2 timeframe")
    bucket_minutes = V2_BAR_BUCKET_MINUTES[timeframe]
    if timeframe == "D":
        bucket_expr = f"date_trunc('day', ts + interval '{SESSION_DAY_SHIFT_HOURS} hour') - interval '{SESSION_DAY_SHIFT_HOURS} hour'"
    else:
        bucket_expr = f"""
        session_start + floor(date_diff('minute', session_start, ts) / {bucket_minutes}) * interval '{bucket_minutes} minute'
        """.strip()
    return f"""
with base as (
  select
    ts,
    open,
    high,
    low,
    close,
    date_trunc('day', ts + interval '{SESSION_DAY_SHIFT_HOURS} hour') - interval '{SESSION_DAY_SHIFT_HOURS} hour' as session_start
  from {table}
  where instrument = ?
    and cast(ts + interval '{SESSION_DAY_SHIFT_HOURS} hour' as date) >= cast(? as date)
    and cast(ts + interval '{SESSION_DAY_SHIFT_HOURS} hour' as date) <= cast(? as date)
),
bucketed as (
  select
    *,
    {bucket_expr} as bucket_start
  from base
),
agg as (
  select
    bucket_start,
    min(ts) as first_ts,
    max(ts) as last_ts,
    max(high) as high,
    min(low) as low
  from bucketed
  group by bucket_start
)
select
  cast(a.bucket_start + interval '{SESSION_DAY_SHIFT_HOURS} hour' as date) as bar_date,
  a.bucket_start,
  a.first_ts,
  a.last_ts,
  o.open,
  a.high,
  a.low,
  c.close
from agg a
join bucketed o on o.bucket_start = a.bucket_start and o.ts = a.first_ts
join bucketed c on c.bucket_start = a.bucket_start and c.ts = a.last_ts
order by a.bucket_start
""".strip()


def query_v2_timeframe_bars(
    db_path: str,
    table: str,
    instrument: str,
    date_from: str,
    date_to: str,
    timeframe: str,
) -> list[Dict[str, object]]:
    with open_db(db_path) as conn:
        rows = conn.execute(
            build_v2_bucket_bar_sql(table, timeframe),
            [instrument, date_from, date_to],
        ).fetchall()
    return [
        {
            "barDate": row[0].strftime("%Y-%m-%d"),
            "bucketStart": row[1].strftime("%Y-%m-%d %H:%M:%S"),
            "firstTs": row[2].strftime("%Y-%m-%d %H:%M:%S"),
            "lastTs": row[3].strftime("%Y-%m-%d %H:%M:%S"),
            "open": float(row[4]),
            "high": float(row[5]),
            "low": float(row[6]),
            "close": float(row[7]),
        }
        for row in rows
    ]


def query_v2_pda_records(
    v2_db_path: str,
    instrument: str,
    timeframe: str,
    pda_types: list[str],
    review_role: str,
    date_from: str,
    date_to: str,
    limit: int,
) -> Dict[str, object]:
    ensure_v2_registry_columns(v2_db_path)
    clauses = [
        "(? = '' or instrument = ?)",
        "(? = '' or timeframe = ?)",
        "(? = '' or coalesce(trade_date, created_date) >= cast(? as date))",
        "(? = '' or coalesce(trade_date, created_date) <= cast(? as date))",
    ]
    params: list[object] = [
        instrument,
        instrument,
        timeframe,
        timeframe,
        date_from,
        date_from,
        date_to,
        date_to,
    ]
    if pda_types:
        placeholders = ",".join("?" for _ in pda_types)
        clauses.append(f"pda_type in ({placeholders})")
        params.extend(pda_types)
    if review_role:
        clauses.append("(coalesce(review_role, '') = ? or (? = 'unclassified' and coalesce(review_role, '') = ''))")
        params.extend([review_role, review_role])
    sql = f"""
	select
	  pda_id,
	  instrument,
	  timeframe,
	  pda_type,
	  direction,
	  trade_date,
	  anchor_time,
	  occurrence_time,
	  confirm_time,
	  status,
	  manual_added,
	  manual_edited,
	  review_state,
	  review_role,
	  review_tag,
	  created_date,
	  created_ts,
	  verified_ts,
	  anchor_ts,
	  origin_start_date,
	  origin_end_date,
	  price,
	  price_high,
	  price_low,
	  price_ce,
	  prev_close_time,
	  prev_close_price,
	  next_open_time,
	  next_open_price,
	  registry_status,
	  source,
	  note
	from pda_registry
	where {" and ".join(clauses)}
	order by coalesce(anchor_time, created_ts, cast(coalesce(trade_date, created_date) as timestamp)) asc, pda_id asc
	limit ?
	""".strip()
    params.append(limit)
    with open_db(v2_db_path) as conn:
        rows = conn.execute(sql, params).fetchall()
    records = []
    for row in rows:
        anchor_time = row[6].strftime("%Y-%m-%d %H:%M:%S") if row[6] else ""
        occurrence_time = row[7].strftime("%Y-%m-%d %H:%M:%S") if row[7] else ""
        confirm_time = row[8].strftime("%Y-%m-%d %H:%M:%S") if row[8] else ""
        anchor_session_date = ""
        confirm_session_date = ""
        if row[6]:
            anchor_session_date = (row[6] + timedelta(hours=SESSION_DAY_SHIFT_HOURS)).strftime("%Y-%m-%d")
        if row[8]:
            confirm_session_date = (row[8] + timedelta(hours=SESSION_DAY_SHIFT_HOURS)).strftime("%Y-%m-%d")
        resolved_review_role = normalize_review_role(row[13], row[12], row[2], row[3])
        records.append(
            {
                "pdaId": row[0],
                "instrument": row[1],
                "timeframe": row[2],
                "pdaType": row[3],
                "direction": row[4],
                "tradeDate": row[5].strftime("%Y-%m-%d") if row[5] else "",
                "anchorTime": anchor_time,
                "occurrenceTime": occurrence_time,
                "confirmTime": confirm_time,
                "anchorSessionDate": anchor_session_date,
                "confirmSessionDate": confirm_session_date,
                "status": row[9],
                "manualAdded": bool(row[10]) if row[10] is not None else False,
                "manualEdited": bool(row[11]) if row[11] is not None else False,
                "reviewState": legacy_review_state_from_role(resolved_review_role),
                "reviewRole": resolved_review_role,
                "reviewTag": (row[14] or "").lower(),
                "createdDate": row[15].strftime("%Y-%m-%d") if row[15] else "",
                "createdTs": row[16].strftime("%Y-%m-%d %H:%M:%S") if row[16] else "",
                "verifiedTs": row[17].strftime("%Y-%m-%d %H:%M:%S") if row[17] else "",
                "anchorTs": row[18].strftime("%Y-%m-%d %H:%M:%S") if row[18] else "",
                "originStartDate": row[19].strftime("%Y-%m-%d") if row[19] else "",
                "originEndDate": row[20].strftime("%Y-%m-%d") if row[20] else "",
                "price": float(row[21]) if row[21] is not None else None,
                "priceHigh": float(row[22]) if row[22] is not None else None,
                "priceLow": float(row[23]) if row[23] is not None else None,
                "priceCe": float(row[24]) if row[24] is not None else None,
                "prevCloseTime": row[25].strftime("%Y-%m-%d %H:%M:%S") if row[25] else "",
                "prevClosePrice": float(row[26]) if row[26] is not None else None,
                "nextOpenTime": row[27].strftime("%Y-%m-%d %H:%M:%S") if row[27] else "",
                "nextOpenPrice": float(row[28]) if row[28] is not None else None,
                "registryStatus": row[29],
                "source": row[30],
                "note": row[31] or "",
            }
        )
    return {"records": records}


def query_v2_pda_record(v2_db_path: str, pda_id: str) -> Dict[str, object]:
    ensure_v2_registry_columns(v2_db_path)
    sql = """
    select
      pda_id,
      instrument,
      timeframe,
      pda_type,
      direction,
      trade_date,
      anchor_time,
      occurrence_time,
      confirm_time,
      status,
      manual_added,
      manual_edited,
      review_state,
      review_role,
      review_tag,
      created_date,
      created_ts,
      verified_ts,
      anchor_ts,
      origin_start_date,
      origin_end_date,
      price,
      price_high,
      price_low,
      price_ce,
      prev_close_time,
      prev_close_price,
      next_open_time,
      next_open_price,
      registry_status,
      source,
      note
    from pda_registry
    where pda_id = ?
    limit 1
    """.strip()
    with open_db(v2_db_path) as conn:
        row = conn.execute(sql, [pda_id]).fetchone()
    if row:
        anchor_time = row[6].strftime("%Y-%m-%d %H:%M:%S") if row[6] else ""
        occurrence_time = row[7].strftime("%Y-%m-%d %H:%M:%S") if row[7] else ""
        confirm_time = row[8].strftime("%Y-%m-%d %H:%M:%S") if row[8] else ""
        anchor_session_date = ""
        confirm_session_date = ""
        if row[6]:
            anchor_session_date = (row[6] + timedelta(hours=SESSION_DAY_SHIFT_HOURS)).strftime("%Y-%m-%d")
        if row[8]:
            confirm_session_date = (row[8] + timedelta(hours=SESSION_DAY_SHIFT_HOURS)).strftime("%Y-%m-%d")
        resolved_review_role = normalize_review_role(row[13], row[12], row[2], row[3])
        return {
            "pdaId": row[0],
            "instrument": row[1],
            "timeframe": row[2],
            "pdaType": row[3],
            "direction": row[4],
            "tradeDate": row[5].strftime("%Y-%m-%d") if row[5] else "",
            "anchorTime": anchor_time,
            "occurrenceTime": occurrence_time,
            "confirmTime": confirm_time,
            "anchorSessionDate": anchor_session_date,
            "confirmSessionDate": confirm_session_date,
            "status": row[9],
            "manualAdded": bool(row[10]) if row[10] is not None else False,
            "manualEdited": bool(row[11]) if row[11] is not None else False,
            "reviewState": legacy_review_state_from_role(resolved_review_role),
            "reviewRole": resolved_review_role,
            "reviewTag": (row[14] or "").lower(),
            "createdDate": row[15].strftime("%Y-%m-%d") if row[15] else "",
            "createdTs": row[16].strftime("%Y-%m-%d %H:%M:%S") if row[16] else "",
            "verifiedTs": row[17].strftime("%Y-%m-%d %H:%M:%S") if row[17] else "",
            "anchorTs": row[18].strftime("%Y-%m-%d %H:%M:%S") if row[18] else "",
            "originStartDate": row[19].strftime("%Y-%m-%d") if row[19] else "",
            "originEndDate": row[20].strftime("%Y-%m-%d") if row[20] else "",
            "price": float(row[21]) if row[21] is not None else None,
            "priceHigh": float(row[22]) if row[22] is not None else None,
            "priceLow": float(row[23]) if row[23] is not None else None,
            "priceCe": float(row[24]) if row[24] is not None else None,
            "prevCloseTime": row[25].strftime("%Y-%m-%d %H:%M:%S") if row[25] else "",
            "prevClosePrice": float(row[26]) if row[26] is not None else None,
            "nextOpenTime": row[27].strftime("%Y-%m-%d %H:%M:%S") if row[27] else "",
            "nextOpenPrice": float(row[28]) if row[28] is not None else None,
            "registryStatus": row[29],
            "source": row[30],
            "note": row[31] or "",
            "members": query_v2_pda_members(v2_db_path, pda_id),
        }
    raise LookupError("pda record not found")


def query_v2_pd_extremes(
    v2_db_path: str,
    instrument: str,
    date_from: str,
    date_to: str,
    session_name: str,
) -> Dict[str, object]:
    if not ensure_optional_table_exists(v2_db_path, "pd_extremes"):
        raise LookupError("v2 pd_extremes not found")
    clauses = [
        "(? = '' or instrument = ?)",
        "(? = '' or trade_date >= cast(? as date))",
        "(? = '' or trade_date <= cast(? as date))",
        "(? = '' or session_name = ?)",
    ]
    params: list[object] = [
        instrument,
        instrument,
        date_from,
        date_from,
        date_to,
        date_to,
        session_name,
        session_name,
    ]
    sql = f"""
    select
      instrument,
      trade_date,
      session_name,
      window_start,
      window_end,
      high_price,
      high_time,
      low_price,
      low_time,
      source,
      note
    from pd_extremes
    where {" and ".join(clauses)}
    order by trade_date asc,
      case session_name
        when 'asia' then 1
        when 'ldn' then 2
        when 'transition' then 3
        when 'premarket' then 4
        when 'ny_am' then 5
        when 'ny_lunch' then 6
        when 'ny_pm' then 7
        else 99
      end asc
    """.strip()
    with open_db(v2_db_path) as conn:
        rows = conn.execute(sql, params).fetchall()
    items = []
    for row in rows:
        items.append(
            {
                "instrument": row[0],
                "tradeDate": row[1].strftime("%Y-%m-%d") if row[1] else "",
                "sessionName": row[2],
                "windowStart": row[3].strftime("%Y-%m-%d %H:%M:%S") if row[3] else "",
                "windowEnd": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                "highPrice": float(row[5]) if row[5] is not None else None,
                "highTime": row[6].strftime("%Y-%m-%d %H:%M:%S") if row[6] else "",
                "lowPrice": float(row[7]) if row[7] is not None else None,
                "lowTime": row[8].strftime("%Y-%m-%d %H:%M:%S") if row[8] else "",
                "source": row[9] or "",
                "note": row[10] or "",
            }
        )
    return {"items": items}


def query_v2_reference_groups(
    v2_db_path: str,
    instrument: str,
    date_from: str,
    date_to: str,
    side: str,
    limit: int,
) -> Dict[str, object]:
    if not ensure_optional_table_exists(v2_db_path, "reference_groups"):
        raise LookupError("v2 reference_groups not found")
    clauses = [
        "(? = '' or instrument = ?)",
        "(? = '' or trade_date >= cast(? as date))",
        "(? = '' or trade_date <= cast(? as date))",
        "(? = '' or side = ?)",
    ]
    params: list[object] = [
        instrument,
        instrument,
        date_from,
        date_from,
        date_to,
        date_to,
        side,
        side,
    ]
    sql = f"""
    select
      group_id,
      instrument,
      trade_date,
      event_time,
      price,
      side,
      member_count,
      pda_count,
      pd_extreme_count,
      timeframes,
      roles,
      note
    from reference_groups
    where {" and ".join(clauses)}
    order by event_time asc, side asc, price asc
    limit ?
    """.strip()
    with open_db(v2_db_path) as conn:
        rows = conn.execute(sql, [*params, limit]).fetchall()
        group_ids = [row[0] for row in rows]
        members_by_group: dict[str, list[dict[str, object]]] = {gid: [] for gid in group_ids}
        if group_ids:
            placeholders = ",".join("?" for _ in group_ids)
            member_rows = conn.execute(
                f"""
                select
                  group_id,
                  member_type,
                  member_ref,
                  event_time,
                  price,
                  side,
                  timeframe,
                  pda_type,
                  review_role,
                  session_name,
                  label
                from reference_group_members
                where group_id in ({placeholders})
                order by group_id, member_type, timeframe, pda_type, session_name, member_ref
                """,
                group_ids,
            ).fetchall()
            for item in member_rows:
                members_by_group.setdefault(item[0], []).append(
                    {
                        "memberType": item[1],
                        "memberRef": item[2],
                        "eventTime": item[3].strftime("%Y-%m-%d %H:%M:%S") if item[3] else "",
                        "price": float(item[4]) if item[4] is not None else None,
                        "side": item[5],
                        "timeframe": item[6] or "",
                        "pdaType": item[7] or "",
                        "reviewRole": item[8] or "",
                        "sessionName": item[9] or "",
                        "label": item[10] or "",
                    }
                )
    groups = []
    for row in rows:
        groups.append(
            {
                "groupId": row[0],
                "instrument": row[1],
                "tradeDate": row[2].strftime("%Y-%m-%d") if row[2] else "",
                "eventTime": row[3].strftime("%Y-%m-%d %H:%M:%S") if row[3] else "",
                "price": float(row[4]) if row[4] is not None else None,
                "side": row[5],
                "memberCount": int(row[6] or 0),
                "pdaCount": int(row[7] or 0),
                "pdExtremeCount": int(row[8] or 0),
                "timeframes": row[9] or "",
                "roles": row[10] or "",
                "note": row[11] or "",
                "members": members_by_group.get(row[0], []),
            }
        )
    return {"groups": groups}


def query_v2_reference_groups_for_members(
    v2_db_path: str,
    member_refs: list[str],
) -> Dict[str, object]:
    if not ensure_optional_table_exists(v2_db_path, "reference_groups"):
        raise LookupError("v2 reference_groups not found")
    clean_refs = []
    for item in member_refs:
        text = str(item or "").strip()
        if text and re.fullmatch(r"[A-Za-z0-9_:\-\.]+", text):
            clean_refs.append(text)
    clean_refs = list(dict.fromkeys(clean_refs))[:500]
    if not clean_refs:
        return {"groupsByMemberRef": {}}

    placeholders = ",".join("?" for _ in clean_refs)
    with open_db(v2_db_path) as conn:
        rows = conn.execute(
            f"""
            select
              m.member_ref,
              g.group_id,
              g.instrument,
              g.trade_date,
              g.event_time,
              g.price,
              g.side,
              g.member_count,
              g.pda_count,
              g.pd_extreme_count,
              g.timeframes,
              g.roles
            from reference_group_members m
            join reference_groups g on g.group_id = m.group_id
            where m.member_ref in ({placeholders})
            order by m.member_ref, g.member_count desc, g.event_time
            """,
            clean_refs,
        ).fetchall()
    groups_by_member_ref: dict[str, list[dict[str, object]]] = {}
    for row in rows:
        groups_by_member_ref.setdefault(row[0], []).append(
            {
                "groupId": row[1],
                "instrument": row[2],
                "tradeDate": row[3].strftime("%Y-%m-%d") if row[3] else "",
                "eventTime": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                "price": float(row[5]) if row[5] is not None else None,
                "side": row[6],
                "memberCount": int(row[7] or 0),
                "pdaCount": int(row[8] or 0),
                "pdExtremeCount": int(row[9] or 0),
                "timeframes": row[10] or "",
                "roles": row[11] or "",
            }
        )
    return {"groupsByMemberRef": groups_by_member_ref}


def update_v2_pda_review(
    v2_db_path: str,
    pda_id: str,
    review_role: str | None = None,
    note: str | None = None,
) -> Dict[str, object]:
    ensure_v2_registry_columns(v2_db_path)
    with duckdb.connect(v2_db_path) as conn:
        row = conn.execute(
            "select review_role, review_state, note, timeframe, pda_type from pda_registry where pda_id = ?",
            [pda_id],
        ).fetchone()
        if not row:
            raise LookupError("pda record not found")
        next_review_role = review_role if review_role is not None else normalize_review_role(row[0], row[1], row[3], row[4])
        if review_role is not None:
            allowed_roles = allowed_review_roles_for_record(row[3], row[4])
            if not allowed_roles:
                raise ValueError("this pda type does not support manual review role changes")
            if next_review_role not in allowed_roles:
                raise ValueError(f"reviewRole {next_review_role} is not allowed for {row[3]} {row[4]}")
        next_note = note if note is not None else (row[2] or "")
        conn.execute(
            """
            update pda_registry
            set
              review_state = ?,
              review_role = ?,
              note = ?,
              manual_edited = true,
              updated_at = current_timestamp
            where pda_id = ?
            """.strip(),
            [legacy_review_state_from_role(next_review_role), next_review_role, next_note, pda_id],
        )
    return query_v2_pda_record(v2_db_path, pda_id)


def delete_v2_pda_record(v2_db_path: str, pda_id: str) -> Dict[str, object]:
    ensure_v2_registry_columns(v2_db_path)
    ensure_v2_pda_members_table(v2_db_path)
    with duckdb.connect(v2_db_path) as conn:
        row = conn.execute(
            "select pda_id, instrument, timeframe, pda_type, trade_date, anchor_time from pda_registry where pda_id = ?",
            [pda_id],
        ).fetchone()
        if not row:
            raise LookupError("pda record not found")
        conn.execute("delete from pda_members where pda_id = ?", [pda_id])
        conn.execute("delete from pda_registry where pda_id = ?", [pda_id])
    return {
        "pdaId": row[0],
        "instrument": row[1],
        "timeframe": row[2],
        "pdaType": row[3],
        "tradeDate": row[4].strftime("%Y-%m-%d") if row[4] else "",
        "anchorTime": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else "",
        "deleted": True,
    }


def next_manual_pda_id(
    conn: duckdb.DuckDBPyConnection,
    trade_date: str,
    timeframe: str,
    pda_type: str,
) -> str:
    prefix = f"pda_{trade_date.replace('-', '')}_{timeframe}_{pda_type}_manual_"
    rows = conn.execute(
        """
        select pda_id
        from pda_registry
        where pda_id like ?
        order by pda_id desc
        limit 1
        """.strip(),
        [prefix + "%"],
    ).fetchall()
    next_no = 1
    if rows:
        match = re.search(r"_manual_(\d+)$", rows[0][0])
        if match:
            next_no = int(match.group(1)) + 1
    return f"{prefix}{next_no:03d}"


def create_v2_manual_pda(
    v2_db_path: str,
    instrument: str,
    timeframe: str,
    pda_type: str,
    direction: str,
    anchor_time: datetime,
    confirm_time: datetime | None,
    price: float | None,
    price_high: float | None,
    price_low: float | None,
    note: str,
    member_refs: list[str] | None = None,
) -> Dict[str, object]:
    ensure_v2_registry_columns(v2_db_path)
    ensure_v2_pda_members_table(v2_db_path)
    trade_date = session_date_from_timestamp(anchor_time)
    normalized_direction = direction or None
    if pda_type in {"bsl", "ssl"}:
        point_price = price
        if point_price is None:
            point_price = price_high if price_high is not None else price_low
        if point_price is None:
            raise ValueError("bsl/ssl manual add requires price")
        price = point_price
        price_high = point_price
        price_low = point_price
        price_ce = point_price
        normalized_direction = None
    elif pda_type in {"eqh", "eql"}:
        if price_high is None and price_low is None:
            point_price = price
            if point_price is None:
                raise ValueError("eqh/eql manual add requires price or priceHigh/priceLow")
            price_high = point_price
            price_low = point_price
        elif price_high is None or price_low is None:
            raise ValueError("eqh/eql manual add requires both priceHigh and priceLow when using a range")
        if price_low > price_high:
            raise ValueError("priceLow must be <= priceHigh")
        price = price if price is not None else (price_high + price_low) / 2.0
        price_ce = (price_high + price_low) / 2.0
        normalized_direction = None
    else:
        if price_high is None or price_low is None:
            raise ValueError("fvg manual add requires priceHigh and priceLow")
        if price_low > price_high:
            raise ValueError("priceLow must be <= priceHigh")
        if not normalized_direction:
            raise ValueError("fvg manual add requires direction")
        price = None
        price_ce = (price_high + price_low) / 2.0

    with duckdb.connect(v2_db_path) as conn:
        pda_id = next_manual_pda_id(conn, trade_date, timeframe, pda_type)
        conn.execute(
            """
            insert into pda_registry (
              pda_id, instrument, timeframe, pda_type, direction,
              trade_date, anchor_time, confirm_time, status, manual_added, manual_edited, review_state, review_role,
              created_date, created_ts, verified_ts, anchor_ts,
              origin_start_date, origin_end_date,
              price, price_high, price_low, price_ce,
              prev_close_time, prev_close_price, next_open_time, next_open_price,
              source, note, registry_status
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """.strip(),
            [
                pda_id,
                instrument,
                timeframe,
                pda_type,
                normalized_direction,
                trade_date,
                anchor_time,
                confirm_time,
                "active",
                True,
                False,
                "pending",
                "unclassified",
                trade_date,
                anchor_time,
                confirm_time,
                anchor_time,
                None,
                None,
                price,
                price_high,
                price_low,
                price_ce,
                None,
                None,
                None,
                None,
                "manual_eqh_eql" if pda_type in {"eqh", "eql"} else "manual_add",
                note,
                "active",
            ],
        )
        rows = []
        for ref in member_refs or []:
            member_type = "pd_extreme" if ref.startswith("pdext:") else ("pda" if ref.startswith("pda_") else "manual_ref")
            rows.append((pda_id, member_type, ref, "member", ""))
        if rows:
            conn.executemany(
                """
                insert or replace into pda_members (pda_id, member_type, member_ref, role, note)
                values (?, ?, ?, ?, ?)
                """.strip(),
                rows,
            )
    return query_v2_pda_record(v2_db_path, pda_id)


def restore_point_metadata_path(restore_root: Path, restore_point_id: str) -> Path:
    return restore_root / f"{restore_point_id}.json"


def restore_point_db_path(restore_root: Path, restore_point_id: str) -> Path:
    return restore_root / f"{restore_point_id}.duckdb"


def list_v2_restore_points(restore_root: Path) -> Dict[str, object]:
    restore_root.mkdir(parents=True, exist_ok=True)
    items = []
    for meta_path in sorted(restore_root.glob("*.json"), reverse=True):
        try:
            payload = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        db_path = restore_point_db_path(restore_root, payload.get("id", ""))
        if not db_path.exists():
            continue
        items.append(
            {
                "id": payload.get("id", ""),
                "createdAt": payload.get("createdAt", ""),
                "note": payload.get("note", ""),
                "label": payload.get("label", payload.get("id", "")),
                "sizeBytes": db_path.stat().st_size,
                "filename": db_path.name,
            }
        )
    return {"restorePoints": items}


def create_v2_restore_point(v2_db_path: str, restore_root: Path, note: str) -> Dict[str, object]:
    src_path = Path(v2_db_path).resolve()
    if not src_path.exists():
        raise LookupError("v2 database not found")
    restore_root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = uuid.uuid4().hex[:6]
    restore_point_id = f"rp_{stamp}_{suffix}"
    db_dest = restore_point_db_path(restore_root, restore_point_id)
    meta_dest = restore_point_metadata_path(restore_root, restore_point_id)
    shutil.copy2(src_path, db_dest)
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    payload = {
        "id": restore_point_id,
        "createdAt": created_at,
        "note": note,
        "label": f"{created_at} | {note}" if note else created_at,
    }
    meta_dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "id": restore_point_id,
        "createdAt": created_at,
        "note": note,
        "label": payload["label"],
        "sizeBytes": db_dest.stat().st_size,
        "filename": db_dest.name,
    }


def restore_v2_restore_point(v2_db_path: str, restore_root: Path, restore_point_id: str) -> Dict[str, object]:
    src_db_path = restore_point_db_path(restore_root, restore_point_id)
    meta_path = restore_point_metadata_path(restore_root, restore_point_id)
    if not src_db_path.exists() or not meta_path.exists():
        raise LookupError("restore point not found")
    note = ""
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        note = str(meta.get("note", "") or "")
    except Exception:
        meta = {"id": restore_point_id}
    current_path = Path(v2_db_path).resolve()
    if not current_path.exists():
        raise LookupError("v2 database not found")

    pre_restore = create_v2_restore_point(v2_db_path, restore_root, f"auto pre-restore from {restore_point_id}")
    temp_path = current_path.with_suffix(current_path.suffix + ".restore_tmp")
    shutil.copy2(src_db_path, temp_path)
    os.replace(temp_path, current_path)
    restored_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "restoredId": restore_point_id,
        "restoredAt": restored_at,
        "note": note,
        "preRestorePoint": pre_restore,
    }


def query_v2_pda_neighbors(
    source_db_path: str,
    source_table: str,
    v2_db_path: str,
    pda_id: str,
    before: int,
    after: int,
) -> Dict[str, object]:
    record = query_v2_pda_record(v2_db_path, pda_id)
    timeframe = record["timeframe"]
    focus_date = record.get("tradeDate") or record.get("createdDate")
    if not focus_date:
        raise LookupError("pda record missing createdDate")
    focus_dt = datetime.strptime(focus_date, "%Y-%m-%d")
    date_from = (focus_dt - timedelta(days=max(before + 3, 10))).strftime("%Y-%m-%d")
    date_to = (focus_dt + timedelta(days=max(after + 3, 10))).strftime("%Y-%m-%d")
    bars = query_v2_timeframe_bars(source_db_path, source_table, record["instrument"], date_from, date_to, timeframe)
    focus_bucket = record.get("anchorTime") or record.get("anchorTs") or record.get("createdTs") or ""
    if focus_bucket:
        focus_bucket = focus_bucket[:19]
    if focus_bucket:
        focus_index = next((idx for idx, bar in enumerate(bars) if bar["bucketStart"] == focus_bucket), None)
    else:
        focus_index = next((idx for idx, bar in enumerate(bars) if bar["barDate"] == focus_date), None)
    if focus_index is None:
        raise LookupError("unable to find matching focus bar for pda record")
    start = max(0, focus_index - before)
    end = min(len(bars), focus_index + after + 1)
    neighbor_bars = []
    for idx in range(start, end):
        bar = dict(bars[idx])
        bar["offset"] = idx - focus_index
        bar["isFocus"] = idx == focus_index
        neighbor_bars.append(bar)
    return {
        "record": record,
        "timeframe": timeframe,
        "focusBucket": focus_bucket,
        "focusIndex": focus_index,
        "before": before,
        "after": after,
        "bars": neighbor_bars,
    }


def query_v2_pda_match(
    v2_db_path: str,
    instrument: str,
    timeframe: str,
    pda_type: str,
    event_time: datetime,
    price: float,
    time_tolerance_bars: int,
    price_tolerance_ticks: int,
    limit: int,
) -> Dict[str, object]:
    ensure_v2_registry_columns(v2_db_path)
    if not ensure_optional_table_exists(v2_db_path, "pda_registry"):
        raise LookupError("v2 pda_registry not found")

    tf = (timeframe or "").strip().upper()
    pda = (pda_type or "").strip().lower()
    bucket_minutes = V2_BAR_BUCKET_MINUTES.get(tf)
    if bucket_minutes is None:
        raise ValueError("unsupported timeframe")

    time_tolerance_bars = max(int(time_tolerance_bars), 0)
    price_tolerance_ticks = max(int(price_tolerance_ticks), 0)
    time_tolerance_minutes = bucket_minutes * time_tolerance_bars
    price_tolerance = price_tolerance_ticks * 0.25
    price_tolerance = max(price_tolerance, 1e-9)

    clauses = [
        "(? = '' or instrument = ?)",
        "(? = '' or timeframe = ?)",
        "(? = '' or pda_type = ?)",
        "coalesce(anchor_time, occurrence_time, created_ts, cast(coalesce(trade_date, created_date) as timestamp)) is not null",
    ]
    params: list[object] = [
        instrument,
        instrument,
        tf,
        tf,
        pda,
        pda,
        event_time,
        price,
    ]
    sql = f"""
    with base as (
      select
        pda_id,
        instrument,
        timeframe,
        pda_type,
        direction,
        trade_date,
        anchor_time,
        occurrence_time,
        confirm_time,
        coalesce(price, price_ce, price_high, price_low) as compare_price,
        coalesce(anchor_time, occurrence_time, created_ts, cast(coalesce(trade_date, created_date) as timestamp)) as candidate_time,
        abs(date_diff('minute', coalesce(anchor_time, occurrence_time, created_ts, cast(coalesce(trade_date, created_date) as timestamp)), cast(? as timestamp))) as time_delta_minutes,
        abs(coalesce(price, price_ce, price_high, price_low) - ?) as price_delta,
        status,
        review_role,
        source,
        note
      from pda_registry
      where {" and ".join(clauses)}
    )
    select
      pda_id,
      instrument,
      timeframe,
      pda_type,
      direction,
      trade_date,
      anchor_time,
      occurrence_time,
      confirm_time,
      compare_price,
      candidate_time,
      time_delta_minutes,
      price_delta,
      status,
      review_role,
      source,
      note
    from base
    where time_delta_minutes <= ?
      and price_delta <= ?
    order by time_delta_minutes asc, price_delta asc, candidate_time asc, pda_id asc
    limit ?
    """.strip()
    params.extend([time_tolerance_minutes, price_tolerance, limit])
    with open_db(v2_db_path) as conn:
        rows = conn.execute(sql, params).fetchall()

    candidates = []
    for row in rows:
        candidate_time = row[10]
        time_delta = int(row[11] or 0)
        price_delta = float(row[12] or 0.0)
        time_score = 0.0 if time_tolerance_minutes <= 0 else max(0.0, 1.0 - (time_delta / max(time_tolerance_minutes, 1)))
        price_score = max(0.0, 1.0 - (price_delta / price_tolerance))
        match_score = round((time_score * 0.6) + (price_score * 0.4), 4)
        if time_delta == 0 and price_delta == 0:
            match_kind = "exact"
        elif time_delta <= max(time_tolerance_minutes, 1) and price_delta <= price_tolerance:
            match_kind = "near"
        else:
            match_kind = "weak"
        candidates.append(
            {
                "pdaId": row[0],
                "instrument": row[1],
                "timeframe": row[2],
                "pdaType": row[3],
                "direction": row[4],
                "tradeDate": row[5].strftime("%Y-%m-%d") if row[5] else "",
                "anchorTime": row[6].strftime("%Y-%m-%d %H:%M:%S") if row[6] else "",
                "occurrenceTime": row[7].strftime("%Y-%m-%d %H:%M:%S") if row[7] else "",
                "confirmTime": row[8].strftime("%Y-%m-%d %H:%M:%S") if row[8] else "",
                "comparePrice": float(row[9]) if row[9] is not None else None,
                "candidateTime": candidate_time.strftime("%Y-%m-%d %H:%M:%S") if candidate_time else "",
                "timeDeltaMinutes": time_delta,
                "priceDelta": round(price_delta, 6),
                "matchScore": match_score,
                "matchKind": match_kind,
                "status": row[13],
                "reviewRole": row[14],
                "source": row[15],
                "note": row[16] or "",
            }
        )
    return {
        "instrument": instrument,
        "timeframe": tf,
        "pdaType": pda,
        "eventTime": event_time.strftime("%Y-%m-%d %H:%M:%S"),
        "price": price,
        "timeToleranceBars": time_tolerance_bars,
        "priceToleranceTicks": price_tolerance_ticks,
        "priceTolerance": price_tolerance,
        "timeToleranceMinutes": time_tolerance_minutes,
        "candidates": candidates,
    }


def query_price(
    db_path: str,
    table: str,
    instrument: str,
    date_str: str,
    time_str: str,
    tf: int,
    field: str,
    fallback: str = "none",
    max_lookback: int = 0,
) -> Dict[str, object]:
    start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    actual_start_dt = start_dt
    end_dt = actual_start_dt + timedelta(minutes=tf)

    sql = f"""
select ts, open, high, low, close
from {table}
where instrument = ?
  and ts >= ?
  and ts < ?
order by ts
""".strip()

    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, actual_start_dt, end_dt]).fetchall()

        if not rows and fallback == "prev" and max_lookback > 0:
            fallback_sql = f"""
select ts, open, high, low, close
from {table}
where instrument = ?
  and ts < ?
  and ts >= ?
order by ts desc
limit 1
""".strip()
            fallback_row = conn.execute(
                fallback_sql,
                [instrument, start_dt, start_dt - timedelta(minutes=max_lookback)],
            ).fetchone()
            if fallback_row:
                actual_start_dt = fallback_row[0]
                end_dt = actual_start_dt + timedelta(minutes=tf)
                rows = conn.execute(sql, [instrument, actual_start_dt, end_dt]).fetchall()

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
        "actualDate": rows[0][0].strftime("%Y-%m-%d"),
        "actualTime": rows[0][0].strftime("%H:%M"),
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
    v2_db_path = "v2/data/v2_research.duckdb"
    v2_restore_root = Path("v2/data/restore_points")
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
                v2_ready = ensure_optional_table_exists(self.v2_db_path, "pda_registry")
                self._send_json(200, {"ok": True, "database": self.db_path, "details": details, "v2Ready": v2_ready, "v2Database": self.v2_db_path})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/pda_records":
            try:
                params = parse_qs(parsed.query)
                instrument = validate_instrument(params.get("instrument", [""])[0]) if params.get("instrument", [""])[0] else ""
                timeframe = params.get("timeframe", [""])[0].strip().upper()
                pda_types = [value.strip().lower() for value in params.get("type", []) if value.strip()]
                review_role = params.get("review_role", [""])[0].strip().lower()
                if review_role:
                    review_role = validate_review_role(review_role)
                date_from = validate_date(params.get("date_from", [""])[0]) if params.get("date_from", [""])[0] else ""
                date_to = validate_date(params.get("date_to", [""])[0]) if params.get("date_to", [""])[0] else ""
                limit = min(max(int(params.get("limit", ["200"])[0]), 1), 1000)
                result = query_v2_pda_records(self.v2_db_path, instrument, timeframe, pda_types, review_role, date_from, date_to, limit)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/pda_neighbors":
            try:
                params = parse_qs(parsed.query)
                pda_id = params["pda_id"][0]
                before = min(max(int(params.get("before", ["3"])[0]), 1), 20)
                after = min(max(int(params.get("after", ["3"])[0]), 1), 20)
                result = query_v2_pda_neighbors(self.db_path, self.table, self.v2_db_path, pda_id, before, after)
                self._send_json(200, {"ok": True, "result": result})
            except KeyError as exc:
                self._send_json(400, {"ok": False, "error": f"missing parameter: {exc.args[0]}"})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/pda_match":
            try:
                params = parse_qs(parsed.query)
                instrument = validate_instrument(params.get("instrument", [""])[0]) if params.get("instrument", [""])[0] else ""
                timeframe = params["timeframe"][0].strip().upper()
                pda_type = params.get("pda_type", [""])[0].strip().lower()
                event_time = parse_input_timestamp(params["event_time"][0], "event_time")
                price = float(params["price"][0])
                time_tolerance_bars = int(params.get("time_tolerance_bars", ["1"])[0])
                price_tolerance_ticks = int(params.get("price_tolerance_ticks", ["2"])[0])
                limit = min(max(int(params.get("limit", ["20"])[0]), 1), 200)
                result = query_v2_pda_match(
                    self.v2_db_path,
                    instrument,
                    timeframe,
                    pda_type,
                    event_time,
                    price,
                    time_tolerance_bars,
                    price_tolerance_ticks,
                    limit,
                )
                self._send_json(200, {"ok": True, "result": result})
            except KeyError as exc:
                self._send_json(400, {"ok": False, "error": f"missing parameter: {exc.args[0]}"})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/pd_extremes":
            try:
                params = parse_qs(parsed.query)
                instrument = validate_instrument(params.get("instrument", ["NQ"])[0]) if params.get("instrument", [""])[0] else ""
                date_from = validate_date(params.get("date_from", [""])[0]) if params.get("date_from", [""])[0] else ""
                date_to = validate_date(params.get("date_to", [""])[0]) if params.get("date_to", [""])[0] else ""
                session_name = params.get("session_name", [""])[0].strip().lower()
                if session_name:
                    session_name = validate_pd_extreme_session(session_name)
                result = query_v2_pd_extremes(self.v2_db_path, instrument, date_from, date_to, session_name)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/reference_groups":
            try:
                params = parse_qs(parsed.query)
                instrument = validate_instrument(params.get("instrument", ["NQ"])[0]) if params.get("instrument", [""])[0] else ""
                date_from = validate_date(params.get("date_from", [""])[0]) if params.get("date_from", [""])[0] else ""
                date_to = validate_date(params.get("date_to", [""])[0]) if params.get("date_to", [""])[0] else ""
                side = params.get("side", [""])[0].strip().lower()
                if side and side not in {"high", "low"}:
                    raise ValueError("side must be high/low")
                limit = min(max(int(params.get("limit", ["500"])[0]), 1), 2000)
                result = query_v2_reference_groups(self.v2_db_path, instrument, date_from, date_to, side, limit)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/reference_groups_for_members":
            try:
                params = parse_qs(parsed.query)
                member_refs = []
                for item in params.get("member_ref", []):
                    member_refs.extend([part.strip() for part in item.split(",") if part.strip()])
                result = query_v2_reference_groups_for_members(self.v2_db_path, member_refs)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/restore_points":
            try:
                result = list_v2_restore_points(self.v2_restore_root)
                self._send_json(200, {"ok": True, "result": result})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/htf_bar":
            try:
                params = parse_qs(parsed.query)
                instrument = validate_instrument(params.get("instrument", ["NQ"])[0])
                date_str = validate_date(params["date"][0])
                timeframe = validate_htf_timeframe(params.get("tf", ["daily"])[0])
                table = validate_table(self.table)
                result = query_htf_bar(self.db_path, table, instrument, date_str, timeframe)
                self._send_json(200, {"ok": True, "result": result})
            except KeyError as exc:
                self._send_json(400, {"ok": False, "error": f"missing parameter: {exc.args[0]}"})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/htf_bars":
            try:
                params = parse_qs(parsed.query)
                instrument = validate_instrument(params.get("instrument", ["NQ"])[0])
                date_from = validate_date(params["date_from"][0])
                date_to = validate_date(params["date_to"][0])
                timeframe = validate_htf_timeframe(params.get("tf", ["daily"])[0])
                table = validate_table(self.table)
                result = query_htf_bars(self.db_path, table, instrument, date_from, date_to, timeframe)
                self._send_json(200, {"ok": True, "result": result})
            except KeyError as exc:
                self._send_json(400, {"ok": False, "error": f"missing parameter: {exc.args[0]}"})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
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
            fallback = validate_fallback(params.get("fallback", ["none"])[0])
            max_lookback = validate_lookback_minutes(params.get("max_lookback", ["0"])[0])
            table = validate_table(self.table)
            result = query_price(self.db_path, table, instrument, date_str, time_str, tf, field, fallback, max_lookback)
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
        if parsed.path == "/v2/pda_review":
            try:
                content_length = int(self.headers.get("Content-Length", "0") or "0")
                if content_length <= 0:
                    raise ValueError("empty json body")
                payload = self.rfile.read(content_length)
                body = json.loads(payload.decode("utf-8"))
                pda_id = validate_pda_id(body.get("pdaId", ""))
                review_role = None
                if "reviewRole" in body:
                    review_role = validate_review_role(body.get("reviewRole", "unclassified"))
                note = None
                if "note" in body:
                    note = normalize_note(body.get("note", ""))
                result = update_v2_pda_review(self.v2_db_path, pda_id, review_role, note)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "invalid json body"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/pda_manual_add":
            try:
                content_length = int(self.headers.get("Content-Length", "0") or "0")
                if content_length <= 0:
                    raise ValueError("empty json body")
                payload = self.rfile.read(content_length)
                body = json.loads(payload.decode("utf-8"))
                instrument = validate_instrument(body.get("instrument", "NQ"))
                timeframe = validate_manual_timeframe(body.get("timeframe", ""))
                pda_type = validate_manual_pda_type(body.get("pdaType", ""))
                direction = validate_manual_direction(body.get("direction", ""))
                anchor_time = parse_input_timestamp(body.get("anchorTime", ""), "anchorTime")
                confirm_time = parse_optional_timestamp(body.get("confirmTime", ""), "confirmTime")
                price = parse_optional_number(body.get("price", ""), "price")
                price_high = parse_optional_number(body.get("priceHigh", ""), "priceHigh")
                price_low = parse_optional_number(body.get("priceLow", ""), "priceLow")
                note = normalize_note(body.get("note", ""))
                member_refs = parse_member_refs(body.get("memberRefs", ""))
                result = create_v2_manual_pda(
                    self.v2_db_path,
                    instrument,
                    timeframe,
                    pda_type,
                    direction,
                    anchor_time,
                    confirm_time,
                    price,
                    price_high,
                    price_low,
                    note,
                    member_refs,
                )
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "invalid json body"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/pda_delete":
            try:
                content_length = int(self.headers.get("Content-Length", "0") or "0")
                if content_length <= 0:
                    raise ValueError("empty json body")
                payload = self.rfile.read(content_length)
                body = json.loads(payload.decode("utf-8"))
                pda_id = validate_pda_id(body.get("pdaId", ""))
                result = delete_v2_pda_record(self.v2_db_path, pda_id)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "invalid json body"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/restore_points":
            try:
                content_length = int(self.headers.get("Content-Length", "0") or "0")
                if content_length <= 0:
                    raise ValueError("empty json body")
                payload = self.rfile.read(content_length)
                body = json.loads(payload.decode("utf-8"))
                note = normalize_note(body.get("note", ""))
                result = create_v2_restore_point(self.v2_db_path, self.v2_restore_root, note)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "invalid json body"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/restore_points/restore":
            try:
                content_length = int(self.headers.get("Content-Length", "0") or "0")
                if content_length <= 0:
                    raise ValueError("empty json body")
                payload = self.rfile.read(content_length)
                body = json.loads(payload.decode("utf-8"))
                restore_point_id = validate_restore_point_id(body.get("restorePointId", ""))
                result = restore_v2_restore_point(self.v2_db_path, self.v2_restore_root, restore_point_id)
                self._send_json(200, {"ok": True, "result": result})
            except LookupError as exc:
                self._send_json(404, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "invalid json body"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/v2/date_time_ocr":
            try:
                _fields, files = self._parse_multipart_form()
                upload = files.get("file")
                if upload is None:
                    raise ValueError("missing file")
                original_name, file_bytes = upload
                suffix = Path(Path(original_name or "upload").name).suffix.lower()
                if suffix not in ALLOWED_IMAGE_SUFFIXES:
                    raise ValueError("unsupported image type")
                if not file_bytes:
                    raise ValueError("empty file")
                if len(file_bytes) > MAX_UPLOAD_BYTES:
                    raise ValueError("image must be 10MB or smaller")
                result = ocr_datetime_image(file_bytes, suffix)
                self._send_json(200, {"ok": True, "result": result})
            except RuntimeError as exc:
                self._send_json(501, {"ok": False, "error": str(exc)})
            except ValueError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            except subprocess.TimeoutExpired:
                self._send_json(504, {"ok": False, "error": "OCR timed out"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

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
            relative_url = f"{IMAGE_ROUTE_PREFIX}{rel_path}"
            absolute_url = f"{self._public_base_url()}{relative_url}"
            panel_relative_path = f"{self.image_root.name}/{rel_path}"
            self._send_json(
                200,
                {
                    "ok": True,
                    "url": relative_url,
                    "relativeUrl": relative_url,
                    "absoluteUrl": absolute_url,
                    "path": str(dest_path.as_posix()),
                    "relativePath": rel_path,
                    "panelRelativePath": panel_relative_path,
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
    Handler.v2_db_path = args.v2_db_file
    Handler.v2_restore_root = resolve_restore_root(args.v2_db_file, args.v2_restore_dir)
    Handler.v2_restore_root.mkdir(parents=True, exist_ok=True)
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
