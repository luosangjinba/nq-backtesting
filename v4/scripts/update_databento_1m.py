#!/usr/bin/env python3
"""Databento 1m insert-only updater for V4 futures data.

By default this script runs a dry-run. Write mode is deliberately narrow:
only ES is allowed, `--confirm-write` is required, all roll segments must have
write-eligible roll statuses, and insertion is `insert where not exists` inside
a transaction.
"""

from __future__ import annotations

import argparse
import time as time_lib
import warnings
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb
import pandas as pd
import yaml

try:
    import databento as db
except ImportError as exc:  # pragma: no cover - exercised by CLI environment
    raise SystemExit("Missing dependency: databento. Install with `python3 -m pip install databento`.") from exc


warnings.simplefilter("ignore", ResourceWarning)

V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = V4_ROOT / "data" / "trading_data.duckdb"
DEFAULT_ROLL_CALENDAR = V4_ROOT / "data_config" / "futures_roll_calendar.yml"
ET = ZoneInfo("America/New_York")
OHLC_COLUMNS = ["open", "high", "low", "close"]
WRITE_ELIGIBLE_ROLL_STATUSES = frozenset({"validated", "volume_validated", "manual_validated"})


@dataclass(frozen=True)
class RollEntry:
    instrument: str
    old_contract: str
    new_contract: str
    roll_date_et: date
    status: str
    note: str


@dataclass(frozen=True)
class Segment:
    instrument: str
    contract: str
    start_et: datetime
    end_et: datetime
    roll_status: str
    roll_note: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dry-run Databento insert-only 1m updater for V4.")
    parser.add_argument("--instrument", required=True, choices=["ES", "NQ"], help="Internal instrument to update.")
    parser.add_argument("--start", help="ET-naive start timestamp. Defaults to DB max(ts)+1 minute.")
    parser.add_argument("--end", help="ET-naive exclusive end timestamp. Defaults to Databento available end.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path, default v4/data/trading_data.duckdb.")
    parser.add_argument("--roll-calendar", default=str(DEFAULT_ROLL_CALENDAR), help="Roll calendar YAML path.")
    parser.add_argument("--dataset", help="Override Databento dataset from roll calendar.")
    parser.add_argument("--schema", help="Override Databento schema from roll calendar.")
    parser.add_argument("--dry-run", action="store_true", help="Explicitly run read-only dry-run. This is the default.")
    parser.add_argument("--write", action="store_true", help="Execute insert-only write. Currently allowed only for ES.")
    parser.add_argument("--confirm-write", action="store_true", help="Required with --write.")
    parser.add_argument("--chunk-days", type=int, default=5, help="Databento request chunk size in ET days.")
    parser.add_argument("--retries", type=int, default=2, help="Retries per Databento request chunk for transient failures.")
    parser.add_argument("--retry-sleep", type=float, default=2.0, help="Seconds to sleep before retrying a transient request failure.")
    parser.add_argument("--show-sample", type=int, default=3, help="Number of would-insert sample rows to print.")
    return parser.parse_args()


def parse_et_naive(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is not None:
        return parsed.astimezone(ET).replace(tzinfo=None)
    return parsed


def floor_to_minute(value: datetime) -> datetime:
    return value.replace(second=0, microsecond=0)


def et_naive_to_utc_iso(value: datetime) -> str:
    return value.replace(tzinfo=ET).astimezone(timezone.utc).isoformat()


def load_roll_calendar(path: Path) -> tuple[str, str, list[RollEntry]]:
    data = yaml.safe_load(path.read_text())
    dataset = str(data.get("dataset") or "GLBX.MDP3")
    schema = str(data.get("schema") or "ohlcv-1m")
    entries = []
    for row in data.get("rolls", []):
        roll_date = row["roll_date_et"]
        if isinstance(roll_date, str):
            roll_date = date.fromisoformat(roll_date)
        entries.append(
            RollEntry(
                instrument=str(row["instrument"]).upper(),
                old_contract=str(row["old_contract"]),
                new_contract=str(row["new_contract"]),
                roll_date_et=roll_date,
                status=str(row.get("status") or "unknown"),
                note=str(row.get("note") or ""),
            )
        )
    return dataset, schema, entries


def get_db_max_ts(db_path: Path, instrument: str) -> datetime:
    with duckdb.connect(str(db_path), read_only=True) as conn:
        value = conn.execute("select max(ts) from futures_1m where instrument = ?", [instrument]).fetchone()[0]
    if value is None:
        raise RuntimeError(f"no DB rows found for instrument {instrument}")
    return value


def get_db_coverage(db_path: Path, instrument: str) -> dict[str, object]:
    query = """
select min(ts) as min_ts, max(ts) as max_ts, count(*) as rows
from futures_1m
where instrument = ?
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        row = conn.execute(query, [instrument]).fetchone()
    return {"min_ts": row[0], "max_ts": row[1], "rows": row[2]}


def get_existing_keys(db_path: Path, instrument: str, start_et: datetime, end_et: datetime) -> set[datetime]:
    query = """
select ts
from futures_1m
where instrument = ?
  and ts >= ?
  and ts < ?
""".strip()
    with duckdb.connect(str(db_path), read_only=True) as conn:
        rows = conn.execute(query, [instrument, start_et, end_et]).fetchall()
    return {row[0] for row in rows}


def get_databento_end_et(client: db.Historical, dataset: str, schema: str) -> datetime:
    available = client.metadata.get_dataset_range(dataset=dataset)
    schema_end = available.get("schema", {}).get(schema, {}).get("end") or available.get("end")
    if not schema_end:
        raise RuntimeError(f"cannot determine Databento end for {dataset} {schema}")
    end_utc = datetime.fromisoformat(str(schema_end).replace("Z", "+00:00"))
    return floor_to_minute(end_utc.astimezone(ET).replace(tzinfo=None))


def contract_for_date(entries: list[RollEntry], day: date) -> RollEntry:
    if not entries:
        raise RuntimeError("missing roll entries")
    for index, entry in enumerate(entries):
        if day < entry.roll_date_et:
            if index == 0:
                return RollEntry(entry.instrument, entry.old_contract, entry.old_contract, entry.roll_date_et, entry.status, entry.note)
            previous = entries[index - 1]
            return RollEntry(
                previous.instrument,
                previous.new_contract,
                previous.new_contract,
                previous.roll_date_et,
                previous.status,
                previous.note,
            )
    selected = entries[-1]
    return RollEntry(selected.instrument, selected.new_contract, selected.new_contract, selected.roll_date_et, selected.status, selected.note)


def build_segments(instrument: str, entries: list[RollEntry], start_et: datetime, end_et: datetime) -> list[Segment]:
    instrument_entries = sorted(
        [entry for entry in entries if entry.instrument == instrument],
        key=lambda entry: entry.roll_date_et,
    )
    if not instrument_entries:
        raise RuntimeError(f"no roll calendar entries for {instrument}")

    boundaries = [start_et]
    for entry in instrument_entries:
        boundary = datetime.combine(entry.roll_date_et, time.min)
        if start_et < boundary < end_et:
            boundaries.append(boundary)
    boundaries.append(end_et)
    boundaries = sorted(set(boundaries))

    segments: list[Segment] = []
    for left, right in zip(boundaries, boundaries[1:]):
        if left >= right:
            continue
        contract_entry = contract_for_date(instrument_entries, left.date())
        contract = contract_entry.old_contract
        segments.append(
            Segment(
                instrument=instrument,
                contract=contract,
                start_et=left,
                end_et=right,
                roll_status=contract_entry.status,
                roll_note=contract_entry.note,
            )
        )
    return segments


def split_segment_by_days(segment: Segment, chunk_days: int) -> list[Segment]:
    if chunk_days <= 0:
        raise SystemExit("--chunk-days must be greater than 0")
    chunks: list[Segment] = []
    left = segment.start_et
    while left < segment.end_et:
        right = min(left + timedelta(days=chunk_days), segment.end_et)
        chunks.append(
            Segment(
                instrument=segment.instrument,
                contract=segment.contract,
                start_et=left,
                end_et=right,
                roll_status=segment.roll_status,
                roll_note=segment.roll_note,
            )
        )
        left = right
    return chunks


def is_transient_databento_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(token in message for token in ["504", "gateway", "timed out", "timeout", "temporarily unavailable"])


def request_segment(
    client: db.Historical,
    dataset: str,
    schema: str,
    segment: Segment,
    retries: int,
    retry_sleep: float,
) -> tuple[pd.DataFrame, list[str]]:
    warning_messages: list[str] = []
    last_exc: Exception | None = None
    for attempt in range(max(0, retries) + 1):
        try:
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter("always")
                data = client.timeseries.get_range(
                    dataset=dataset,
                    symbols=[segment.contract],
                    schema=schema,
                    start=et_naive_to_utc_iso(segment.start_et),
                    end=et_naive_to_utc_iso(segment.end_et),
                    stype_in="raw_symbol",
                )
            for warning in caught:
                warning_messages.append(str(warning.message))
            break
        except Exception as exc:
            last_exc = exc
            if attempt >= retries or not is_transient_databento_error(exc):
                raise
            print(
                f"transient Databento failure for {segment.contract} "
                f"{segment.start_et} -> {segment.end_et}; retry {attempt + 1}/{retries}: {exc}"
            )
            time_lib.sleep(max(0.0, retry_sleep))
    else:
        raise RuntimeError("Databento request failed") from last_exc

    raw = data.to_df()
    if raw.empty:
        return pd.DataFrame(columns=["instrument", "ts", *OHLC_COLUMNS, "volume", "source_symbol"]), warning_messages
    index = raw.index
    if index.tz is None:
        localized = index.tz_localize("UTC").tz_convert(ET)
    else:
        localized = index.tz_convert(ET)
    normalized = pd.DataFrame({
        "instrument": segment.instrument,
        "ts": localized.tz_localize(None),
        "open": pd.to_numeric(raw["open"], errors="coerce"),
        "high": pd.to_numeric(raw["high"], errors="coerce"),
        "low": pd.to_numeric(raw["low"], errors="coerce"),
        "close": pd.to_numeric(raw["close"], errors="coerce"),
        "volume": pd.to_numeric(raw["volume"], errors="coerce").astype("Int64"),
        "source_symbol": raw["symbol"].astype(str),
    })
    normalized = normalized.dropna(subset=OHLC_COLUMNS)
    return normalized.sort_values(["instrument", "ts"]).reset_index(drop=True), warning_messages


def download_segment(
    client: db.Historical,
    dataset: str,
    schema: str,
    segment: Segment,
    chunk_days: int,
    retries: int,
    retry_sleep: float,
) -> tuple[pd.DataFrame, list[str], list[tuple[datetime, datetime, int]]]:
    frames = []
    warning_messages: list[str] = []
    chunk_counts: list[tuple[datetime, datetime, int]] = []
    for chunk in split_segment_by_days(segment, chunk_days):
        frame, chunk_warnings = request_segment(client, dataset, schema, chunk, retries, retry_sleep)
        frames.append(frame)
        warning_messages.extend(chunk_warnings)
        chunk_counts.append((chunk.start_et, chunk.end_et, len(frame)))
    if not frames:
        empty = pd.DataFrame(columns=["instrument", "ts", *OHLC_COLUMNS, "volume", "source_symbol"])
        return empty, warning_messages, chunk_counts
    combined = pd.concat(frames, ignore_index=True)
    return combined.sort_values(["instrument", "ts"]).reset_index(drop=True), warning_messages, chunk_counts


def is_write_eligible_roll_status(status: str) -> bool:
    return str(status or "").strip() in WRITE_ELIGIBLE_ROLL_STATUSES


def validate_write_allowed(args: argparse.Namespace, segments: list[Segment]) -> None:
    if not args.write:
        return
    if not args.confirm_write:
        raise SystemExit("--write requires --confirm-write")
    if args.instrument != "ES":
        raise SystemExit("--write is currently allowed only for ES")
    blocked = [segment for segment in segments if not is_write_eligible_roll_status(segment.roll_status)]
    if blocked:
        details = ", ".join(f"{segment.contract}:{segment.roll_status}" for segment in blocked)
        allowed = ", ".join(sorted(WRITE_ELIGIBLE_ROLL_STATUSES))
        raise SystemExit(
            "--write rejected because all segments must have write-eligible "
            f"roll statuses ({allowed}): {details}"
        )


def insert_missing_rows(db_path: Path, rows: pd.DataFrame) -> int:
    if rows.empty:
        return 0
    insert_rows = rows[["instrument", "ts", "open", "high", "low", "close", "volume"]].copy()
    with duckdb.connect(str(db_path)) as conn:
        before_count = conn.execute(
            "select count(*) from futures_1m where instrument = ?",
            [str(insert_rows["instrument"].iloc[0])],
        ).fetchone()[0]
        conn.register("candidate_rows", insert_rows)
        conn.execute("begin transaction")
        try:
            conn.execute(
                """
insert into futures_1m (instrument, ts, open, high, low, close, volume)
select c.instrument, c.ts, c.open, c.high, c.low, c.close, c.volume
from candidate_rows c
where not exists (
  select 1
  from futures_1m f
  where f.instrument = c.instrument
    and f.ts = c.ts
)
""".strip()
            )
            conn.execute("commit")
        except Exception:
            conn.execute("rollback")
            raise
        after_count = conn.execute(
            "select count(*) from futures_1m where instrument = ?",
            [str(insert_rows["instrument"].iloc[0])],
        ).fetchone()[0]
    return int(after_count - before_count)


def main() -> None:
    args = parse_args()
    if args.write and not args.confirm_write:
        raise SystemExit("--write requires --confirm-write")
    if args.write and args.instrument != "ES":
        raise SystemExit("--write is currently allowed only for ES")

    db_path = Path(args.db).expanduser().resolve()
    if not db_path.exists():
        raise SystemExit(f"database not found: {db_path}")
    calendar_path = Path(args.roll_calendar).expanduser().resolve()
    if not calendar_path.exists():
        raise SystemExit(f"roll calendar not found: {calendar_path}")

    calendar_dataset, calendar_schema, entries = load_roll_calendar(calendar_path)
    dataset = args.dataset or calendar_dataset
    schema = args.schema or calendar_schema
    client = db.Historical()

    db_max_ts = get_db_max_ts(db_path, args.instrument)
    start_et = parse_et_naive(args.start) if args.start else db_max_ts + timedelta(minutes=1)
    requested_end_et = parse_et_naive(args.end) if args.end else get_databento_end_et(client, dataset, schema)
    databento_end_et = get_databento_end_et(client, dataset, schema)
    end_et = min(requested_end_et, databento_end_et)
    if start_et >= end_et:
        raise SystemExit(f"empty requested range after clamp: {start_et} -> {end_et}")

    segments = build_segments(args.instrument, entries, start_et, end_et)
    validate_write_allowed(args, segments)
    before_coverage = get_db_coverage(db_path, args.instrument)
    print(f"dataset: {dataset}")
    print(f"schema: {schema}")
    print(f"instrument: {args.instrument}")
    print(f"db_max_ts: {db_max_ts}")
    print(f"dry_run_range_et: {start_et} -> {end_et} (exclusive)")
    print(f"databento_end_et: {databento_end_et}")
    print("\nsegments")
    for segment in segments:
        marker = "" if is_write_eligible_roll_status(segment.roll_status) else " WARNING blocked"
        print(
            f"- {segment.contract}: {segment.start_et} -> {segment.end_et} "
            f"status={segment.roll_status}{marker}"
        )
        if not is_write_eligible_roll_status(segment.roll_status):
            print(f"  note: {segment.roll_note}")

    frames = []
    all_warnings: list[str] = []
    segment_counts = []
    chunk_counts_by_contract: list[tuple[str, datetime, datetime, int]] = []
    for segment in segments:
        frame, warning_messages, chunk_counts = download_segment(
            client,
            dataset,
            schema,
            segment,
            args.chunk_days,
            args.retries,
            args.retry_sleep,
        )
        frames.append(frame)
        all_warnings.extend(warning_messages)
        segment_counts.append((segment.contract, len(frame)))
        for chunk_start, chunk_end, chunk_count in chunk_counts:
            chunk_counts_by_contract.append((segment.contract, chunk_start, chunk_end, chunk_count))

    candidates = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    duplicate_count = int(candidates.duplicated(subset=["instrument", "ts"]).sum()) if not candidates.empty else 0
    candidates = candidates.drop_duplicates(subset=["instrument", "ts"], keep="last")
    existing_keys = get_existing_keys(db_path, args.instrument, start_et, end_et)
    if not candidates.empty:
        candidate_key_series = pd.Series(pd.to_datetime(candidates["ts"]).dt.to_pydatetime(), index=candidates.index)
        candidate_keys = set(candidate_key_series)
        existing_candidate_count = len(candidate_keys & existing_keys)
        would_insert = candidates[~candidate_key_series.isin(existing_keys)].copy()
    else:
        existing_candidate_count = 0
        would_insert = candidates

    print("\nsegment downloaded rows")
    for contract, count in segment_counts:
        print(f"- {contract}: {count}")
    if chunk_counts_by_contract:
        print("\nchunk downloaded rows")
        for contract, chunk_start, chunk_end, count in chunk_counts_by_contract:
            print(f"- {contract}: {chunk_start} -> {chunk_end}: {count}")

    print("\ndry-run report")
    print(f"downloaded_normalized_rows: {sum(count for _, count in segment_counts)}")
    print(f"candidate_rows_after_dedupe: {len(candidates)}")
    print(f"duplicate_candidate_keys: {duplicate_count}")
    print(f"existing_candidate_keys: {existing_candidate_count}")
    print(f"would_insert_rows: {len(would_insert)}")
    if not would_insert.empty:
        print(f"would_insert_first_ts: {would_insert['ts'].min()}")
        print(f"would_insert_last_ts: {would_insert['ts'].max()}")
        if args.show_sample > 0:
            print("\nwould-insert sample")
            print(would_insert.head(args.show_sample).to_string(index=False))

    if all_warnings:
        print("\ndatabento warnings")
        for message in sorted(set(all_warnings)):
            print(f"- {message}")

    if args.write:
        print("\nwrite execution")
        print(f"before_rows: {before_coverage['rows']}")
        print(f"before_max_ts: {before_coverage['max_ts']}")
        inserted_count = insert_missing_rows(db_path, would_insert)
        after_coverage = get_db_coverage(db_path, args.instrument)
        print(f"inserted_rows: {inserted_count}")
        print(f"after_rows: {after_coverage['rows']}")
        print(f"after_max_ts: {after_coverage['max_ts']}")
        print("write_status: committed insert-only transaction")
    else:
        print("\nwrite_status: dry-run; no DB changes were made")


if __name__ == "__main__":
    main()
