#!/usr/bin/env python3
"""Preview, commit, or verify the audited 2025 NQ historical roll repair."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from v4.server import historical_roll_repair_service as repair_service

try:
    import databento as db
except ImportError:  # pragma: no cover - verify mode does not need Databento
    db = None


V4_ROOT = Path(__file__).resolve().parents[1]
ET = ZoneInfo("America/New_York")
UTC = timezone.utc
DEFAULT_DB = Path("/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb")
DEFAULT_CALENDAR = V4_ROOT / "data_config" / "futures_roll_calendar.yml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Guarded NQ 2025 historical roll repair.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Authoritative DuckDB path.")
    parser.add_argument("--calendar", default=str(DEFAULT_CALENDAR), help="Roll calendar path.")
    parser.add_argument("--repair-root", default=str(repair_service.default_repair_root()), help="Staging/backup/audit root.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--commit", action="store_true", help="Commit a retained preview.")
    mode.add_argument("--verify", action="store_true", help="Verify the committed database and calendar.")
    parser.add_argument("--preview-token", help="Retained preview token required by --commit.")
    parser.add_argument("--confirm-text", help="Exact confirmation required by --commit.")
    return parser.parse_args()


def et_to_utc_iso(value: str) -> str:
    parsed = datetime.fromisoformat(value).replace(tzinfo=ET)
    return parsed.astimezone(UTC).isoformat()


def normalize_download(raw: pd.DataFrame, source_contract: str) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=[*repair_service.BAR_COLUMNS, "source_contract"])
    index = raw.index
    localized = index.tz_localize("UTC").tz_convert(ET) if index.tz is None else index.tz_convert(ET)
    rows = pd.DataFrame({
        "ts": localized.tz_localize(None),
        "open": pd.to_numeric(raw["open"], errors="raise"),
        "high": pd.to_numeric(raw["high"], errors="raise"),
        "low": pd.to_numeric(raw["low"], errors="raise"),
        "close": pd.to_numeric(raw["close"], errors="raise"),
        "volume": pd.to_numeric(raw["volume"], errors="raise").astype("int64"),
        "source_contract": source_contract,
    })
    if "symbol" in raw.columns:
        symbols = set(raw["symbol"].astype(str))
        if symbols != {source_contract}:
            raise ValueError(f"unexpected Databento symbols for {source_contract}: {sorted(symbols)}")
    return rows.sort_values("ts").drop_duplicates("ts", keep="last").reset_index(drop=True)


def download_preview_inputs() -> tuple[
    dict[str, pd.DataFrame],
    dict[str, list[dict[str, str | None]]],
]:
    if db is None:
        raise SystemExit("Missing dependency: databento")
    client = db.Historical()
    replacements = {}
    conditions = {}
    for spec in repair_service.REPAIR_SPECS:
        start_utc = datetime.fromisoformat(spec.start_et).replace(tzinfo=ET).astimezone(UTC)
        end_utc = datetime.fromisoformat(spec.end_et).replace(tzinfo=ET).astimezone(UTC)
        condition_rows = client.metadata.get_dataset_condition(
            dataset=repair_service.DATASET,
            start_date=start_utc.date().isoformat(),
            end_date=end_utc.date().isoformat(),
        )
        data = client.timeseries.get_range(
            dataset=repair_service.DATASET,
            schema=repair_service.SCHEMA,
            symbols=[spec.source_contract],
            stype_in="raw_symbol",
            start=et_to_utc_iso(spec.start_et),
            end=et_to_utc_iso(spec.end_et),
        )
        replacements[spec.repair_id] = normalize_download(data.to_df(), spec.source_contract)
        conditions[spec.repair_id] = condition_rows
    return replacements, conditions


def main() -> int:
    args = parse_args()
    database = Path(args.db).expanduser().resolve()
    calendar = Path(args.calendar).expanduser().resolve()
    repair_root = Path(args.repair_root).expanduser().resolve()
    if args.verify:
        result = repair_service.verify_repair(database, calendar)
    elif args.commit:
        if not args.preview_token:
            raise ValueError("--commit requires --preview-token")
        result = repair_service.commit_preview(
            args.preview_token,
            args.confirm_text or "",
            repair_root=repair_root,
        )
    else:
        replacements, conditions = download_preview_inputs()
        result = repair_service.create_preview(
            database,
            calendar,
            replacements,
            conditions,
            repair_root=repair_root,
        )
    print(result.get("output") or json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("historical_roll_repair_status: failed")
        print(f"error: {exc}")
        raise SystemExit(1)
