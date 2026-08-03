#!/usr/bin/env python3
"""Offline tests for Databento full-chain mapping normalization."""

from __future__ import annotations

import importlib.util
import unittest
from datetime import datetime
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "build_databento_full_chain_diff.py"
SPEC = importlib.util.spec_from_file_location("build_databento_full_chain_diff", SCRIPT)
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class FakeSymbology:
    def resolve(self, **_kwargs):
        return {
            "status": 1,
            "not_found": [],
            "partial": ["10", "20"],
            "result": {
                "10": [{"d0": "2010-06-04", "d1": "2010-06-14", "s": "ESM0"}],
                "20": [{"d0": "2010-06-14", "d1": "2010-09-13", "s": "ESU0"}],
            },
        }


class FakeClient:
    symbology = FakeSymbology()


class DatabentoFullChainDiffTests(unittest.TestCase):
    def test_partial_raw_contract_lifetime_is_accepted_when_overlap_is_unique(self) -> None:
        rows = [
            {"d0": "2010-06-04", "d1": "2010-06-14", "s": "10"},
            {"d0": "2010-06-14", "d1": "2010-09-13", "s": "20"},
        ]

        resolved = builder._resolve_raw_symbols(
            FakeClient(), rows, "2010-06-06", "2010-09-13"
        )

        self.assertEqual(resolved, {"10": "ESM0", "20": "ESU0"})

    def test_target_boundary_is_prior_natural_date_session_open(self) -> None:
        self.assertEqual(
            builder._target_boundary("2026-03-18"),
            datetime(2026, 3, 17, 18, 0),
        )

    def test_transition_window_uses_expiring_contract_quarter(self) -> None:
        self.assertEqual(
            builder._transition_window(
                {"rawSymbol": "ESZ9"},
                {"rawSymbol": "ESH0", "d0": "2019-12-16"},
            ),
            (2019, 4),
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
