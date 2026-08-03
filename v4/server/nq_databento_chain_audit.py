"""Pure evidence helpers for the one-time NQ Databento roll-chain repair.

The legacy NQ series has no source-contract column.  These helpers compare
that stored series with both raw quarterly contracts, derive the exact source
change interval, and describe the minimum half-open repair needed to apply the
session-aligned Databento ``NQ.v.0`` mapping policy.

Network access, DuckDB reads, artifact writes, and repair execution stay in
their existing adapters.  This module only evaluates already-normalized bars.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime

import pandas as pd


BAR_COLUMNS = ("open", "high", "low", "close", "volume")


@dataclass(frozen=True)
class SourceBoundaryEvidence:
    current_boundary_et: str
    last_old_only_match_et: str
    first_new_only_match_et: str
    old_only_matches: int
    new_only_matches: int
    both_matches: int
    unmatched_local_rows: int
    boundary_basis: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True)
class RepairInterval:
    start_et: str
    end_et: str
    source_contract: str
    direction: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


def _normalize(frame: pd.DataFrame, label: str) -> pd.DataFrame:
    required = {"ts", *BAR_COLUMNS}
    missing = sorted(required.difference(frame.columns))
    if missing:
        raise ValueError(f"{label} bars missing columns: {', '.join(missing)}")
    rows = frame[["ts", *BAR_COLUMNS]].copy()
    rows["ts"] = pd.to_datetime(rows["ts"]).dt.tz_localize(None)
    if rows["ts"].duplicated().any():
        raise ValueError(f"{label} bars contain duplicate timestamps")
    return rows.sort_values("ts").reset_index(drop=True)


def _matches(local: pd.DataFrame, source: pd.DataFrame, suffix: str) -> pd.Series:
    renamed = source.rename(columns={column: f"{column}_{suffix}" for column in BAR_COLUMNS})
    joined = local.merge(renamed, on="ts", how="left", sort=False)
    result = pd.Series(True, index=joined.index)
    for column in BAR_COLUMNS:
        result &= joined[column].eq(joined[f"{column}_{suffix}"])
    return result


def derive_source_boundary(
    local_bars: pd.DataFrame,
    old_contract_bars: pd.DataFrame,
    new_contract_bars: pd.DataFrame,
    *,
    inferred_boundary_et: str,
) -> SourceBoundaryEvidence:
    """Prove one old-to-new source transition from exact raw OHLCV matches.

    Rows matching both contracts are non-discriminating and rows matching
    neither are retained as diagnostics.  A valid attribution requires every
    discriminating old match to precede every discriminating new match.
    """

    local = _normalize(local_bars, "local")
    old = _normalize(old_contract_bars, "old-contract")
    new = _normalize(new_contract_bars, "new-contract")
    if local.empty:
        raise ValueError("local audit window is empty")

    old_match = _matches(local, old, "old")
    new_match = _matches(local, new, "new")
    old_only = old_match & ~new_match
    new_only = new_match & ~old_match
    both = old_match & new_match
    unmatched = ~old_match & ~new_match
    if not old_only.any() or not new_only.any():
        raise ValueError("audit window does not prove both old and new source legs")

    last_old = pd.Timestamp(local.loc[old_only, "ts"].max()).to_pydatetime()
    first_new = pd.Timestamp(local.loc[new_only, "ts"].min()).to_pydatetime()
    if last_old >= first_new:
        raise ValueError(
            "raw source attribution interleaves old and new contract matches: "
            f"last old {last_old.isoformat()} >= first new {first_new.isoformat()}"
        )

    inferred = datetime.fromisoformat(inferred_boundary_et)
    if last_old < inferred <= first_new:
        boundary = inferred
        basis = "inferred_boundary_inside_exact_match_gap"
    else:
        boundary = first_new
        basis = "first_exact_new_contract_match"

    return SourceBoundaryEvidence(
        current_boundary_et=boundary.isoformat(timespec="minutes"),
        last_old_only_match_et=last_old.isoformat(timespec="minutes"),
        first_new_only_match_et=first_new.isoformat(timespec="minutes"),
        old_only_matches=int(old_only.sum()),
        new_only_matches=int(new_only.sum()),
        both_matches=int(both.sum()),
        unmatched_local_rows=int(unmatched.sum()),
        boundary_basis=basis,
    )


def repair_interval_for_boundaries(
    *,
    current_boundary_et: str,
    target_boundary_et: str,
    old_contract: str,
    new_contract: str,
) -> RepairInterval | None:
    current = datetime.fromisoformat(current_boundary_et)
    target = datetime.fromisoformat(target_boundary_et)
    if current == target:
        return None
    if target < current:
        return RepairInterval(
            start_et=target.isoformat(timespec="minutes"),
            end_et=current.isoformat(timespec="minutes"),
            source_contract=new_contract,
            direction="databento_earlier",
        )
    return RepairInterval(
        start_et=current.isoformat(timespec="minutes"),
        end_et=target.isoformat(timespec="minutes"),
        source_contract=old_contract,
        direction="databento_later",
    )


def assert_interval_source_evidence(
    local_bars: pd.DataFrame,
    old_contract_bars: pd.DataFrame,
    new_contract_bars: pd.DataFrame,
    *,
    interval: RepairInterval,
) -> dict[str, int]:
    """Reject a proposed repair when local raw attribution contradicts it."""

    local = _normalize(local_bars, "local")
    old = _normalize(old_contract_bars, "old-contract")
    new = _normalize(new_contract_bars, "new-contract")
    start = datetime.fromisoformat(interval.start_et)
    end = datetime.fromisoformat(interval.end_et)
    selected = local[(local["ts"] >= start) & (local["ts"] < end)].reset_index(drop=True)
    if selected.empty:
        raise ValueError("proposed repair interval has no current local rows")
    old_match = _matches(selected, old, "old")
    new_match = _matches(selected, new, "new")
    old_only = old_match & ~new_match
    new_only = new_match & ~old_match
    if interval.direction == "databento_earlier":
        expected, contradictory = old_only, new_only
    elif interval.direction == "databento_later":
        expected, contradictory = new_only, old_only
    else:
        raise ValueError(f"unknown repair direction: {interval.direction}")
    if not expected.any() or contradictory.any():
        raise ValueError(
            "proposed repair interval is not a single proven current source leg: "
            f"expected={int(expected.sum())}, contradictory={int(contradictory.sum())}"
        )
    return {
        "localRows": len(selected),
        "expectedSourceOnlyMatches": int(expected.sum()),
        "ambiguousBothMatches": int((old_match & new_match).sum()),
        "unmatchedLocalRows": int((~old_match & ~new_match).sum()),
    }
