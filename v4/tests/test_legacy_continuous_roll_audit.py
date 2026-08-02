#!/usr/bin/env python3
"""Offline tests for the legacy continuous roll risk prescreen."""

from __future__ import annotations

import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path

from v4.server import legacy_continuous_roll_audit as service


class LegacyContinuousRollAuditTests(unittest.TestCase):
    def test_classify_risk_requires_both_severe_signals_for_red(self) -> None:
        self.assertEqual(service.classify_risk(0.95, 0.30)[0], "red")
        self.assertEqual(service.classify_risk(1.00, 0.30)[0], "amber")
        self.assertEqual(service.classify_risk(0.96, 0.80)[0], "amber")
        self.assertEqual(service.classify_risk(1.00, 0.80)[0], "green")

    def test_midnight_contiguous_seam_can_outrank_session_open_gap(self) -> None:
        candidates = [
            service.SeamCandidate(
                ts=datetime(2024, 3, 14, 0, 1),
                previous_ts=datetime(2024, 3, 13, 23, 59),
                price_gap=50.0,
                typical_gap=0.25,
                kind="midnight_contiguous",
            ),
            service.SeamCandidate(
                ts=datetime(2024, 3, 10, 18, 0),
                previous_ts=datetime(2024, 3, 8, 16, 59),
                price_gap=100.0,
                typical_gap=0.25,
                kind="session_open",
            ),
        ]

        seam = service.infer_seam(candidates)

        self.assertIsNotNone(seam)
        assert seam is not None
        self.assertEqual(seam.ts, datetime(2024, 3, 14, 0, 1))
        self.assertEqual(seam.confidence, "high")

    def test_quarter_audit_uses_relative_session_liquidity(self) -> None:
        expiry = service.third_friday(2024, 3)
        window = service.build_windows(2024, 2024)[0]
        sessions = {}
        cursor = expiry - timedelta(days=35)
        while cursor <= expiry:
            if cursor.weekday() < 5:
                sessions[cursor] = service.SessionEvidence(cursor, 100, 1000)
            cursor += timedelta(days=1)
        weak_date = expiry - timedelta(days=2)
        sessions[weak_date] = service.SessionEvidence(weak_date, 94, 200)

        result = service.build_quarter_audit(window, sessions, None)

        self.assertEqual(result.risk, "red")
        self.assertTrue(result.requires_raw_contract_review)
        self.assertEqual(result.weakest_trade_date, weak_date)
        self.assertAlmostEqual(result.bar_ratio or 0, 0.94)
        self.assertAlmostEqual(result.volume_ratio or 0, 0.20)

    def test_quarter_audit_ignores_weak_sessions_before_and_long_after_seam(self) -> None:
        expiry = service.third_friday(2024, 6)
        window = service.build_windows(2024, 2024)[1]
        sessions = {}
        cursor = expiry - timedelta(days=35)
        while cursor <= expiry:
            if cursor.weekday() < 5:
                sessions[cursor] = service.SessionEvidence(cursor, 100, 1000)
            cursor += timedelta(days=1)
        seam_date = expiry - timedelta(days=7)
        sessions[seam_date - timedelta(days=1)] = service.SessionEvidence(
            seam_date - timedelta(days=1), 50, 100
        )
        sessions[seam_date + timedelta(days=5)] = service.SessionEvidence(
            seam_date + timedelta(days=5), 50, 100
        )
        seam = service.SeamEvidence(
            ts=datetime.combine(seam_date, datetime.min.time()),
            price_gap=50,
            normalized_gap=200,
            kind="midnight_contiguous",
            confidence="high",
        )

        result = service.build_quarter_audit(window, sessions, seam)

        self.assertEqual(result.risk, "green")
        self.assertEqual(result.seam_trade_date, seam_date)
        self.assertEqual(result.evaluated_session_count, 2)

    def test_source_inspection_preserves_volume_and_rejects_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "continuous.csv"
            source.write_text(
                "\n".join([
                    "datetime,open,high,low,close,volume",
                    "2024-03-01 09:30:00,100,101,99,100.5,10",
                    "2024-03-01 09:31:00,100.5,102,100,101,20",
                    "",
                ]),
                encoding="utf-8",
            )

            evidence = service.inspect_source(source)

            self.assertEqual(evidence["rows"], 2)
            self.assertEqual(evidence["distinctTimestamps"], 2)
            self.assertEqual(evidence["totalVolume"], 30)
            self.assertEqual(evidence["nullVolumeRows"], 0)

            source.write_text(
                source.read_text(encoding="utf-8")
                + "2024-03-01 09:31:00,100.5,102,100,101,20\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "duplicate timestamps"):
                service.inspect_source(source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
