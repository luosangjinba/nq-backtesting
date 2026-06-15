#!/usr/bin/env python3
"""Update V4 shared VIX daily CSV from Cboe official history data.

Default mode is a dry-run. File writes require both `--write` and
`--confirm-write`.
"""

from __future__ import annotations

import argparse
import csv
import os
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from io import StringIO
from pathlib import Path


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_VIX_CSV = V4_ROOT / "data" / "vix-daily.csv"
DEFAULT_CBOE_VIX_URL = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv"
CSV_COLUMNS = ["DATE", "OPEN", "HIGH", "LOW", "CLOSE"]


@dataclass(frozen=True)
class VixRow:
    date: str
    open: float
    high: float
    low: float
    close: float

    def values(self) -> tuple[str, str, str, str, str]:
        return (
            self.date,
            format_price(self.open),
            format_price(self.high),
            format_price(self.low),
            format_price(self.close),
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dry-run or update V4 VIX daily CSV from Cboe.")
    parser.add_argument("--csv", default=str(DEFAULT_VIX_CSV), help="Target VIX CSV path.")
    parser.add_argument("--source-url", default=DEFAULT_CBOE_VIX_URL, help="Cboe VIX history CSV URL.")
    parser.add_argument("--source-file", help="Read source CSV from a local file instead of --source-url.")
    parser.add_argument("--write", action="store_true", help="Write merged CSV to disk.")
    parser.add_argument("--confirm-write", action="store_true", help="Required with --write.")
    parser.add_argument("--show-sample", type=int, default=5, help="Number of inserted/updated rows to show.")
    return parser.parse_args()


def normalize_date(value: str) -> str:
    text = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"invalid VIX date: {value!r}")


def parse_price(value: str, field: str, date: str) -> float:
    try:
        price = float(str(value or "").strip())
    except ValueError as exc:
        raise ValueError(f"invalid {field} for {date}: {value!r}") from exc
    if price < 0:
        raise ValueError(f"invalid negative {field} for {date}: {value!r}")
    return price


def format_price(value: float) -> str:
    return f"{value:.6f}"


def normalize_header(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise ValueError("missing CSV header")
    normalized = {field.strip().upper(): field for field in fieldnames if field is not None}
    missing = [column for column in CSV_COLUMNS if column not in normalized]
    if missing:
        raise ValueError(f"missing VIX CSV columns: {', '.join(missing)}")
    return normalized


def parse_vix_csv(text: str, source_label: str) -> dict[str, VixRow]:
    reader = csv.DictReader(StringIO(text))
    header = normalize_header(reader.fieldnames)
    rows: dict[str, VixRow] = {}
    for index, raw in enumerate(reader, start=2):
        if not raw or not any(str(value or "").strip() for value in raw.values()):
            continue
        try:
            date = normalize_date(raw[header["DATE"]])
            row = VixRow(
                date=date,
                open=parse_price(raw[header["OPEN"]], "OPEN", date),
                high=parse_price(raw[header["HIGH"]], "HIGH", date),
                low=parse_price(raw[header["LOW"]], "LOW", date),
                close=parse_price(raw[header["CLOSE"]], "CLOSE", date),
            )
        except Exception as exc:
            raise ValueError(f"{source_label}:{index}: {exc}") from exc
        rows[row.date] = row
    return rows


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def fetch_source_text(args: argparse.Namespace) -> tuple[str, str]:
    if args.source_file:
        path = Path(args.source_file).expanduser().resolve()
        return read_text(path), str(path)
    request = urllib.request.Request(args.source_url, headers={"User-Agent": "v4-data-refresh/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset), args.source_url


def merge_rows(existing: dict[str, VixRow], source: dict[str, VixRow]) -> tuple[dict[str, VixRow], list[VixRow], list[VixRow]]:
    merged = dict(existing)
    inserted: list[VixRow] = []
    updated: list[VixRow] = []
    for date in sorted(source):
        source_row = source[date]
        current = merged.get(date)
        if current is None:
            inserted.append(source_row)
        elif current != source_row:
            updated.append(source_row)
        merged[date] = source_row
    return merged, inserted, updated


def render_csv(rows: dict[str, VixRow]) -> str:
    output = StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(CSV_COLUMNS)
    for date in sorted(rows):
        writer.writerow(rows[date].values())
    return output.getvalue()


def write_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def print_sample(title: str, rows: list[VixRow], limit: int) -> None:
    if limit <= 0 or not rows:
        return
    print(f"\n{title}")
    for row in rows[:limit]:
        print(",".join(row.values()))


def main() -> int:
    args = parse_args()
    if args.write and not args.confirm_write:
        print("--write requires --confirm-write")
        return 2

    target_path = Path(args.csv).expanduser().resolve()
    existing_text = read_text(target_path) if target_path.exists() else "DATE,OPEN,HIGH,LOW,CLOSE\n"
    try:
        source_text, source_label = fetch_source_text(args)
    except (OSError, urllib.error.URLError) as exc:
        print("fetch_status: failed")
        print(f"source: {args.source_file or args.source_url}")
        print(f"error: {exc}")
        return 1

    try:
        existing_rows = parse_vix_csv(existing_text, str(target_path))
        source_rows = parse_vix_csv(source_text, source_label)
    except ValueError as exc:
        print(f"parse_status: failed")
        print(f"error: {exc}")
        return 1
    merged_rows, inserted, updated = merge_rows(existing_rows, source_rows)

    existing_dates = sorted(existing_rows)
    source_dates = sorted(source_rows)
    merged_dates = sorted(merged_rows)
    print(f"source: {source_label}")
    print(f"target: {target_path}")
    print(f"existing_rows: {len(existing_rows)}")
    print(f"existing_first_date: {existing_dates[0] if existing_dates else 'n/a'}")
    print(f"existing_latest_date: {existing_dates[-1] if existing_dates else 'n/a'}")
    print(f"source_rows: {len(source_rows)}")
    print(f"source_first_date: {source_dates[0] if source_dates else 'n/a'}")
    print(f"source_latest_date: {source_dates[-1] if source_dates else 'n/a'}")
    print(f"inserted_rows: {len(inserted)}")
    print(f"updated_rows: {len(updated)}")
    print(f"merged_rows: {len(merged_rows)}")
    print(f"merged_latest_date: {merged_dates[-1] if merged_dates else 'n/a'}")
    print_sample("inserted sample", inserted, args.show_sample)
    print_sample("updated sample", updated, args.show_sample)

    if args.write:
        write_atomic(target_path, render_csv(merged_rows))
        print("\nwrite_status: committed VIX CSV update")
    else:
        print("\nwrite_status: dry-run; no CSV changes were made")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
