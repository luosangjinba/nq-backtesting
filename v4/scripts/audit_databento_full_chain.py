#!/usr/bin/env python3
"""Audit and stage a reviewed Databento full-chain repair manifest.

This is a one-time historical maintenance adapter.  It consumes the frozen
volume-continuous mapping diff, downloads only bounded raw-contract windows,
proves the source transition in the provenance-free legacy series, and writes
review artifacts.  It never mutates DuckDB or the Roll Calendar.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb
import pandas as pd
import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from v4.server import manifest_historical_roll_repair_service as repair_service
from v4.server import databento_roll_chain_audit as chain_audit

try:
    import databento as db
except ImportError:  # pragma: no cover - operational dependency
    db = None


ET = ZoneInfo("America/New_York")
UTC = timezone.utc
DATASET = "GLBX.MDP3"
SCHEMA = "ohlcv-1m"
DEFAULT_DB = Path("/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb")
DEFAULTS = {
    "NQ": {
        "mapping": REPO_ROOT / "v7" / "docs" / "v7-nq-databento-full-chain-diff.json",
        "audit_json": REPO_ROOT / "v7" / "docs" / "v7-nq-databento-full-chain-audit.json",
        "plan": REPO_ROOT / "v4" / "data_config" / "historical_roll_repairs" / "nq-databento-full-chain.yml",
        "audit_document": "v7/docs/V7_NQ_DATABENTO_FULL_CHAIN_REPAIR.md",
        "cache": Path.home() / ".local" / "share" / "replay-lab" / "historical-roll-repair" / "nq-full-chain-audit",
    },
    "ES": {
        "mapping": REPO_ROOT / "v7" / "docs" / "v7-es-databento-full-chain-diff.json",
        "audit_json": REPO_ROOT / "v7" / "docs" / "v7-es-databento-full-chain-audit.json",
        "plan": REPO_ROOT / "v4" / "data_config" / "historical_roll_repairs" / "es-databento-full-chain.yml",
        "audit_document": "v7/docs/V7_ES_DATABENTO_FULL_CHAIN_REPAIR.md",
        "cache": Path.home() / ".local" / "share" / "replay-lab" / "historical-roll-repair" / "es-full-chain-audit",
    },
}
# The first bounded pass proved that these non-aligned windows also begin
# after the last usable prior-session bars.  Retain that evidence-driven
# restart scope rather than redownloading every already-proven window.
EXTENDED_PRIOR_LEG_WINDOWS = frozenset({"2020Q2", "2021Q1"})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read-only raw-contract attribution for a Databento full roll chain."
    )
    parser.add_argument("--instrument", choices=("ES", "NQ"), default="NQ")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--mapping")
    parser.add_argument("--audit-json")
    parser.add_argument("--plan")
    parser.add_argument("--cache-dir")
    parser.add_argument("--max-cost-usd", type=float, default=2.50)
    parser.add_argument(
        "--prior-download-cost-usd",
        type=float,
        default=0.0,
        help="Previously estimated paid requests already retained in the audit cache.",
    )
    return parser.parse_args()


def et_aware(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=ET)


def utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def normalize_download(raw: pd.DataFrame) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=["symbol", "ts", *chain_audit.BAR_COLUMNS])
    rows = raw.reset_index().copy()
    timestamp_column = "ts_event" if "ts_event" in rows.columns else rows.columns[0]
    timestamps = pd.to_datetime(rows[timestamp_column], utc=True)
    rows["ts"] = timestamps.dt.tz_convert(ET).dt.tz_localize(None)
    if "symbol" not in rows.columns:
        raise ValueError("Databento raw download did not include symbol identity")
    normalized = rows[["symbol", "ts", *chain_audit.BAR_COLUMNS]].copy()
    normalized["symbol"] = normalized["symbol"].astype(str)
    for column in ("open", "high", "low", "close"):
        normalized[column] = pd.to_numeric(normalized[column], errors="raise").astype(float)
    normalized["volume"] = pd.to_numeric(normalized["volume"], errors="raise").astype("int64")
    if normalized.duplicated(["symbol", "ts"]).any():
        raise ValueError("Databento raw download contains duplicate (symbol, ts) rows")
    return normalized.sort_values(["ts", "symbol"]).reset_index(drop=True)


def symbol_frame(raw: pd.DataFrame, symbol: str) -> pd.DataFrame:
    return raw.loc[raw["symbol"] == symbol, ["ts", *chain_audit.BAR_COLUMNS]].reset_index(drop=True)


def load_local(
    conn: duckdb.DuckDBPyConnection,
    instrument: str,
    start: datetime,
    end: datetime,
) -> pd.DataFrame:
    return conn.execute(
        """
select ts, open, high, low, close, volume
from futures_1m
where instrument = ? and ts >= ? and ts < ?
order by ts
""".strip(),
        [instrument, start.replace(tzinfo=None), end.replace(tzinfo=None)],
    ).fetchdf()


def request_key(window: str, kind: str) -> str:
    return f"{window.lower()}-{kind}"


def request_paths(cache: Path, key: str) -> tuple[Path, Path]:
    return cache / f"{key}.csv", cache / f"{key}.json"


def request_identity(symbols: list[str], start: datetime, end: datetime) -> dict[str, object]:
    return {
        "dataset": DATASET,
        "schema": SCHEMA,
        "symbols": symbols,
        "start": utc_iso(start),
        "end": utc_iso(end),
    }


def request_is_cached(
    cache: Path,
    *,
    key: str,
    symbols: list[str],
    start: datetime,
    end: datetime,
) -> bool:
    csv_path, evidence_path = request_paths(cache, key)
    if not csv_path.is_file() or not evidence_path.is_file():
        return False
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
    return all(
        evidence.get(field) == value
        for field, value in request_identity(symbols, start, end).items()
    )


def estimate_request(client: object, symbols: list[str], start: datetime, end: datetime) -> float:
    return float(client.metadata.get_cost(
        dataset=DATASET,
        schema=SCHEMA,
        symbols=symbols,
        stype_in="raw_symbol",
        start=utc_iso(start),
        end=utc_iso(end),
    ))


def load_or_download(
    client: object,
    cache: Path,
    *,
    key: str,
    symbols: list[str],
    start: datetime,
    end: datetime,
) -> tuple[pd.DataFrame, list[dict[str, str | None]], bool]:
    csv_path, evidence_path = request_paths(cache, key)
    if request_is_cached(
        cache,
        key=key,
        symbols=symbols,
        start=start,
        end=end,
    ):
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
        frame = pd.read_csv(csv_path, parse_dates=["ts"])
        return frame, list(evidence["conditions"]), True

    store = client.timeseries.get_range(
        dataset=DATASET,
        schema=SCHEMA,
        symbols=symbols,
        stype_in="raw_symbol",
        start=utc_iso(start),
        end=utc_iso(end),
    )
    frame = normalize_download(store.to_df())
    if set(frame["symbol"].unique()) != set(symbols):
        raise ValueError(
            f"{key} returned unexpected symbols: expected {symbols}, got {sorted(frame['symbol'].unique())}"
        )
    conditions = client.metadata.get_dataset_condition(
        dataset=DATASET,
        start_date=start.astimezone(UTC).date().isoformat(),
        end_date=(end.astimezone(UTC).date() + timedelta(days=1)).isoformat(),
    )
    cache.mkdir(parents=True, exist_ok=True)
    frame.to_csv(csv_path, index=False, date_format="%Y-%m-%dT%H:%M:%S")
    evidence_path.write_text(json.dumps({
        "dataset": DATASET,
        "schema": SCHEMA,
        "symbols": symbols,
        "start": utc_iso(start),
        "end": utc_iso(end),
        "conditions": conditions,
        "rows": len(frame),
    }, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return frame, conditions, False


def conditions_summary(rows: list[dict[str, str | None]]) -> dict[str, object]:
    counts: dict[str, int] = {}
    for row in rows:
        condition = str(row.get("condition") or "unknown")
        counts[condition] = counts.get(condition, 0) + 1
    return {"rows": len(rows), "counts": counts}


def build_calendar_event(row: dict[str, object], instrument: str) -> dict[str, object]:
    return {
        "instrument": instrument,
        "old_contract": row["oldContract"],
        "new_contract": row["newContract"],
        "roll_date_et": row["databentoD0"],
        "effective_at_et": row["targetBoundaryEt"],
        "boundary_policy": "databento_volume_trade_date_session_open",
        "status": "manual_confirmed",
        "evidence_type": "databento_v0_mapping_authority",
        "note": (
            f"Databento {instrument}.v.0 maps {row['newContract']} from trade date "
            f"{row['databentoD0']}; local policy uses the prior 18:00 ET session open."
        ),
    }


def repair_id(row: dict[str, object]) -> str:
    return f"{str(row['window']).lower()}-{str(row['oldContract']).lower()}-{str(row['newContract']).lower()}"


def main() -> int:
    args = parse_args()
    if db is None:
        raise RuntimeError("Missing dependency: databento")
    database = Path(args.db).expanduser().resolve()
    instrument = args.instrument.upper()
    defaults = DEFAULTS[instrument]
    mapping_path = Path(args.mapping or defaults["mapping"]).expanduser().resolve()
    audit_path = Path(args.audit_json or defaults["audit_json"]).expanduser().resolve()
    plan_path = Path(args.plan or defaults["plan"]).expanduser().resolve()
    cache = Path(args.cache_dir or defaults["cache"]).expanduser().resolve()
    if not database.is_file() or not mapping_path.is_file():
        raise ValueError("audit requires the authoritative DuckDB and frozen mapping artifact")

    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    transitions = list(mapping["comparison"]["transitions"])
    if len(transitions) != 65:
        raise ValueError(f"expected 65 frozen {instrument} transitions, got {len(transitions)}")
    client = db.Historical()

    requests: list[dict[str, object]] = []
    for row in transitions:
        current = et_aware(str(row["currentBoundaryEt"]))
        target = et_aware(str(row["targetBoundaryEt"]))
        if row["currentBoundaryAuthority"] == "legacy_continuous_inferred":
            # A Sunday 18:00 boundary minus two natural days starts after the
            # prior Friday session close and cannot prove the old leg.  When
            # the diagnostic seam merely appears aligned, retain two complete
            # prior trade dates plus the target session instead.
            needs_prior_trade_dates = (
                current == target
                or str(row.get("currentBoundaryConfidence") or "none") in {"low", "none"}
                or (
                    instrument == "NQ"
                    and str(row["window"]) in EXTENDED_PRIOR_LEG_WINDOWS
                )
            )
            requests.append({
                "key": request_key(str(row["window"]), "bilateral"),
                "symbols": [str(row["oldContract"]), str(row["newContract"])],
                "start": min(current, target) - timedelta(days=5 if needs_prior_trade_dates else 2),
                "end": max(current, target) + timedelta(days=3 if needs_prior_trade_dates else 2),
            })
        elif current != target:
            interval = chain_audit.repair_interval_for_boundaries(
                current_boundary_et=str(row["currentBoundaryEt"]),
                target_boundary_et=str(row["targetBoundaryEt"]),
                old_contract=str(row["oldContract"]),
                new_contract=str(row["newContract"]),
            )
            requests.append({
                "key": request_key(str(row["window"]), "replacement"),
                "symbols": [interval.source_contract],
                "start": et_aware(interval.start_et),
                "end": et_aware(interval.end_et),
            })

    estimated = 0.0
    for index, request in enumerate(requests, start=1):
        if request_is_cached(
            cache,
            key=str(request["key"]),
            symbols=list(request["symbols"]),
            start=request["start"],
            end=request["end"],
        ):
            continue
        cost = estimate_request(
            client,
            list(request["symbols"]),
            request["start"],
            request["end"],
        )
        estimated += cost
        print(
            f"estimate {index:02d}/{len(requests)} {request['key']} "
            f"cumulative_usd={estimated:.6f}",
            flush=True,
        )
    if estimated > args.max_cost_usd:
        raise ValueError(
            f"estimated uncached download cost ${estimated:.6f} exceeds "
            f"configured maximum ${args.max_cost_usd:.2f}"
        )
    print(f"estimated_uncached_download_usd: {estimated:.6f}", flush=True)

    downloaded: dict[str, tuple[pd.DataFrame, list[dict[str, str | None]]]] = {}
    for index, request in enumerate(requests, start=1):
        frame, conditions, cached = load_or_download(
            client,
            cache,
            key=str(request["key"]),
            symbols=list(request["symbols"]),
            start=request["start"],
            end=request["end"],
        )
        downloaded[str(request["key"])] = (frame, conditions)
        print(
            f"source {index:02d}/{len(requests)} {request['key']} rows={len(frame)} "
            f"mode={'cache' if cached else 'download'}",
            flush=True,
        )

    audit_rows = []
    repair_rows = []
    calendar_events = []
    with duckdb.connect(str(database), read_only=True) as conn:
        for row in transitions:
            current_boundary = str(row["currentBoundaryEt"])
            boundary_evidence = None
            condition_evidence: list[dict[str, str | None]] = []
            bilateral = None
            if row["currentBoundaryAuthority"] == "legacy_continuous_inferred":
                key = request_key(str(row["window"]), "bilateral")
                raw, condition_evidence = downloaded[key]
                old = symbol_frame(raw, str(row["oldContract"]))
                new = symbol_frame(raw, str(row["newContract"]))
                start = raw["ts"].min().to_pydatetime().replace(tzinfo=ET)
                end = (raw["ts"].max().to_pydatetime() + timedelta(minutes=1)).replace(tzinfo=ET)
                local = load_local(conn, instrument, start, end)
                evidence = chain_audit.derive_source_boundary(
                    local,
                    old,
                    new,
                    inferred_boundary_et=current_boundary,
                )
                current_boundary = evidence.current_boundary_et
                boundary_evidence = evidence.to_dict()
                bilateral = (local, old, new)

            interval = chain_audit.repair_interval_for_boundaries(
                current_boundary_et=current_boundary,
                target_boundary_et=str(row["targetBoundaryEt"]),
                old_contract=str(row["oldContract"]),
                new_contract=str(row["newContract"]),
            )
            repair_evidence = None
            if interval is not None:
                start = et_aware(interval.start_et)
                end = et_aware(interval.end_et)
                current_frame = load_local(conn, instrument, start, end)
                if bilateral is not None:
                    local, old, new = bilateral
                    attribution = chain_audit.assert_interval_source_evidence(
                        local,
                        old,
                        new,
                        interval=interval,
                    )
                    raw = downloaded[request_key(str(row["window"]), "bilateral")][0]
                    replacement = symbol_frame(raw, interval.source_contract)
                else:
                    attribution = {
                        "localRows": len(current_frame),
                        "authority": str(row["currentBoundaryAuthority"]),
                    }
                    key = request_key(str(row["window"]), "replacement")
                    raw, condition_evidence = downloaded[key]
                    replacement = symbol_frame(raw, interval.source_contract)
                start_naive = start.replace(tzinfo=None)
                end_naive = end.replace(tzinfo=None)
                replacement = replacement[
                    (replacement["ts"] >= start_naive) & (replacement["ts"] < end_naive)
                ].reset_index(drop=True)
                if current_frame.empty or replacement.empty:
                    raise ValueError(f"{row['window']} repair interval has an empty current/replacement frame")
                fingerprint = repair_service.frame_fingerprint(replacement)
                current_ts = set(pd.to_datetime(current_frame["ts"]))
                replacement_ts = set(pd.to_datetime(replacement["ts"]))
                repair = {
                    "repair_id": repair_id(row),
                    "transition": f"{row['oldContract']}->{row['newContract']}",
                    "source_contract": interval.source_contract,
                    "start_et": interval.start_et,
                    "end_et": interval.end_et,
                    "expected_current_rows": len(current_frame),
                    "expected_replacement_rows": len(replacement),
                    "expected_replacement_fingerprint": fingerprint,
                }
                relevant_conditions = repair_service.relevant_condition_evidence(
                    replacement,
                    condition_evidence,
                )
                accepted_conditions = {"available"}
                accepted_conditions.update(
                    str(item.get("condition") or "unknown") for item in relevant_conditions
                )
                if not accepted_conditions.issubset({"available", "degraded"}):
                    raise ValueError(
                        f"{row['window']} contains an unreviewable Databento condition: "
                        f"{sorted(accepted_conditions)}"
                    )
                if "degraded" in accepted_conditions:
                    repair["accepted_conditions"] = ["available", "degraded"]
                repair_rows.append(repair)
                repair_evidence = {
                    **interval.to_dict(),
                    **attribution,
                    "currentRows": len(current_frame),
                    "replacementRows": len(replacement),
                    "netRows": len(replacement) - len(current_frame),
                    "currentOnlyTimestamps": len(current_ts - replacement_ts),
                    "replacementOnlyTimestamps": len(replacement_ts - current_ts),
                    "replacementFingerprint": fingerprint,
                    "conditions": conditions_summary(relevant_conditions),
                }

            calendar_events.append(build_calendar_event(row, instrument))
            audit_rows.append({
                "window": row["window"],
                "oldContract": row["oldContract"],
                "newContract": row["newContract"],
                "databentoD0": row["databentoD0"],
                "targetBoundaryEt": row["targetBoundaryEt"],
                "priorBoundaryEt": row["currentBoundaryEt"],
                "auditedCurrentBoundaryEt": current_boundary,
                "priorAuthority": row["currentBoundaryAuthority"],
                "boundaryEvidence": boundary_evidence,
                "conditions": conditions_summary(condition_evidence),
                "repair": repair_evidence,
            })
            print(
                f"audit {len(audit_rows):02d}/65 {row['window']} current={current_boundary} "
                f"target={row['targetBoundaryEt']} repair={'yes' if interval else 'no'}",
                flush=True,
            )

        total_rows = int(conn.execute("select count(*) from futures_1m").fetchone()[0])
        instrument_rows = int(conn.execute(
            "select count(*) from futures_1m where instrument = ?", [instrument]
        ).fetchone()[0])
        duplicates = int(conn.execute(
            "select count(*) - count(distinct ts) from futures_1m where instrument = ?", [instrument]
        ).fetchone()[0])

    expected_current = sum(int(row["expected_current_rows"]) for row in repair_rows)
    expected_replacement = sum(int(row["expected_replacement_rows"]) for row in repair_rows)
    audit_payload = {
        "version": 1,
        "mode": "read-only-reviewed-plan",
        "generatedAtEt": datetime.now(ET).isoformat(timespec="seconds"),
        "policy": {
            "mapping": f"Databento {instrument}.v.0 volume-ranked d0",
            "boundary": "prior natural date 18:00 America/New_York",
            "barSource": "raw quarterly contracts",
            "firstGovernedTransition": transitions[0]["window"],
            "preDatabentoHistory": "legacy source retained before 2010Q2",
        },
        "sourceMappingRevision": mapping["mapping"]["fingerprint"],
        "database": {
            "path": str(database),
            "totalRows": total_rows,
            f"{instrument.lower()}Rows": instrument_rows,
            f"{instrument.lower()}DuplicateTimestamps": duplicates,
        },
        "summary": {
            "transitions": len(transitions),
            "auditedLegacyAttributions": sum(
                1 for row in audit_rows if row["boundaryEvidence"] is not None
            ),
            "repairs": len(repair_rows),
            "alignedWithoutRepair": len(transitions) - len(repair_rows),
            "currentRows": expected_current,
            "replacementRows": expected_replacement,
            "netRows": expected_replacement - expected_current,
            "estimatedUncachedDownloadUsd": estimated,
            "estimatedCumulativeDownloadUsd": args.prior_download_cost_usd + estimated,
        },
        "transitions": audit_rows,
    }
    plan_payload = {
        "version": 1,
        "plan_id": f"{instrument.lower()}-databento-full-chain",
        "dataset": DATASET,
        "schema": SCHEMA,
        "instrument": instrument,
        "expected_confirmation": f"REPAIR {instrument} DATABENTO FULL CHAIN",
        "audit_document": str(defaults["audit_document"]),
        "expected_totals": {
            "current_rows": expected_current,
            "replacement_rows": expected_replacement,
            "net_restored_minutes": expected_replacement - expected_current,
        },
        "repairs": repair_rows,
        "calendar_events": calendar_events,
    }
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(
        json.dumps(audit_payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    plan_path.write_text(
        yaml.safe_dump(plan_payload, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    print(f"{instrument.lower()}_databento_full_chain_audit_status: ok")
    print(f"transitions: {len(transitions)}")
    print(f"repairs: {len(repair_rows)}")
    print(f"aligned_without_repair: {len(transitions) - len(repair_rows)}")
    print(f"current_rows: {expected_current}")
    print(f"replacement_rows: {expected_replacement}")
    print(f"net_rows: {expected_replacement - expected_current}")
    print(f"audit_json: {audit_path}")
    print(f"plan: {plan_path}")
    print("write_status: no-database-or-calendar-mutation")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("databento_full_chain_audit_status: failed")
        print(f"error: {exc}")
        raise SystemExit(1)
