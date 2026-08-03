#!/usr/bin/env python3
"""Offline tests for NQ Databento full-chain attribution helpers."""

from __future__ import annotations

import unittest

import pandas as pd

from v4.server import nq_databento_chain_audit as audit


def bars(start: str, prices: list[float]) -> pd.DataFrame:
    return pd.DataFrame({
        "ts": pd.date_range(start, periods=len(prices), freq="min"),
        "open": prices,
        "high": [price + 2 for price in prices],
        "low": [price - 2 for price in prices],
        "close": [price + 1 for price in prices],
        "volume": list(range(1, len(prices) + 1)),
    })


class NqDatabentoChainAuditTests(unittest.TestCase):
    def test_inferred_boundary_inside_untraded_gap_is_retained(self) -> None:
        old = bars("2020-03-15 17:58", [100, 101])
        new = bars("2020-03-15 18:01", [200, 201])
        local = pd.concat([old, new], ignore_index=True)

        result = audit.derive_source_boundary(
            local, old, new, inferred_boundary_et="2020-03-15T18:00"
        )

        self.assertEqual(result.current_boundary_et, "2020-03-15T18:00")
        self.assertEqual(result.boundary_basis, "inferred_boundary_inside_exact_match_gap")

    def test_wrong_inferred_boundary_uses_first_exact_new_match(self) -> None:
        old = bars("2010-06-13 23:44", [100, 101])
        new = bars("2010-06-14 00:00", [200, 201])
        local = pd.concat([old, new], ignore_index=True)

        result = audit.derive_source_boundary(
            local, old, new, inferred_boundary_et="2010-06-13T18:00"
        )

        self.assertEqual(result.current_boundary_et, "2010-06-14T00:00")
        self.assertEqual(result.boundary_basis, "first_exact_new_contract_match")

    def test_interleaved_source_matches_are_rejected(self) -> None:
        old = bars("2021-01-01 00:00", [100, 101])
        old.loc[1, "ts"] = pd.Timestamp("2021-01-01 00:02")
        new = bars("2021-01-01 00:01", [200, 201])
        new.loc[0, "ts"] = pd.Timestamp("2021-01-01 00:01")
        new.loc[1, "ts"] = pd.Timestamp("2021-01-01 00:03")
        local = pd.concat([old, new], ignore_index=True).sort_values("ts").reset_index(drop=True)

        with self.assertRaisesRegex(ValueError, "interleaves"):
            audit.derive_source_boundary(
                local, old, new, inferred_boundary_et="2021-01-01T00:02"
            )

    def test_repair_direction_selects_the_leg_required_by_target_policy(self) -> None:
        earlier = audit.repair_interval_for_boundaries(
            current_boundary_et="2025-03-16T18:00",
            target_boundary_et="2025-03-14T18:00",
            old_contract="NQH5",
            new_contract="NQM5",
        )
        later = audit.repair_interval_for_boundaries(
            current_boundary_et="2025-03-16T18:00",
            target_boundary_et="2025-03-19T18:00",
            old_contract="NQH5",
            new_contract="NQM5",
        )

        self.assertEqual(earlier.source_contract, "NQM5")
        self.assertEqual(earlier.direction, "databento_earlier")
        self.assertEqual(later.source_contract, "NQH5")
        self.assertEqual(later.direction, "databento_later")

    def test_aligned_boundaries_require_no_repair(self) -> None:
        self.assertIsNone(audit.repair_interval_for_boundaries(
            current_boundary_et="2025-03-16T18:00",
            target_boundary_et="2025-03-16T18:00",
            old_contract="NQH5",
            new_contract="NQM5",
        ))


if __name__ == "__main__":
    unittest.main(verbosity=2)
