#!/usr/bin/env python3
"""Offline tests for the Tradovate Performance CSV Live Record converter."""

from __future__ import annotations

import csv
import importlib.util
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


REPO_ROOT = Path(__file__).resolve().parents[2]
IMPORTER = REPO_ROOT / "v4" / "scripts" / "tradovate_performance_to_live_records.py"


def load_importer():
    spec = importlib.util.spec_from_file_location("tradovate_live_record_importer", IMPORTER)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_csv(path: Path, rows: list[dict]) -> None:
    fieldnames = [
        "symbol",
        "_priceFormat",
        "_priceFormatType",
        "_tickSize",
        "buyFillId",
        "sellFillId",
        "qty",
        "buyPrice",
        "sellPrice",
        "pnl",
        "boughtTimestamp",
        "soldTimestamp",
        "duration",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


class TradovateLiveRecordImporterTests(unittest.TestCase):
    def test_parse_money_handles_accounting_negatives(self) -> None:
        importer = load_importer()

        self.assertEqual(importer.parse_money("$54.00"), 54.0)
        self.assertEqual(importer.parse_money("$(16.50)"), -16.5)

    def test_convert_long_trade_to_closed_live_record(self) -> None:
        importer = load_importer()
        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "Performance.csv"
            write_csv(csv_path, [{
                "symbol": "MNQM6",
                "_priceFormat": "-2",
                "_priceFormatType": "0",
                "_tickSize": "0.25",
                "buyFillId": "524699600302",
                "sellFillId": "524699600331",
                "qty": "4",
                "buyPrice": "29320.00",
                "sellPrice": "29291.75",
                "pnl": "$(226.00)",
                "boughtTimestamp": "06/12/2026 09:49:42",
                "soldTimestamp": "06/12/2026 09:50:11",
                "duration": "29sec",
            }])

            result = importer.build_payload(
                csv_path,
                instrument="auto",
                timezone_name="UTC",
                now_ms=1234567890,
            )

        expected_entry_ts = int(datetime(2026, 6, 12, 9, 49, 42, tzinfo=ZoneInfo("UTC")).timestamp())
        expected_exit_ts = int(datetime(2026, 6, 12, 9, 50, 11, tzinfo=ZoneInfo("UTC")).timestamp())
        record = result.payload["liveRecords"][0]

        self.assertEqual(result.imported_rows, 1)
        self.assertEqual(result.total_pnl, -226.0)
        self.assertEqual(result.losses, 1)
        self.assertEqual(result.payload["instrument"], "NQ")
        self.assertEqual(record["instrument"], "NQ")
        self.assertEqual(record["status"], "closed")
        self.assertEqual(record["direction"], "long")
        self.assertEqual(record["anchor"]["timestamp"], expected_entry_ts)
        self.assertEqual(record["execution"]["entry"]["price"], 29320.0)
        self.assertEqual(record["execution"]["entry"]["endTimestamp"], expected_exit_ts)
        self.assertEqual(record["result"]["status"], "loss")
        self.assertEqual(record["result"]["exitPrice"], 29291.75)
        self.assertEqual(record["result"]["exitType"], "stopLoss")
        self.assertEqual(record["execution"]["stopLoss"]["price"], 29291.75)
        self.assertEqual(record["execution"]["targets"], [])
        self.assertIn("P/L -$226.00", record["summary"])
        self.assertEqual(record["execution"]["fills"][0]["id"], "524699600302")
        self.assertEqual(record["execution"]["fills"][1]["id"], "524699600331")

    def test_convert_short_trade_uses_sell_as_entry(self) -> None:
        importer = load_importer()
        row = {
            "symbol": "MESM6",
            "buyFillId": "buy-close",
            "sellFillId": "sell-open",
            "qty": "1",
            "buyPrice": "6000.25",
            "sellPrice": "6010.25",
            "pnl": "$50.00",
            "boughtTimestamp": "06/12/2026 10:02:00",
            "soldTimestamp": "06/12/2026 10:00:00",
            "duration": "2min",
        }

        record = importer.build_live_record(
            row,
            instrument="ES",
            timezone_name="UTC",
            now_ms=1000,
        )

        self.assertEqual(record["direction"], "short")
        self.assertEqual(record["execution"]["entry"]["price"], 6010.25)
        self.assertEqual(record["result"]["exitPrice"], 6000.25)
        self.assertEqual(record["result"]["status"], "win")
        self.assertEqual(record["result"]["exitType"], "profit")
        self.assertEqual(record["execution"]["targets"][0]["role"], "targetInternal1")
        self.assertEqual(record["execution"]["targets"][0]["price"], 6000.25)

    def test_auto_instrument_rejects_mixed_csv(self) -> None:
        importer = load_importer()
        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "mixed.csv"
            base = {
                "_priceFormat": "-2",
                "_priceFormatType": "0",
                "_tickSize": "0.25",
                "buyFillId": "1",
                "sellFillId": "2",
                "qty": "1",
                "buyPrice": "1",
                "sellPrice": "2",
                "pnl": "$1.00",
                "boughtTimestamp": "06/12/2026 09:49:42",
                "soldTimestamp": "06/12/2026 09:50:11",
                "duration": "29sec",
            }
            write_csv(csv_path, [{**base, "symbol": "MNQM6"}, {**base, "symbol": "MESM6"}])

            with self.assertRaisesRegex(ValueError, "exactly one detected instrument"):
                importer.build_payload(
                    csv_path,
                    instrument="auto",
                    timezone_name="UTC",
                    now_ms=123,
                )

            filtered = importer.build_payload(
                csv_path,
                instrument="NQ",
                timezone_name="UTC",
                now_ms=123,
            )

        self.assertEqual(filtered.imported_rows, 1)
        self.assertEqual(filtered.skipped_rows, 1)


if __name__ == "__main__":
    unittest.main()
