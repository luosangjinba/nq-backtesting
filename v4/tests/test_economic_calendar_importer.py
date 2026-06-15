#!/usr/bin/env python3
"""Offline tests for the V4 economic calendar importer."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import date
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
IMPORTER = REPO_ROOT / "v4" / "scripts" / "update_economic_calendar.py"


def load_importer():
    spec = importlib.util.spec_from_file_location("update_economic_calendar", IMPORTER)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class EconomicCalendarImporterTests(unittest.TestCase):
    def test_parse_year_month_selector_for_forex_factory_url(self) -> None:
        importer = load_importer()

        selector = importer.parse_month_selector("2025-01")

        self.assertEqual(selector.slug, "2025-01")
        self.assertEqual(selector.display_name, "January 2025")
        self.assertEqual(selector.forex_factory_selector, "jan.2025")

    def test_parse_this_and_next_relative_to_today(self) -> None:
        importer = load_importer()

        this_month = importer.parse_month_selector("this", today=date(2026, 6, 15))
        next_month = importer.parse_month_selector("next", today=date(2026, 12, 15))

        self.assertEqual(this_month.slug, "2026-06")
        self.assertEqual(this_month.forex_factory_selector, "jun.2026")
        self.assertEqual(next_month.slug, "2027-01")
        self.assertEqual(next_month.forex_factory_selector, "jan.2027")

    def test_iter_month_selectors_covers_inclusive_range(self) -> None:
        importer = load_importer()

        selectors = importer.iter_month_selectors(date(2025, 11, 30), date(2026, 2, 1))

        self.assertEqual([selector.slug for selector in selectors], [
            "2025-11",
            "2025-12",
            "2026-01",
            "2026-02",
        ])
        self.assertEqual(selectors[-1].forex_factory_selector, "feb.2026")

    def test_invalid_month_selector_fails_readably(self) -> None:
        importer = load_importer()

        with self.assertRaisesRegex(ValueError, "expected YYYY-MM"):
            importer.parse_month_selector("January")
        with self.assertRaisesRegex(ValueError, "month must be 01-12"):
            importer.parse_month_selector("2025-13")


if __name__ == "__main__":
    unittest.main()
