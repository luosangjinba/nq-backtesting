#!/usr/bin/env python3
"""Extract continuous time segments from a large OHLCV CSV and save as a new CSV."""

import argparse
import csv
import sys
from datetime import datetime

FALLBACK_PATTERNS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%d %H:%M",
    "%m/%d/%Y %H:%M:%S",
    "%m/%d/%Y %H:%M",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
]


def parse_datetime(value):
    value = value.strip()
    for pattern in FALLBACK_PATTERNS:
        try:
            return datetime.strptime(value, pattern)
        except ValueError:
            continue

    try:
        from dateutil import parser

        return parser.parse(value)
    except Exception:
        raise ValueError(
            f"Cannot parse datetime value '{value}'. Supported formats include: {', '.join(FALLBACK_PATTERNS)}"
        )


def build_parser():
    parser = argparse.ArgumentParser(
        description="从OHLCV CSV文件中提取连续时间区间并另存为CSV。"
    )
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        help="输入CSV文件路径，例如：Part of NQ History Price.csv",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="输出CSV文件路径，例如：segment.csv",
    )
    parser.add_argument(
        "--start",
        required=True,
        help="起始时间，例如：2008-01-02 06:05 或 1/2/2008 6:05",
    )
    parser.add_argument(
        "--end",
        required=True,
        help="结束时间，例如：2008-01-02 06:20 或 1/2/2008 6:20",
    )
    parser.add_argument(
        "--datetime-column",
        default="datetime",
        help="时间戳所在列名，默认：datetime",
    )
    parser.add_argument(
        "--delimiter",
        default=",",
        help="CSV字段分隔符，默认：,",
    )
    parser.add_argument(
        "--encoding",
        default="utf-8",
        help="CSV文件编码，默认：utf-8。若读取失败，可改为gbk或gb18030。",
    )
    return parser


def extract_time_segment(
    input_path,
    output_path,
    start_dt,
    end_dt,
    datetime_column,
    delimiter,
    encoding,
):
    with open(input_path, "r", encoding=encoding, newline="") as fin:
        reader = csv.DictReader(fin, delimiter=delimiter)
        if not reader.fieldnames:
            raise ValueError("CSV文件没有表头。")

        # 处理可能存在的UTF-8 BOM
        reader.fieldnames = [name.lstrip("\ufeff") if name else name for name in reader.fieldnames]

        if datetime_column not in reader.fieldnames:
            raise ValueError(
                f"CSV中未找到指定时间列 '{datetime_column}'。可用列名：{reader.fieldnames}"
            )

        with open(output_path, "w", encoding=encoding, newline="") as fout:
            writer = csv.DictWriter(fout, fieldnames=reader.fieldnames, delimiter=delimiter)
            writer.writeheader()

            written = 0
            for row in reader:
                raw = row[datetime_column]
                if raw is None or raw.strip() == "":
                    continue

                try:
                    row_dt = parse_datetime(raw)
                except ValueError as exc:
                    raise ValueError(f"第{reader.line_num}行时间解析失败: {exc}") from exc

                if row_dt < start_dt:
                    continue
                if row_dt > end_dt:
                    break

                writer.writerow(row)
                written += 1

    print(f"已导出 {written} 行数据到 '{output_path}'。")


def main():
    parser = build_parser()
    args = parser.parse_args()

    start_dt = parse_datetime(args.start)
    end_dt = parse_datetime(args.end)
    if start_dt > end_dt:
        parser.error("--start 时间必须早于或等于 --end 时间。")

    try:
        extract_time_segment(
            input_path=args.input,
            output_path=args.output,
            start_dt=start_dt,
            end_dt=end_dt,
            datetime_column=args.datetime_column,
            delimiter=args.delimiter,
            encoding=args.encoding,
        )
    except Exception as exc:
        print(f"错误: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
