"""Strict CSV conversion and DuckDB validation for first-run market data."""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import duckdb

IMPORT_CONFIRMATION = "ACTIVATE DATABASE"
REQUIRED_COLUMNS = (
    ("instrument", "VARCHAR"),
    ("ts", "TIMESTAMP"),
    ("open", "DOUBLE"),
    ("high", "DOUBLE"),
    ("low", "DOUBLE"),
    ("close", "DOUBLE"),
    ("volume", "BIGINT"),
)
SUPPORTED_INSTRUMENTS = frozenset({"ES", "NQ"})
USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


@dataclass(frozen=True)
class ImportRequestError(Exception):
    """Stable error returned for an invalid or unavailable import operation."""

    status: int
    code: str
    message: str


def require_user_id(value: Any) -> str:
    if not isinstance(value, str) or USER_ID_PATTERN.fullmatch(value) is None:
        raise ImportRequestError(401, "DATABASE_USER_REQUIRED", "authenticated administrator id is invalid")
    return value


def _connect(
    path: Path,
    *,
    read_only: bool,
    allow_external_access: bool = False,
) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(
        str(path),
        read_only=read_only,
        config={
            "enable_external_access": "true" if allow_external_access else "false",
            "autoload_known_extensions": "false",
            "autoinstall_known_extensions": "false",
        },
    )


def _strict_csv_header(path: Path) -> None:
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as source:
            header = next(csv.reader(source), None)
    except UnicodeDecodeError as error:
        raise ImportRequestError(422, "DATABASE_CSV_ENCODING", "CSV must be UTF-8") from error
    expected = [name for name, _ in REQUIRED_COLUMNS]
    if header != expected:
        raise ImportRequestError(
            422,
            "DATABASE_CSV_HEADER",
            f"CSV header must be exactly: {','.join(expected)}",
        )


def create_database_from_csv(source: Path, candidate: Path) -> None:
    _strict_csv_header(source)
    connection = _connect(candidate, read_only=False, allow_external_access=True)
    try:
        connection.execute(
            """
            CREATE TABLE futures_1m (
                instrument VARCHAR, ts TIMESTAMP, open DOUBLE, high DOUBLE,
                low DOUBLE, close DOUBLE, volume BIGINT
            )
            """
        )
        connection.execute(
            """
            INSERT INTO futures_1m
            SELECT instrument, ts, open, high, low, close, volume
            FROM read_csv(
                ?, header = true, auto_detect = false,
                columns = {
                    'instrument': 'VARCHAR', 'ts': 'TIMESTAMP', 'open': 'DOUBLE',
                    'high': 'DOUBLE', 'low': 'DOUBLE', 'close': 'DOUBLE',
                    'volume': 'BIGINT'
                },
                strict_mode = true, ignore_errors = false, null_padding = false,
                timestampformat = '%Y-%m-%d %H:%M:%S'
            )
            ORDER BY instrument, ts
            """,
            [str(source)],
        )
        connection.execute("CHECKPOINT")
    except Exception as error:
        detail = str(error).replace(str(source), "<uploaded CSV>")
        raise ImportRequestError(
            422,
            "DATABASE_CSV_FORMAT",
            f"CSV could not be converted without normalization: {detail}",
        ) from error
    finally:
        connection.close()


def _schema(connection: duckdb.DuckDBPyConnection) -> tuple[tuple[str, str], ...]:
    table = connection.execute(
        """
        SELECT table_type FROM information_schema.tables
        WHERE table_schema = 'main' AND table_name = 'futures_1m'
        """
    ).fetchone()
    if table is None or table[0] != "BASE TABLE":
        raise ImportRequestError(
            422,
            "DATABASE_TABLE_REQUIRED",
            "DuckDB must contain the main.futures_1m base table",
        )
    return tuple((str(row[1]), str(row[2]).upper()) for row in connection.execute(
        "PRAGMA table_info('futures_1m')"
    ).fetchall())


def _assert_zero(connection: duckdb.DuckDBPyConnection, query: str, code: str, label: str) -> None:
    count = int(connection.execute(query).fetchone()[0])
    if count:
        raise ImportRequestError(422, code, f"futures_1m contains {count} {label}")


def validate_database(path: Path) -> dict[str, Any]:
    try:
        connection = _connect(path, read_only=True)
    except Exception as error:
        raise ImportRequestError(
            422,
            "DATABASE_DUCKDB_OPEN",
            "uploaded file is not a readable DuckDB database",
        ) from error
    try:
        if _schema(connection) != REQUIRED_COLUMNS:
            expected = ", ".join(f"{name} {kind}" for name, kind in REQUIRED_COLUMNS)
            raise ImportRequestError(
                422,
                "DATABASE_SCHEMA_MISMATCH",
                f"futures_1m schema must be exactly: {expected}",
            )
        rows = int(connection.execute("SELECT count(*) FROM futures_1m").fetchone()[0])
        if rows < 1:
            raise ImportRequestError(422, "DATABASE_EMPTY", "futures_1m must contain at least one row")
        _assert_zero(connection, """
            SELECT count(*) FROM futures_1m
            WHERE instrument IS NULL OR ts IS NULL OR open IS NULL OR high IS NULL
               OR low IS NULL OR close IS NULL OR volume IS NULL
        """, "DATABASE_NULL_VALUES", "rows with required null values")
        invalid_instruments = [str(row[0]) for row in connection.execute("""
            SELECT DISTINCT instrument FROM futures_1m
            WHERE instrument NOT IN ('ES', 'NQ') ORDER BY instrument LIMIT 10
        """).fetchall()]
        if invalid_instruments:
            raise ImportRequestError(
                422,
                "DATABASE_INSTRUMENT_UNSUPPORTED",
                f"unsupported instruments: {', '.join(invalid_instruments)}",
            )
        _assert_zero(
            connection,
            "SELECT count(*) - count(DISTINCT (instrument, ts)) FROM futures_1m",
            "DATABASE_DUPLICATE_KEYS",
            "duplicate (instrument, ts) rows",
        )
        _assert_zero(
            connection,
            "SELECT count(*) FROM futures_1m WHERE date_trunc('minute', ts) <> ts",
            "DATABASE_MINUTE_ALIGNMENT",
            "timestamps not aligned to a minute",
        )
        _assert_zero(connection, """
            SELECT count(*) FROM futures_1m
            WHERE NOT isfinite(open) OR NOT isfinite(high) OR NOT isfinite(low)
               OR NOT isfinite(close) OR open <= 0 OR high <= 0 OR low <= 0 OR close <= 0
               OR high < low OR low > least(open, close) OR high < greatest(open, close)
               OR volume < 0
        """, "DATABASE_MARKET_VALUES", "invalid OHLC or volume rows")
        coverage = [
            {
                "instrument": str(instrument),
                "rows": int(instrument_rows),
                "start": str(start),
                "end": str(end),
            }
            for instrument, instrument_rows, start, end in connection.execute("""
                SELECT instrument, count(*), min(ts), max(ts)
                FROM futures_1m GROUP BY instrument ORDER BY instrument
            """).fetchall()
        ]
        return {
            "rows": rows,
            "duplicateKeys": 0,
            "invalidRows": 0,
            "coverage": coverage,
        }
    except ImportRequestError:
        raise
    except Exception as error:
        raise ImportRequestError(
            422,
            "DATABASE_VALIDATION_FAILED",
            f"DuckDB validation failed: {error}",
        ) from error
    finally:
        connection.close()
