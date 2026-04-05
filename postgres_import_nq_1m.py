#!/usr/bin/env python3
"""Stream NQ 1-minute OHLCV CSV into a PostgreSQL-ready format or database."""

from __future__ import annotations

import argparse
import csv
import io
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator, TextIO


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
  instrument text not null,
  ts timestamp not null,
  open numeric(12, 4) not null,
  high numeric(12, 4) not null,
  low numeric(12, 4) not null,
  close numeric(12, 4) not null,
  volume bigint,
  primary key (instrument, ts)
);

create index if not exists idx_futures_1m_instrument_ts
  on futures_1m (instrument, ts);
""".strip()


@dataclass
class NormalizedRow:
    instrument: str
    ts: str
    open: str
    high: str
    low: str
    close: str
    volume: str


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="流式标准化 NQ 1m CSV，并可直接导入 PostgreSQL。"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="输入 CSV 路径，例如 NQ_full_1min.csv",
    )
    parser.add_argument(
        "--instrument",
        default="NQ",
        help="品种代码，默认 NQ",
    )
    parser.add_argument(
        "--encoding",
        default="utf-8",
        help="输入文件编码，默认 utf-8",
    )
    parser.add_argument(
        "--table",
        default="futures_1m",
        help="目标 PostgreSQL 表名，默认 futures_1m",
    )
    parser.add_argument(
        "--output",
        help="输出标准化 CSV 路径。如果提供，则会生成 PostgreSQL 友好的标准化文件。",
    )
    parser.add_argument(
        "--dsn",
        help="PostgreSQL DSN。提供后会直接导入数据库。",
    )
    parser.add_argument(
        "--create-table",
        action="store_true",
        help="导入前自动创建表和索引。",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="导入前先清空 instrument 对应的数据。",
    )
    parser.add_argument(
        "--skip-bad-rows",
        action="store_true",
        help="跳过无法解析的坏行，而不是直接失败。",
    )
    return parser


def parse_datetime(value: str) -> datetime:
    cleaned = value.strip().lstrip("\ufeff")
    for pattern in CSV_PATTERNS:
        try:
            return datetime.strptime(cleaned, pattern)
        except ValueError:
            continue
    raise ValueError(f"无法解析 datetime: {value!r}")


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
        required = ["datetime", "open", "high", "low", "close"]
        missing = [name for name in required if name not in reader.fieldnames]
        if missing:
            raise ValueError(f"CSV 缺少必要列: {missing}，实际列: {reader.fieldnames}")

        for row in reader:
            try:
                ts = parse_datetime(row["datetime"]).strftime("%Y-%m-%d %H:%M:%S")
                open_ = str(float(row["open"]))
                high = str(float(row["high"]))
                low = str(float(row["low"]))
                close = str(float(row["close"]))
                raw_volume = (row.get("volume") or "").strip()
                volume = str(int(float(raw_volume))) if raw_volume else ""
                yield NormalizedRow(
                    instrument=instrument,
                    ts=ts,
                    open=open_,
                    high=high,
                    low=low,
                    close=close,
                    volume=volume,
                )
            except Exception as exc:
                if skip_bad_rows:
                    print(
                        f"warning: skip line {reader.line_num}: {exc}",
                        file=sys.stderr,
                    )
                    continue
                raise ValueError(f"第 {reader.line_num} 行处理失败: {exc}") from exc


def write_normalized_csv(rows: Iterable[NormalizedRow], output_path: Path) -> int:
    count = 0
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["instrument", "ts", "open", "high", "low", "close", "volume"])
        for row in rows:
            writer.writerow([row.instrument, row.ts, row.open, row.high, row.low, row.close, row.volume])
            count += 1
    return count


def copy_to_postgres(
    rows: Iterable[NormalizedRow],
    dsn: str,
    table_name: str,
    instrument: str,
    create_table: bool,
    truncate: bool,
) -> int:
    try:
        import psycopg
        from psycopg import sql
    except Exception as exc:
        raise RuntimeError(
            "缺少 psycopg。请先安装 `pip install psycopg[binary]`，或先使用 --output 生成标准化 CSV。"
        ) from exc

    table_ident = sql.Identifier(table_name)
    count = 0

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            if create_table:
                cur.execute(CREATE_TABLE_SQL)
            if truncate:
                cur.execute(
                    sql.SQL("delete from {} where instrument = %s").format(table_ident),
                    [instrument],
                )

            copy_sql = sql.SQL(
                "copy {} (instrument, ts, open, high, low, close, volume) "
                "from stdin with (format csv)"
            ).format(table_ident)

            with cur.copy(copy_sql) as copy:
                for row in rows:
                    buffer = io.StringIO()
                    writer = csv.writer(buffer, lineterminator="\n")
                    writer.writerow(
                        [row.instrument, row.ts, row.open, row.high, row.low, row.close, row.volume]
                    )
                    copy.write(buffer.getvalue())
                    count += 1

        conn.commit()

    return count


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        parser.error(f"输入文件不存在: {input_path}")

    if not args.output and not args.dsn:
        parser.error("至少提供 --output 或 --dsn 其中一个。")

    normalized_rows = iter_normalized_rows(
        input_path=input_path,
        instrument=args.instrument,
        encoding=args.encoding,
        skip_bad_rows=args.skip_bad_rows,
    )

    total_written = 0

    if args.output:
        output_path = Path(args.output)
        total_written = write_normalized_csv(normalized_rows, output_path)
        print(f"已写入标准化 CSV: {output_path} ({total_written} rows)")
        if args.dsn:
            normalized_rows = iter_normalized_rows(
                input_path=input_path,
                instrument=args.instrument,
                encoding=args.encoding,
                skip_bad_rows=args.skip_bad_rows,
            )

    if args.dsn:
        imported = copy_to_postgres(
            rows=normalized_rows,
            dsn=args.dsn,
            table_name=args.table,
            instrument=args.instrument,
            create_table=args.create_table,
            truncate=args.truncate,
        )
        print(f"已导入 PostgreSQL 表 {args.table}: {imported} rows")
        if not args.output:
            total_written = imported

    return 0 if total_written >= 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
