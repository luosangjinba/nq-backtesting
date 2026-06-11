#!/usr/bin/env python3
"""Read-only audit for Databento dry-run updater results.

This script checks two things before write mode is considered:

1. Databento dataset condition for dates that produced degraded warnings.
2. NQ inferred roll entries by comparing old/new raw contract rows and volume
   around each roll date.

It never writes to DuckDB.
"""

from __future__ import annotations

import argparse
import warnings
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import yaml

try:
    import databento as db
except ImportError as exc:  # pragma: no cover - exercised by CLI environment
    raise SystemExit("Missing dependency: databento. Install with `python3 -m pip install databento`.") from exc


warnings.simplefilter("ignore", ResourceWarning)

V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROLL_CALENDAR = V4_ROOT / "data_config" / "futures_roll_calendar.yml"
ET = ZoneInfo("America/New_York")
DEFAULT_WARNING_DATES = (
    "2025-11-28",
    "2026-03-15",
    "2026-03-16",
    "2026-04-10",
    "2026-05-24",
)


@dataclass(frozen=True)
class RollEntry:
    instrument: str
    old_contract: str
    new_contract: str
    roll_date_et: date
    status: str
    note: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit Databento dry-run warnings and inferred roll entries.")
    parser.add_argument("--roll-calendar", default=str(DEFAULT_ROLL_CALENDAR), help="Roll calendar YAML path.")
    parser.add_argument("--dataset", help="Override Databento dataset from roll calendar.")
    parser.add_argument("--schema", help="Override Databento schema from roll calendar.")
    parser.add_argument(
        "--condition-date",
        action="append",
        default=[],
        help="Dataset condition date YYYY-MM-DD. Defaults to known dry-run warning dates.",
    )
    parser.add_argument("--roll-days-before", type=int, default=5, help="Days before inferred roll date to inspect.")
    parser.add_argument("--roll-days-after", type=int, default=4, help="Days after inferred roll date to inspect.")
    return parser.parse_args()


def load_roll_calendar(path: Path) -> tuple[str, str, list[RollEntry]]:
    data = yaml.safe_load(path.read_text())
    dataset = str(data.get("dataset") or "GLBX.MDP3")
    schema = str(data.get("schema") or "ohlcv-1m")
    entries: list[RollEntry] = []
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


def print_dataset_conditions(client: db.Historical, dataset: str, dates: list[str]) -> None:
    print("dataset conditions")
    for day_text in dates:
        day = date.fromisoformat(day_text)
        end_day = day + timedelta(days=1)
        rows = client.metadata.get_dataset_condition(dataset=dataset, start_date=day.isoformat(), end_date=end_day.isoformat())
        print(f"\n{day_text}")
        if not rows:
            print("  no condition rows returned")
            continue
        for row in rows:
            print("  " + ", ".join(f"{key}={value}" for key, value in row.items()))


def download_roll_pair(client: db.Historical, dataset: str, schema: str, entry: RollEntry, start_day: date, end_day: date) -> pd.DataFrame:
    start_dt = datetime.combine(start_day, datetime.min.time(), tzinfo=ET)
    end_dt = datetime.combine(end_day, datetime.min.time(), tzinfo=ET)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        data = client.timeseries.get_range(
            dataset=dataset,
            symbols=[entry.old_contract, entry.new_contract],
            schema=schema,
            start=start_dt.astimezone(ZoneInfo("UTC")).isoformat(),
            end=end_dt.astimezone(ZoneInfo("UTC")).isoformat(),
            stype_in="raw_symbol",
        )
    for warning in caught:
        print(f"  warning: {warning.message}")
    raw = data.to_df()
    if raw.empty:
        return pd.DataFrame(columns=["date", "symbol", "rows", "volume"])
    index = raw.index
    if index.tz is None:
        localized = index.tz_localize("UTC").tz_convert(ET)
    else:
        localized = index.tz_convert(ET)
    frame = pd.DataFrame({
        "date": localized.date,
        "symbol": raw["symbol"].astype(str),
        "volume": pd.to_numeric(raw["volume"], errors="coerce").fillna(0),
    })
    return frame.groupby(["date", "symbol"], as_index=False).agg(rows=("volume", "size"), volume=("volume", "sum"))


def print_inferred_roll_audit(client: db.Historical, dataset: str, schema: str, entries: list[RollEntry], days_before: int, days_after: int) -> None:
    print("\ninferred roll volume audit")
    inferred = [entry for entry in entries if entry.status.startswith("inferred")]
    if not inferred:
        print("no inferred_no_db_overlap entries")
        return
    for entry in inferred:
        start_day = entry.roll_date_et - timedelta(days=days_before)
        end_day = entry.roll_date_et + timedelta(days=days_after)
        print(
            f"\n{entry.instrument} {entry.old_contract}->{entry.new_contract} "
            f"roll_date_et={entry.roll_date_et} status={entry.status}"
        )
        print(f"note: {entry.note}")
        summary = download_roll_pair(client, dataset, schema, entry, start_day, end_day)
        if summary.empty:
            print("  no rows returned")
            continue
        pivot = summary.pivot(index="date", columns="symbol", values=["rows", "volume"]).fillna(0)
        print(pivot.to_string())


def main() -> None:
    args = parse_args()
    calendar_path = Path(args.roll_calendar).expanduser().resolve()
    if not calendar_path.exists():
        raise SystemExit(f"roll calendar not found: {calendar_path}")
    calendar_dataset, calendar_schema, entries = load_roll_calendar(calendar_path)
    dataset = args.dataset or calendar_dataset
    schema = args.schema or calendar_schema
    condition_dates = args.condition_date or list(DEFAULT_WARNING_DATES)
    client = db.Historical()

    print(f"dataset: {dataset}")
    print(f"schema: {schema}")
    print_dataset_conditions(client, dataset, sorted(set(condition_dates)))
    print_inferred_roll_audit(client, dataset, schema, entries, args.roll_days_before, args.roll_days_after)
    print("\naudit_status: read-only; no DB changes were made")


if __name__ == "__main__":
    main()
