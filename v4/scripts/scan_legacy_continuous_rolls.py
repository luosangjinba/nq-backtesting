#!/usr/bin/env python3
"""Read-only quarterly roll risk prescreen for a legacy continuous CSV."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from v4.server import legacy_continuous_roll_audit as audit_service


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read-only risk prescreen for quarterly roll windows in an already-stitched "
            "continuous futures CSV. This does not confirm roll dates."
        )
    )
    parser.add_argument("source", help="Continuous 1m CSV with datetime/OHLC/volume columns.")
    parser.add_argument("--instrument", default="NQ", help="Display label only; default NQ.")
    parser.add_argument("--start-year", type=int, help="First year to scan; defaults to source start year.")
    parser.add_argument("--end-year", type=int, help="Last year to scan; defaults to source end year.")
    parser.add_argument("--format", choices=("table", "json"), default="table")
    return parser.parse_args()


def json_default(value: object) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat(sep=" ") if isinstance(value, datetime) else value.isoformat()
    raise TypeError(f"cannot serialize {type(value).__name__}")


def format_ratio(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.3f}"


def format_table(result: dict[str, object], instrument: str) -> str:
    source = result["sourceEvidence"]
    risks = result["riskCounts"]
    lines = [
        "legacy_continuous_roll_audit_status: ok",
        "mode: read-only-risk-prescreen",
        "warning: continuous volume cannot confirm old/new contract dominance",
        f"instrument: {instrument.upper()}",
        f"source: {source['source']}",
        f"rows: {source['rows']}",
        f"first_ts: {source['firstTs']}",
        f"last_ts: {source['lastTs']}",
        f"null_volume_rows: {source['nullVolumeRows']}",
        f"zero_volume_rows: {source['zeroVolumeRows']}",
        f"quarters_scanned: {result['quartersScanned']}",
        f"risk_counts: red={risks['red']} amber={risks['amber']} green={risks['green']} unscored={risks['unscored']}",
        f"raw_contract_reviews: {result['rawContractReviews']}",
        "",
        (
            "year quarter expiry risk raw_review seam_trade_date evaluated_sessions "
            "weakest_trade_date bar_ratio volume_ratio inferred_seam seam_confidence seam_kind reasons"
        ),
    ]
    for item in result["audits"]:
        seam = item["inferred_seam_at"] or "n/a"
        weakest = item["weakest_trade_date"] or "n/a"
        reasons = ",".join(item["reasons"]) or "none"
        lines.append(" ".join([
            str(item["year"]),
            f"Q{item['quarter']}",
            str(item["expiry_date"]),
            str(item["risk"]),
            str(item["requires_raw_contract_review"]).lower(),
            str(item["seam_trade_date"] or "n/a"),
            str(item["evaluated_session_count"]),
            str(weakest),
            format_ratio(item["bar_ratio"]),
            format_ratio(item["volume_ratio"]),
            str(seam),
            str(item["seam_confidence"]),
            str(item["seam_kind"] or "n/a"),
            reasons,
        ]))
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    result = audit_service.audit_continuous_source(
        args.source,
        start_year=args.start_year,
        end_year=args.end_year,
    )
    if args.format == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2, default=json_default))
    else:
        print(format_table(result, args.instrument))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("legacy_continuous_roll_audit_status: failed")
        print(f"error: {exc}")
        raise SystemExit(1)
