#!/usr/bin/env python3
"""Read-only raw-contract volume crossover scanner for ES/NQ roll candidates."""

from __future__ import annotations

import argparse
import csv
import difflib
import sys
import warnings
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from io import StringIO
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from v4.server import roll_calendar_service

try:
    import databento as db
except ImportError:  # pragma: no cover - source-file mode does not need databento
    db = None


ET = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")
DEFAULT_DATASET = "GLBX.MDP3"
DEFAULT_SCHEMA = "ohlcv-1m"
V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROLL_CALENDAR = V4_ROOT / "data_config" / "futures_roll_calendar.yml"
WRITE_ELIGIBLE_STATUSES = frozenset({"validated", "volume_validated", "manual_validated"})
ATTENTION_STATUSES = frozenset({"future_candidate", "inferred_no_db_overlap", "inferred_volume_conflict"})


@dataclass(frozen=True)
class DailyVolume:
    date: str
    old_volume: int
    new_volume: int
    winner: str
    new_old_ratio: float | None
    old_minutes: int = 0
    new_minutes: int = 0
    complete: bool = True
    dataset_condition: str = "available"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan old/new futures contract volume for roll candidates.")
    parser.add_argument("--instrument", choices=["ES", "NQ"], help="Internal instrument label.")
    parser.add_argument("--old-contract", help="Old raw quarterly contract, e.g. NQH6.")
    parser.add_argument("--new-contract", help="New raw quarterly contract, e.g. NQM6.")
    parser.add_argument("--start", help="Start timestamp/date. Interpreted as ET if no timezone.")
    parser.add_argument("--end", help="End timestamp/date. Interpreted as ET if no timezone.")
    parser.add_argument("--dataset", default=DEFAULT_DATASET, help="Databento dataset.")
    parser.add_argument("--schema", default=DEFAULT_SCHEMA, help="Databento schema.")
    parser.add_argument("--source-file", help="Read normalized raw rows from local CSV instead of Databento.")
    parser.add_argument("--min-consecutive-days", type=int, default=2, help="Required consecutive new-dominant days.")
    parser.add_argument(
        "--min-session-minutes",
        type=int,
        default=0,
        help="Ignore incomplete CME trade dates with fewer minutes per contract; 0 keeps legacy fixture behavior.",
    )
    parser.add_argument("--show-empty-days", action="store_true", help="Print days where both contracts have zero volume.")
    parser.add_argument("--roll-calendar", default=str(DEFAULT_ROLL_CALENDAR), help="Roll calendar YAML path.")
    parser.add_argument("--report-calendar", action="store_true", help="Print roll calendar reminder report.")
    parser.add_argument("--attention-days", type=int, default=30, help="Report validated entries within this many days of today.")
    parser.add_argument("--confirm-roll", action="store_true", help="Preview or write a manual roll calendar confirmation.")
    parser.add_argument("--confirmed-roll-date", help="Confirmed ET roll date for --confirm-roll, e.g. 2026-03-16.")
    parser.add_argument(
        "--confirmed-status",
        choices=sorted(WRITE_ELIGIBLE_STATUSES),
        help="Write-eligible status to record for --confirm-roll.",
    )
    parser.add_argument("--confirmed-note", help="Evidence note to record for --confirm-roll.")
    parser.add_argument("--write", action="store_true", help="Write the confirmed roll calendar change.")
    parser.add_argument("--confirm-write", action="store_true", help="Required with --write for roll calendar mutation.")
    return parser.parse_args()


def validate_scan_args(args: argparse.Namespace) -> None:
    missing = [
        name for name, value in [
            ("--instrument", args.instrument),
            ("--old-contract", args.old_contract),
            ("--new-contract", args.new_contract),
            ("--start", args.start),
            ("--end", args.end),
        ]
        if not value
    ]
    if missing:
        raise ValueError(f"missing required scan arguments: {', '.join(missing)}")


def parse_datetime_et(value: str) -> datetime:
    text = str(value or "").strip()
    if not text:
        raise ValueError("empty datetime")
    if "T" not in text and " " not in text:
        text = f"{text}T00:00:00"
    parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=ET)
    return parsed.astimezone(ET)


def utc_iso_from_et(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def normalize_databento_rows(
    raw: pd.DataFrame,
    old_contract: str,
    new_contract: str,
    conditions: dict[str, str] | None = None,
) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=["source_symbol", "ts", "volume", "dataset_condition"])
    index = raw.index
    utc_index = index.tz_localize("UTC") if index.tz is None else index.tz_convert(UTC)
    localized = utc_index.tz_convert(ET)
    condition_by_date = conditions or {}
    rows = pd.DataFrame({
        "source_symbol": raw["symbol"].astype(str),
        "ts": localized.tz_localize(None),
        "volume": pd.to_numeric(raw["volume"], errors="coerce").fillna(0).astype("int64"),
        "dataset_condition": [
            condition_by_date.get(value.date().isoformat(), "unknown")
            for value in utc_index
        ],
    })
    rows = rows[rows["source_symbol"].isin([old_contract, new_contract])]
    return rows.sort_values(["source_symbol", "ts"]).reset_index(drop=True)


def download_databento_rows(args: argparse.Namespace) -> pd.DataFrame:
    if db is None:
        raise SystemExit("Missing dependency: databento. Install it or use --source-file.")
    client = db.Historical()
    start_et = parse_datetime_et(args.start)
    end_et = parse_datetime_et(args.end)
    start_utc = start_et.astimezone(UTC)
    end_utc = end_et.astimezone(UTC)
    condition_rows = client.metadata.get_dataset_condition(
        dataset=args.dataset,
        start_date=start_utc.date().isoformat(),
        end_date=end_utc.date().isoformat(),
    )
    conditions = {
        str(row.get("date") or ""): str(row.get("condition") or "unknown")
        for row in condition_rows
    }
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        data = client.timeseries.get_range(
            dataset=args.dataset,
            symbols=[args.old_contract, args.new_contract],
            schema=args.schema,
            start=utc_iso_from_et(start_et),
            end=utc_iso_from_et(end_et),
            stype_in="raw_symbol",
        )
    for warning in caught:
        print(f"databento_warning: {warning.message}")
    return normalize_databento_rows(data.to_df(), args.old_contract, args.new_contract, conditions)


def read_source_file(path: Path, old_contract: str, new_contract: str) -> pd.DataFrame:
    text = path.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(StringIO(text))
    fieldnames = {str(field).strip().lower(): field for field in (reader.fieldnames or [])}
    symbol_field = fieldnames.get("source_symbol") or fieldnames.get("symbol")
    ts_field = fieldnames.get("ts") or fieldnames.get("timestamp") or fieldnames.get("time")
    volume_field = fieldnames.get("volume")
    condition_field = fieldnames.get("dataset_condition") or fieldnames.get("condition")
    if not symbol_field or not ts_field or not volume_field:
        raise ValueError("source file requires symbol/source_symbol, ts/time/timestamp, and volume columns")
    rows = []
    for index, raw in enumerate(reader, start=2):
        symbol = str(raw.get(symbol_field) or "").strip()
        if symbol not in {old_contract, new_contract}:
            continue
        try:
            ts = parse_datetime_et(str(raw.get(ts_field) or "")).replace(tzinfo=None)
            volume = int(float(str(raw.get(volume_field) or "0").strip()))
        except Exception as exc:
            raise ValueError(f"{path}:{index}: {exc}") from exc
        condition = str(raw.get(condition_field) or "available").strip().lower() if condition_field else "available"
        rows.append({
            "source_symbol": symbol,
            "ts": ts,
            "volume": max(0, volume),
            "dataset_condition": condition or "unknown",
        })
    return pd.DataFrame(rows, columns=["source_symbol", "ts", "volume", "dataset_condition"])


def aggregate_daily_volume(
    rows: pd.DataFrame,
    old_contract: str,
    new_contract: str,
    min_session_minutes: int = 0,
) -> list[DailyVolume]:
    if rows.empty:
        return []
    working = rows.copy()
    working["ts"] = pd.to_datetime(working["ts"])
    if "dataset_condition" not in working.columns:
        working["dataset_condition"] = "available"
    working["dataset_condition"] = working["dataset_condition"].fillna("unknown").astype(str).str.lower()
    working["trade_date"] = working["ts"].map(
        lambda value: roll_calendar_service.trade_date_for_et(value.to_pydatetime()).isoformat()
    )
    output: list[DailyVolume] = []
    for day, day_rows in working.groupby("trade_date", sort=True):
        old_rows = day_rows[day_rows["source_symbol"] == old_contract]
        new_rows = day_rows[day_rows["source_symbol"] == new_contract]
        old_volume = int(old_rows["volume"].sum())
        new_volume = int(new_rows["volume"].sum())
        old_minutes = int(old_rows["ts"].nunique())
        new_minutes = int(new_rows["ts"].nunique())
        trade_day = date.fromisoformat(str(day))
        expected_open = roll_calendar_service.session_open_for_trade_date(trade_day)
        expected_close = datetime.combine(trade_day, time(17, 0))
        day_conditions = sorted(set(day_rows["dataset_condition"]))
        dataset_condition = "available" if day_conditions == ["available"] else "+".join(day_conditions)

        def source_is_complete(source_rows: pd.DataFrame, minute_count: int) -> bool:
            if min_session_minutes <= 0:
                return True
            if minute_count < min_session_minutes or source_rows.empty:
                return False
            first_minute = source_rows["ts"].min().to_pydatetime()
            last_minute = source_rows["ts"].max().to_pydatetime()
            return (
                first_minute <= expected_open + timedelta(minutes=30)
                and last_minute >= expected_close - timedelta(minutes=30)
            )

        complete = (
            source_is_complete(old_rows, old_minutes)
            and source_is_complete(new_rows, new_minutes)
            and dataset_condition == "available"
        )
        if new_volume > old_volume:
            winner = "new"
        elif old_volume > new_volume:
            winner = "old"
        elif old_volume or new_volume:
            winner = "tie"
        else:
            winner = "none"
        ratio = None if old_volume == 0 else new_volume / old_volume
        output.append(DailyVolume(
            str(day), old_volume, new_volume, winner, ratio,
            old_minutes, new_minutes, complete, dataset_condition,
        ))
    return output


def first_new_overtake(daily: list[DailyVolume]) -> str | None:
    for row in daily:
        if row.complete and row.winner == "new":
            return row.date
    return None


def first_consecutive_new_dominance(daily: list[DailyVolume], min_days: int) -> str | None:
    required = max(1, min_days)
    streak: list[str] = []
    for row in daily:
        if row.complete and row.winner == "new":
            streak.append(row.date)
            if len(streak) >= required:
                return streak[0]
        else:
            streak = []
    return None


def print_daily_table(daily: list[DailyVolume], old_contract: str, new_contract: str, show_empty: bool) -> None:
    print("\ndaily volume")
    print(
        "trade_date old_contract old_volume new_contract new_volume winner "
        "new_old_ratio old_minutes new_minutes complete dataset_condition"
    )
    for row in daily:
        if row.winner == "none" and not show_empty:
            continue
        ratio = "n/a" if row.new_old_ratio is None else f"{row.new_old_ratio:.4f}"
        print(
            f"{row.date} {old_contract} {row.old_volume} "
            f"{new_contract} {row.new_volume} {row.winner} {ratio} "
            f"{row.old_minutes} {row.new_minutes} {str(row.complete).lower()} "
            f"{row.dataset_condition}"
        )


def print_summary(args: argparse.Namespace, daily: list[DailyVolume]) -> None:
    overtake = first_new_overtake(daily)
    consecutive = first_consecutive_new_dominance(daily, args.min_consecutive_days)
    old_total = sum(row.old_volume for row in daily)
    new_total = sum(row.new_volume for row in daily)
    print("\nroll volume candidate summary")
    print(f"instrument: {args.instrument}")
    print(f"old_contract: {args.old_contract}")
    print(f"new_contract: {args.new_contract}")
    print(f"start: {args.start}")
    print(f"end: {args.end}")
    print(f"days: {len(daily)}")
    print(f"complete_trade_dates: {sum(1 for row in daily if row.complete)}")
    print(
        "non_available_trade_dates: "
        + (",".join(row.date for row in daily if row.dataset_condition != "available") or "none")
    )
    print(f"old_total_volume: {old_total}")
    print(f"new_total_volume: {new_total}")
    print(f"first_new_overtake_date: {overtake or 'n/a'}")
    print(f"min_consecutive_new_days: {max(1, args.min_consecutive_days)}")
    print(f"first_consecutive_new_dominance_date: {consecutive or 'n/a'}")
    # The first single-day overtake is useful diagnostic evidence, but it is
    # not a confirmed candidate until the configured dominance streak is met.
    candidate = consecutive
    print(f"candidate_roll_date: {candidate or 'n/a'}")
    if candidate:
        print("candidate_status: manual confirmation required")
    elif overtake:
        print("candidate_status: minimum consecutive new-contract dominance not met")
    else:
        print("candidate_status: no new-contract dominance detected")


def is_write_eligible(status: str) -> bool:
    return str(status or "").strip() in WRITE_ELIGIBLE_STATUSES


def recommended_action(status: str) -> str:
    normalized = str(status or "").strip()
    if normalized == "validated":
        return "no action"
    if normalized in {"volume_validated", "manual_validated"}:
        return "write-eligible; keep evidence note"
    if normalized == "inferred_volume_conflict":
        return "scan volume and manually confirm roll date"
    if normalized == "inferred_no_db_overlap":
        return "scan volume; manual confirmation required before write"
    if normalized == "future_candidate":
        return "scan near roll window; manual confirmation required"
    return "unknown status; keep blocked"


def load_roll_calendar(path: Path) -> tuple[str, str, list[dict[str, object]]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    dataset = str(data.get("dataset") or DEFAULT_DATASET)
    schema = str(data.get("schema") or DEFAULT_SCHEMA)
    return dataset, schema, list(data.get("rolls") or [])


def load_roll_calendar_data(path: Path) -> dict[str, object]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError("roll calendar root must be a mapping")
    rolls = data.get("rolls")
    if not isinstance(rolls, list):
        raise ValueError("roll calendar requires a rolls list")
    return data


def print_calendar_report(args: argparse.Namespace) -> int:
    calendar_path = Path(args.roll_calendar).expanduser().resolve()
    dataset, schema, entries = load_roll_calendar(calendar_path)
    print("roll_calendar_report_status: ok")
    print(f"calendar: {calendar_path}")
    print(f"dataset: {dataset}")
    print(f"schema: {schema}")
    print("\nroll reminders")
    print("instrument old_contract new_contract roll_date_et status write_eligible attention recommended_action note")
    today = datetime.now(ET).date()
    shown = 0
    for entry in entries:
        instrument = str(entry.get("instrument") or "").upper()
        old_contract = str(entry.get("old_contract") or "")
        new_contract = str(entry.get("new_contract") or "")
        roll_date = str(entry.get("roll_date_et") or "")
        status = str(entry.get("status") or "unknown")
        note = str(entry.get("note") or "").replace("\n", " ")
        attention = status in ATTENTION_STATUSES
        try:
            distance = abs((datetime.fromisoformat(roll_date).date() - today).days)
            attention = attention or distance <= max(0, args.attention_days)
        except ValueError:
            attention = True
        if not attention and is_write_eligible(status):
            continue
        shown += 1
        print(
            f"{instrument} {old_contract} {new_contract} {roll_date} {status} "
            f"{str(is_write_eligible(status)).lower()} {str(attention).lower()} "
            f"{recommended_action(status)} | {note}"
        )
    print(f"\nreported_entries: {shown}")
    print("report_mode: read-only")
    return 0


def validate_confirm_roll_args(args: argparse.Namespace) -> None:
    missing = [
        name for name, value in [
            ("--instrument", args.instrument),
            ("--old-contract", args.old_contract),
            ("--new-contract", args.new_contract),
            ("--confirmed-roll-date", args.confirmed_roll_date),
            ("--confirmed-status", args.confirmed_status),
            ("--confirmed-note", args.confirmed_note),
        ]
        if not value
    ]
    if missing:
        raise ValueError(f"missing required confirmation arguments: {', '.join(missing)}")
    try:
        datetime.fromisoformat(str(args.confirmed_roll_date)).date()
    except ValueError as exc:
        raise ValueError("--confirmed-roll-date must be an ISO date, e.g. 2026-03-16") from exc
    if args.write:
        raise ValueError(
            "legacy roll-calendar writes are disabled; use the V7 Contract Roll v2 "
            "Scan -> Preview -> typed Commit workflow"
        )
    if "\n" in str(args.confirmed_note):
        raise ValueError("--confirmed-note must be a single line")


def apply_roll_confirmation(data: dict[str, object], args: argparse.Namespace) -> dict[str, object]:
    rolls = data["rolls"]
    assert isinstance(rolls, list)
    matches = [
        entry for entry in rolls
        if isinstance(entry, dict)
        and str(entry.get("instrument") or "").upper() == args.instrument
        and str(entry.get("old_contract") or "") == args.old_contract
        and str(entry.get("new_contract") or "") == args.new_contract
    ]
    if len(matches) != 1:
        raise ValueError(
            "expected exactly one roll calendar entry for "
            f"{args.instrument} {args.old_contract}->{args.new_contract}, found {len(matches)}"
        )
    entry = matches[0]
    entry["roll_date_et"] = str(args.confirmed_roll_date)
    entry["status"] = str(args.confirmed_status)
    entry["note"] = str(args.confirmed_note)
    return data


def find_roll_entry_line_span(lines: list[str], args: argparse.Namespace) -> tuple[int, int]:
    start = None
    for index, line in enumerate(lines):
        if line.strip() == f"- instrument: {args.instrument}":
            start = index
            end = len(lines)
            for next_index in range(index + 1, len(lines)):
                if lines[next_index].startswith("  - instrument: "):
                    end = next_index
                    break
            block = "\n".join(lines[start:end])
            if (
                f"old_contract: {args.old_contract}" in block
                and f"new_contract: {args.new_contract}" in block
            ):
                return start, end
    raise ValueError(
        "could not locate roll calendar text block for "
        f"{args.instrument} {args.old_contract}->{args.new_contract}"
    )


def replace_entry_field(block: list[str], key: str, value: str) -> list[str]:
    replacement = f"    {key}: {format_yaml_scalar(value)}"
    for index, line in enumerate(block):
        if line.startswith(f"    {key}:"):
            return [*block[:index], replacement, *block[index + 1:]]
    return [*block, replacement]


def format_yaml_scalar(value: str) -> str:
    text = str(value)
    needs_quotes = (
        not text
        or text != text.strip()
        or ": " in text
        or " #" in text
        or text[0] in {"@", "`", "&", "*", "!", "|", ">", "{", "}", "[", "]", ",", "%"}
        or text.lower() in {"null", "true", "false", "yes", "no", "on", "off"}
    )
    if not needs_quotes:
        return text
    return "'" + text.replace("'", "''") + "'"


def apply_roll_confirmation_text(old_text: str, args: argparse.Namespace) -> str:
    lines = old_text.splitlines()
    start, end = find_roll_entry_line_span(lines, args)
    block = lines[start:end]
    block = replace_entry_field(block, "roll_date_et", str(args.confirmed_roll_date))
    block = replace_entry_field(block, "status", str(args.confirmed_status))
    block = replace_entry_field(block, "note", str(args.confirmed_note))
    suffix = "\n" if old_text.endswith("\n") else ""
    return "\n".join([*lines[:start], *block, *lines[end:]]) + suffix


def print_or_write_roll_confirmation(args: argparse.Namespace) -> int:
    validate_confirm_roll_args(args)
    calendar_path = Path(args.roll_calendar).expanduser().resolve()
    old_text = calendar_path.read_text(encoding="utf-8")
    data = load_roll_calendar_data(calendar_path)
    apply_roll_confirmation(data, args)
    new_text = apply_roll_confirmation_text(old_text, args)
    print("roll_confirmation_status: ok")
    print(f"calendar: {calendar_path}")
    print(f"instrument: {args.instrument}")
    print(f"old_contract: {args.old_contract}")
    print(f"new_contract: {args.new_contract}")
    print(f"confirmed_roll_date: {args.confirmed_roll_date}")
    print(f"confirmed_status: {args.confirmed_status}")
    if old_text == new_text:
        print("change_status: no-op")
    else:
        print("change_status: pending")
    if args.write:
        calendar_path.write_text(new_text, encoding="utf-8")
        print("write_status: written")
        return 0
    print("write_status: preview-only")
    print("\npatch preview")
    diff = difflib.unified_diff(
        old_text.splitlines(),
        new_text.splitlines(),
        fromfile=str(calendar_path),
        tofile=str(calendar_path),
        lineterm="",
    )
    for line in diff:
        print(line)
    return 0


def main() -> int:
    args = parse_args()
    if args.report_calendar:
        try:
            return print_calendar_report(args)
        except Exception as exc:
            print("roll_calendar_report_status: failed")
            print(f"error: {exc}")
            return 1
    if args.confirm_roll:
        try:
            return print_or_write_roll_confirmation(args)
        except Exception as exc:
            print("roll_confirmation_status: failed")
            print(f"error: {exc}")
            return 1
    try:
        validate_scan_args(args)
        if args.source_file:
            rows = read_source_file(Path(args.source_file).expanduser().resolve(), args.old_contract, args.new_contract)
        else:
            rows = download_databento_rows(args)
        daily = aggregate_daily_volume(
            rows, args.old_contract, args.new_contract, max(0, args.min_session_minutes)
        )
    except Exception as exc:
        print("scan_status: failed")
        print(f"error: {exc}")
        return 1

    print("scan_status: ok")
    print(f"source: {args.source_file or f'{args.dataset}/{args.schema}'}")
    print_daily_table(daily, args.old_contract, args.new_contract, args.show_empty_days)
    print_summary(args, daily)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
