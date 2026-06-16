#!/usr/bin/env python3
"""Convert Tradovate Performance CSV rows into V4 Live Record review JSON."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


REVIEW_ARCHIVE_APP = "trading-v4-review"
REVIEW_ARCHIVE_VERSION = 1
DEFAULT_TIMEFRAME = "1M"
TRADOVATE_TIME_FORMAT = "%m/%d/%Y %H:%M:%S"


REQUIRED_COLUMNS = {
    "symbol",
    "buyFillId",
    "sellFillId",
    "qty",
    "buyPrice",
    "sellPrice",
    "pnl",
    "boughtTimestamp",
    "soldTimestamp",
    "duration",
}


@dataclass(frozen=True)
class ConvertResult:
    payload: dict
    imported_rows: int
    skipped_rows: int
    total_pnl: float
    wins: int
    losses: int
    breakeven: int


def parse_money(value: str) -> float:
    text = str(value or "").strip().replace("$", "").replace(",", "")
    if not text:
        raise ValueError("empty money value")
    negative = text.startswith("(") and text.endswith(")")
    text = text.strip("()")
    number = float(text)
    return -number if negative else number


def parse_float(value: str, field: str) -> float:
    try:
        return float(str(value or "").replace(",", "").strip())
    except ValueError as exc:
        raise ValueError(f"invalid {field}: {value!r}") from exc


def parse_timestamp(value: str, timezone_name: str) -> int:
    zone = ZoneInfo(timezone_name)
    parsed = datetime.strptime(str(value or "").strip(), TRADOVATE_TIME_FORMAT)
    return int(parsed.replace(tzinfo=zone).timestamp())


def contract_root(symbol: str) -> str:
    text = str(symbol or "").strip().upper()
    for root in ("MNQ", "MES", "NQ", "ES"):
        if text.startswith(root):
            return root
    match = re.match(r"^([A-Z]+)", text)
    return match.group(1) if match else ""


def map_symbol_to_instrument(symbol: str) -> str:
    root = contract_root(symbol)
    if root in {"NQ", "MNQ"}:
        return "NQ"
    if root in {"ES", "MES"}:
        return "ES"
    return root


def stable_record_id(row: dict, instrument: str) -> str:
    parts = [
        "tradovate",
        instrument,
        row.get("symbol", ""),
        row.get("buyFillId", ""),
        row.get("sellFillId", ""),
        row.get("boughtTimestamp", ""),
        row.get("soldTimestamp", ""),
        row.get("buyPrice", ""),
        row.get("sellPrice", ""),
    ]
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"live_record_tradovate_{digest}"


def result_status(pnl: float) -> str:
    if pnl > 0:
        return "win"
    if pnl < 0:
        return "loss"
    return "breakeven"


def exit_type(pnl: float) -> str:
    if pnl > 0:
        return "profit"
    if pnl < 0:
        return "stopLoss"
    return "unknown"


def build_imported_stop_loss(pnl: float, exit_ts: int, exit_price: float) -> dict:
    if pnl >= 0:
        return {}
    return {
        "id": "stopLoss",
        "role": "stopLoss",
        "label": "Stop Loss",
        "timestamp": exit_ts,
        "timeframe": DEFAULT_TIMEFRAME,
        "price": exit_price,
        "endTimestamp": exit_ts,
        "endTimeframe": DEFAULT_TIMEFRAME,
        "visible": True,
        "complete": True,
        "note": "Imported losing trade: exit used as stop loss.",
    }


def build_imported_targets(pnl: float, exit_ts: int, exit_price: float) -> list[dict]:
    if pnl <= 0:
        return []
    return [{
        "id": "targetInternal1",
        "role": "targetInternal1",
        "targetType": "internal",
        "label": "Target Internal 1",
        "timestamp": exit_ts,
        "timeframe": DEFAULT_TIMEFRAME,
        "price": exit_price,
        "endTimestamp": exit_ts,
        "endTimeframe": DEFAULT_TIMEFRAME,
        "visible": True,
        "complete": True,
        "note": "Imported winning trade: exit used as Target Internal 1.",
    }]


def format_pnl(pnl: float) -> str:
    sign = "-" if pnl < 0 else ""
    return f"{sign}${abs(pnl):.2f}"


def build_live_record(row: dict, *, instrument: str, timezone_name: str, now_ms: int) -> dict:
    buy_ts = parse_timestamp(row["boughtTimestamp"], timezone_name)
    sell_ts = parse_timestamp(row["soldTimestamp"], timezone_name)
    buy_price = parse_float(row["buyPrice"], "buyPrice")
    sell_price = parse_float(row["sellPrice"], "sellPrice")
    qty = parse_float(row["qty"], "qty")
    pnl = parse_money(row["pnl"])

    is_long = buy_ts <= sell_ts
    direction = "long" if is_long else "short"
    entry_ts = buy_ts if is_long else sell_ts
    exit_ts = sell_ts if is_long else buy_ts
    entry_price = buy_price if is_long else sell_price
    exit_price = sell_price if is_long else buy_price
    source_symbol = str(row.get("symbol", "")).strip()
    duration = str(row.get("duration", "")).strip()
    pnl_text = format_pnl(pnl)

    return {
        "version": 1,
        "id": stable_record_id(row, instrument),
        "instrument": instrument,
        "createdAt": now_ms,
        "updatedAt": now_ms,
        "status": "closed",
        "direction": direction,
        "orderSetupId": "",
        "summary": (
            f"Tradovate import: {source_symbol} {direction.title()} qty {qty:g}, "
            f"P/L {pnl_text}, duration {duration or 'unknown'}."
        ),
        "anchor": {
            "timestamp": entry_ts,
            "timeframe": DEFAULT_TIMEFRAME,
            "price": entry_price,
        },
        "execution": {
            "entry": {
                "id": "entry",
                "role": "entry",
                "label": "Entry",
                "timestamp": entry_ts,
                "timeframe": DEFAULT_TIMEFRAME,
                "price": entry_price,
                "endTimestamp": exit_ts,
                "endTimeframe": DEFAULT_TIMEFRAME,
                "visible": True,
                "complete": True,
                "note": f"Imported entry fill from Tradovate {source_symbol}.",
            },
            "marketStructureShift": {},
            "stopLoss": build_imported_stop_loss(pnl, exit_ts, exit_price),
            "targets": build_imported_targets(pnl, exit_ts, exit_price),
            "orders": [],
            "fills": [
                {
                    "id": str(row.get("buyFillId", "")).strip() or "buy_fill",
                    "timestamp": buy_ts,
                    "price": buy_price,
                    "quantity": qty,
                    "note": f"Tradovate buy fill for {source_symbol}.",
                },
                {
                    "id": str(row.get("sellFillId", "")).strip() or "sell_fill",
                    "timestamp": sell_ts,
                    "price": sell_price,
                    "quantity": qty,
                    "note": f"Tradovate sell fill for {source_symbol}.",
                },
            ],
        },
        "reasons": [{
            "id": "reason_1",
            "category": "execution",
            "note": "",
            "refs": [],
        }],
        "linkedObjectRefs": [],
        "result": {
            "status": result_status(pnl),
            "exitType": exit_type(pnl),
            "exitTimestamp": exit_ts,
            "exitTimeframe": DEFAULT_TIMEFRAME,
            "exitPrice": exit_price,
            "note": (
                f"Tradovate realized P/L {pnl_text}; qty {qty:g}; "
                f"buyFillId {row.get('buyFillId', '')}; sellFillId {row.get('sellFillId', '')}; "
                f"duration {duration or 'unknown'}."
            ),
            "executionReviewNote": "",
        },
        "display": {
            "hidden": False,
            "showRiskRewardBox": True,
            "elementVisibility": {},
        },
    }


def read_rows(path: Path) -> tuple[list[dict], list[str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        columns = reader.fieldnames or []
        missing = sorted(REQUIRED_COLUMNS.difference(columns))
        if missing:
            raise ValueError(f"missing required columns: {', '.join(missing)}")
        return list(reader), columns


def build_payload(
    csv_path: Path,
    *,
    instrument: str,
    timezone_name: str,
    now_ms: int,
) -> ConvertResult:
    rows, _columns = read_rows(csv_path)
    target_instrument = instrument.upper()
    records = []
    skipped_rows = 0
    total_pnl = 0.0
    wins = 0
    losses = 0
    breakeven = 0
    detected_instruments = {map_symbol_to_instrument(row.get("symbol", "")) for row in rows}
    detected_instruments.discard("")

    if target_instrument == "AUTO":
        if len(detected_instruments) != 1:
            raise ValueError(
                "auto instrument requires exactly one detected instrument; "
                f"detected {sorted(detected_instruments) or ['unknown']}. Use --instrument NQ or --instrument ES."
            )
        target_instrument = next(iter(detected_instruments))

    for row in rows:
        row_instrument = map_symbol_to_instrument(row.get("symbol", ""))
        if row_instrument != target_instrument:
            skipped_rows += 1
            continue
        record = build_live_record(
            row,
            instrument=target_instrument,
            timezone_name=timezone_name,
            now_ms=now_ms,
        )
        records.append(record)
        pnl = parse_money(row["pnl"])
        total_pnl += pnl
        if pnl > 0:
            wins += 1
        elif pnl < 0:
            losses += 1
        else:
            breakeven += 1

    payload = {
        "app": REVIEW_ARCHIVE_APP,
        "version": REVIEW_ARCHIVE_VERSION,
        "exportedAt": datetime.now(ZoneInfo("UTC")).isoformat().replace("+00:00", "Z"),
        "instrument": target_instrument,
        "timeframe": DEFAULT_TIMEFRAME,
        "range": {},
        "pdaAnnotations": [],
        "marketSegments": [],
        "segmentGroups": [],
        "smtRecords": [],
        "orderReviews": [],
        "liveRecords": records,
        "dailyTimeReviews": [],
        "chartNotes": [],
        "dailyRegimes": [],
        "source": {
            "type": "tradovate-performance-csv",
            "path": str(csv_path),
            "timezone": timezone_name,
            "rowCount": len(rows),
            "skippedRows": skipped_rows,
        },
    }

    return ConvertResult(
        payload=payload,
        imported_rows=len(records),
        skipped_rows=skipped_rows,
        total_pnl=total_pnl,
        wins=wins,
        losses=losses,
        breakeven=breakeven,
    )


def print_summary(result: ConvertResult, *, output: Path | None, dry_run: bool) -> None:
    print("Tradovate Performance CSV -> V4 Live Records")
    print("------------------------------------------------")
    print(f"instrument: {result.payload['instrument']}")
    print(f"timezone: {result.payload['source']['timezone']}")
    print(f"source_rows: {result.payload['source']['rowCount']}")
    print(f"live_records: {result.imported_rows}")
    print(f"skipped_rows: {result.skipped_rows}")
    print(f"wins: {result.wins}")
    print(f"losses: {result.losses}")
    print(f"breakeven: {result.breakeven}")
    print(f"total_pnl: {format_pnl(result.total_pnl)}")
    if dry_run:
        print("write_status: dry-run; no JSON file was written")
    else:
        print(f"write_status: wrote review JSON to {output}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Tradovate Performance CSV path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output V4 Review JSON path. Required unless --dry-run is used.",
    )
    parser.add_argument(
        "--instrument",
        default="auto",
        choices=["auto", "NQ", "ES"],
        help="Target V4 instrument. auto requires all rows to map to one instrument.",
    )
    parser.add_argument(
        "--timezone",
        default="UTC",
        help=(
            "Timezone used by Tradovate timestamps. Default UTC preserves V4 chart wall-clock time; "
            "use America/New_York only when you need true UTC instants."
        ),
    )
    parser.add_argument("--dry-run", action="store_true", help="Print import summary without writing JSON")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if not args.csv.exists():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1
    if not args.dry_run and not args.output:
        print("--output is required unless --dry-run is used", file=sys.stderr)
        return 1

    now_ms = int(datetime.now(ZoneInfo("UTC")).timestamp() * 1000)
    try:
        result = build_payload(
            args.csv,
            instrument=args.instrument,
            timezone_name=args.timezone,
            now_ms=now_ms,
        )
    except Exception as exc:
        print(f"conversion failed: {exc}", file=sys.stderr)
        return 1

    if not args.dry_run:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result.payload, indent=2) + "\n", encoding="utf-8")

    print_summary(result, output=args.output, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
