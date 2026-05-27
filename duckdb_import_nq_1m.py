#!/usr/bin/env python3
"""Normalize 1-minute futures CSV and optionally import it into DuckDB."""

from __future__ import annotations

import argparse
import csv
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator, Sequence

import duckdb


CSV_PATTERNS = (
    "%m/%d/%Y %H:%M:%S",
    "%m/%d/%Y %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%d %H:%M",
)


CREATE_TABLE_SQL = """
create table if not exists futures_1m (
  instrument varchar not null,
  ts timestamp not null,
  open double not null,
  high double not null,
  low double not null,
  close double not null,
  volume bigint
);

create index if not exists idx_futures_1m_instrument_ts
  on futures_1m (instrument, ts);
""".strip()

FIELD_ALIASES = {
    "datetime": ("datetime", "time", "timestamp", "date", "时间"),
    "open": ("open", "开盘价"),
    "high": ("high", "最高价"),
    "low": ("low", "最低价"),
    "close": ("close", "收盘价"),
    "volume": ("volume", "vol", "成交量"),
}


@dataclass
class NormalizedRow:
    instrument: str
    ts: str
    open: float
    high: float
    low: float
    close: float
    volume: int | None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="流式标准化 1m futures CSV，并可直接导入 DuckDB。")
    parser.add_argument("--input", required=True, help="输入 CSV 路径，例如 NQ_full_1min.csv 或 ES.csv")
    parser.add_argument("--instrument", default="NQ", help="品种代码，默认 NQ")
    parser.add_argument("--encoding", default="utf-8", help="输入文件编码，默认 utf-8")
    parser.add_argument("--table", default="futures_1m", help="目标表名，默认 futures_1m")
    parser.add_argument("--output", help="输出标准化 CSV 路径")
    parser.add_argument("--db-file", help="DuckDB 文件路径。提供后会直接导入数据库。")
    parser.add_argument("--create-table", action="store_true", help="导入前自动创建表和索引。")
    parser.add_argument("--truncate", action="store_true", help="导入前先删除 instrument 对应的数据。")
    parser.add_argument("--skip-bad-rows", action="store_true", help="跳过无法解析的坏行。")
    parser.add_argument("--progress-every", type=int, default=100000, help="每导入多少行打印一次进度，默认 100000。设为 0 可关闭。")
    return parser


def parse_datetime(value: str) -> datetime:
    cleaned = value.strip().lstrip("\ufeff")
    for pattern in CSV_PATTERNS:
        try:
            return datetime.strptime(cleaned, pattern)
        except ValueError:
            continue
    raise ValueError(f"无法解析 datetime: {value!r}")


def normalize_header(value: str | None) -> str:
    return (value or "").strip().lstrip("\ufeff").lower()


def resolve_fieldnames(fieldnames: Sequence[str | None]) -> dict[str, str]:
    normalized = {normalize_header(name): name for name in fieldnames if name}
    resolved: dict[str, str] = {}
    for canonical, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            matched = normalized.get(normalize_header(alias))
            if matched:
                resolved[canonical] = matched
                break

    required = ["datetime", "open", "high", "low", "close"]
    missing = [name for name in required if name not in resolved]
    if missing:
        raise ValueError(f"CSV 缺少必要列: {missing}，实际列: {list(fieldnames)}")
    return resolved


def iter_normalized_rows(
    input_path: Path,
    instrument: str,
    encoding: str,
    skip_bad_rows: bool,
) -> Iterator[NormalizedRow]:
    with input_path.open("r", encoding=encoding, newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("CSV 缺少表头。")

        reader.fieldnames = [name.lstrip("\ufeff") if name else name for name in reader.fieldnames]
        fields = resolve_fieldnames(reader.fieldnames)

        for row in reader:
            try:
                ts = parse_datetime(row[fields["datetime"]]).strftime("%Y-%m-%d %H:%M:%S")
                raw_volume = (row.get(fields.get("volume", "")) or "").strip()
                yield NormalizedRow(
                    instrument=instrument,
                    ts=ts,
                    open=float(row[fields["open"]]),
                    high=float(row[fields["high"]]),
                    low=float(row[fields["low"]]),
                    close=float(row[fields["close"]]),
                    volume=int(float(raw_volume)) if raw_volume else None,
                )
            except Exception as exc:
                if skip_bad_rows:
                    print(f"warning: skip line {reader.line_num}: {exc}", file=sys.stderr)
                    continue
                raise ValueError(f"第 {reader.line_num} 行处理失败: {exc}") from exc


def write_normalized_csv(rows: Iterable[NormalizedRow], output_path: Path) -> int:
    count = 0
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["instrument", "ts", "open", "high", "low", "close", "volume"])
        for row in rows:
            writer.writerow([row.instrument, row.ts, row.open, row.high, row.low, row.close, row.volume or ""])
            count += 1
    return count


def insert_batch(
    conn: duckdb.DuckDBPyConnection,
    table_name: str,
    batch: Sequence[NormalizedRow],
) -> int:
    if not batch:
        return 0
    sql = f"insert into {table_name} (instrument, ts, open, high, low, close, volume) values (?, ?, ?, ?, ?, ?, ?)"
    conn.executemany(
        sql,
        [(row.instrument, row.ts, row.open, row.high, row.low, row.close, row.volume) for row in batch],
    )
    return len(batch)


def import_to_duckdb_fast(
    input_path: Path,
    db_file: str,
    table_name: str,
    instrument: str,
    create_table: bool,
    truncate: bool,
) -> int:
    """Fast positional import.

    This path accepts either English or Chinese headers as long as the CSV column
    order is datetime/open/high/low/close/volume.
    """
    conn = duckdb.connect(db_file)
    started_at = time.time()
    try:
        if create_table:
            conn.execute(CREATE_TABLE_SQL.replace("futures_1m", table_name))

        if truncate:
            conn.execute(f"delete from {table_name} where instrument = ?", [instrument])
            print(f"已清空 {table_name} 中 instrument={instrument} 的旧数据")

        source_sql = """
select
  coalesce(
    try_strptime(datetime, '%m/%d/%Y %H:%M:%S'),
    try_strptime(datetime, '%m/%d/%Y %H:%M'),
    try_strptime(datetime, '%Y-%m-%d %H:%M:%S'),
    try_strptime(datetime, '%Y-%m-%d %H:%M'),
    try_strptime(datetime, '%Y/%m/%d %H:%M:%S'),
    try_strptime(datetime, '%Y/%m/%d %H:%M')
  ) as ts,
  try_cast(open as double) as open,
  try_cast(high as double) as high,
  try_cast(low as double) as low,
  try_cast(close as double) as close,
  try_cast(nullif(volume, '') as bigint) as volume
from read_csv(
  ?,
  header=false,
  skip=1,
  columns={
    'datetime': 'VARCHAR',
    'open': 'VARCHAR',
    'high': 'VARCHAR',
    'low': 'VARCHAR',
    'close': 'VARCHAR',
    'volume': 'VARCHAR'
  }
)
""".strip()

        estimated_rows = conn.execute(f"select count(*) from ({source_sql}) src", [str(input_path)]).fetchone()[0]
        print(f"已识别输入数据约 {estimated_rows} rows，开始快速导入...")

        insert_sql = f"""
insert into {table_name} (instrument, ts, open, high, low, close, volume)
select
  ? as instrument,
  ts,
  open,
  high,
  low,
  close,
  volume
from ({source_sql}) src
where ts is not null
  and open is not null
  and high is not null
  and low is not null
  and close is not null
""".strip()
        conn.execute(insert_sql, [instrument, str(input_path)])

        imported = conn.execute(f"select count(*) from {table_name} where instrument = ?", [instrument]).fetchone()[0]
        elapsed = time.time() - started_at
        print(f"快速导入完成，用时 {elapsed:.1f}s")
        return int(imported)
    finally:
        conn.close()


def import_to_duckdb(
    rows: Iterable[NormalizedRow],
    db_file: str,
    table_name: str,
    instrument: str,
    create_table: bool,
    truncate: bool,
    progress_every: int,
) -> int:
    count = 0
    conn = duckdb.connect(db_file)
    try:
        if create_table:
            conn.execute(CREATE_TABLE_SQL.replace("futures_1m", table_name))
        if truncate:
            conn.execute(f"delete from {table_name} where instrument = ?", [instrument])
            print(f"已清空 {table_name} 中 instrument={instrument} 的旧数据")

        batch: list[NormalizedRow] = []
        for row in rows:
            batch.append(row)
            if len(batch) >= 5000:
                count += insert_batch(conn, table_name, batch)
                batch.clear()
                if progress_every > 0 and count % progress_every == 0:
                    print(f"已导入 {count} rows...")
        count += insert_batch(conn, table_name, batch)
        if progress_every > 0 and count > 0:
            print(f"导入完成前最后计数: {count} rows")
    finally:
        conn.close()
    return count


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        parser.error(f"输入文件不存在: {input_path}")
    if not args.output and not args.db_file:
        parser.error("至少提供 --output 或 --db-file 其中一个。")

    normalized_rows = iter_normalized_rows(
        input_path=input_path,
        instrument=args.instrument,
        encoding=args.encoding,
        skip_bad_rows=args.skip_bad_rows,
    )

    if args.output:
        output_path = Path(args.output)
        written = write_normalized_csv(normalized_rows, output_path)
        print(f"已写入标准化 CSV: {output_path} ({written} rows)")

    if args.db_file:
        if args.output:
            imported = import_to_duckdb_fast(
                input_path=input_path,
                db_file=args.db_file,
                table_name=args.table,
                instrument=args.instrument,
                create_table=args.create_table,
                truncate=args.truncate,
            )
        else:
            imported = import_to_duckdb_fast(
                input_path=input_path,
                db_file=args.db_file,
                table_name=args.table,
                instrument=args.instrument,
                create_table=args.create_table,
                truncate=args.truncate,
            )
        print(f"已导入 DuckDB 表 {args.table}: {imported} rows")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
