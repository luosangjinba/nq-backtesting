"""Guarded, manifest-bound historical NQ roll repair domain.

This is deliberately separate from the insert-only Databento updater and the
ordinary Roll Calendar Preview/Commit path.  It owns only the explicitly
audited 2025 NQ repair and requires staged raw-contract evidence, a recoverable
database backup, exact interval fingerprints, and an exact confirmation.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import shutil
import tempfile
import time
from copy import deepcopy
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb
import pandas as pd
import yaml

from . import market_data_backup_service, roll_calendar_service


ET = ZoneInfo("America/New_York")
DATASET = "GLBX.MDP3"
SCHEMA = "ohlcv-1m"
INSTRUMENT = "NQ"
EXPECTED_CONFIRMATION = "REPAIR NQ 2025"
PREVIEW_TTL_SECONDS = 30 * 60
TOKEN_PATTERN = re.compile(r"^nq-2025-roll-[A-Za-z0-9_-]+$")
BAR_COLUMNS = ["ts", "open", "high", "low", "close", "volume"]
CALENDAR_HEADER = """# V4 futures raw-contract roll calendar.
#
# Purpose:
# - Direct Databento continuous mappings change at 00:00 UTC and split CME sessions.
# - Use raw quarterly contracts and explicit New York roll boundaries.
# - Ordinary acquisition remains insert-only; historical repair uses a separate guarded path.
#
# Semantics:
# - `roll_date_et` is the human-facing CME trade date.
# - `effective_at_et` is the exact source-contract transition boundary.
# - New session-aligned transitions use the prior 18:00 CME session open.

"""


class _IndentedSafeDumper(yaml.SafeDumper):
    def increase_indent(self, flow: bool = False, indentless: bool = False):
        return super().increase_indent(flow, False)


@dataclass(frozen=True)
class RepairSpec:
    repair_id: str
    transition: str
    source_contract: str
    start_et: str
    end_et: str
    expected_current_rows: int
    expected_replacement_rows: int


REPAIR_SPECS = (
    RepairSpec(
        "2025-03-h5-m5",
        "NQH5->NQM5",
        "NQH5",
        "2025-03-14T00:00:00",
        "2025-03-16T18:00:00",
        947,
        1020,
    ),
    RepairSpec(
        "2025-06-m5-u5",
        "NQM5->NQU5",
        "NQM5",
        "2025-06-13T00:00:00",
        "2025-06-15T18:00:00",
        955,
        1020,
    ),
    RepairSpec(
        "2025-12-z5-h6",
        "NQZ5->NQH6",
        "NQH6",
        "2025-12-14T18:00:00",
        "2025-12-15T00:00:00",
        360,
        360,
    ),
)


CALENDAR_EVENTS = (
    {
        "instrument": "NQ",
        "old_contract": "NQH5",
        "new_contract": "NQM5",
        "roll_date_et": "2025-03-17",
        "effective_at_et": "2025-03-16T18:00",
        "boundary_policy": "cme_trade_date_session_open",
        "status": "manual_confirmed",
        "evidence_type": "historical_trade_date_liquidity_repair",
        "note": "Historical repair: NQM5 had 1,380 minutes and 83.69% of NQH5 volume on trade date 2025-03-17; session-open boundary satisfies the expiry-week hard horizon.",
    },
    {
        "instrument": "NQ",
        "old_contract": "NQM5",
        "new_contract": "NQU5",
        "roll_date_et": "2025-06-16",
        "effective_at_et": "2025-06-15T18:00",
        "boundary_policy": "cme_trade_date_session_open",
        "status": "volume_confirmed",
        "evidence_type": "historical_trade_date_liquidity_repair",
        "note": "Historical repair: NQU5 first complete-session volume dominance was 1.5484x on trade date 2025-06-16.",
    },
    {
        "instrument": "NQ",
        "old_contract": "NQU5",
        "new_contract": "NQZ5",
        "roll_date_et": "2025-09-15",
        "effective_at_et": "2025-09-14T18:00",
        "boundary_policy": "cme_trade_date_session_open",
        "status": "manual_confirmed",
        "evidence_type": "historical_trade_date_liquidity_audit",
        "note": "Boundary retained: NQZ5 had 1,375 minutes and 98.88% of NQU5 volume on trade date 2025-09-15; later Databento evidence includes a degraded date.",
    },
    {
        "instrument": "NQ",
        "old_contract": "NQZ5",
        "new_contract": "NQH6",
        "roll_date_et": "2025-12-15",
        "effective_at_et": "2025-12-14T18:00",
        "boundary_policy": "cme_trade_date_session_open",
        "status": "volume_confirmed",
        "evidence_type": "historical_trade_date_liquidity_repair",
        "note": "Historical repair: NQH6 first complete-session volume dominance was 1.2602x on trade date 2025-12-15.",
    },
)


def default_repair_root() -> Path:
    configured = os.environ.get("V4_HISTORICAL_ROLL_REPAIR_DIR", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return Path.home() / ".local" / "share" / "replay-lab" / "historical-roll-repair"


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _atomic_write_bytes(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    staged = Path(temp_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(staged, path)
    finally:
        staged.unlink(missing_ok=True)


def _atomic_write_text(path: Path, text: str) -> None:
    _atomic_write_bytes(path, text.encode("utf-8"))


def _append_jsonl(path: Path, record: dict[str, object]) -> None:
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    if existing and not existing.endswith("\n"):
        existing += "\n"
    _atomic_write_text(path, existing + json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def _normalize_frame(frame: pd.DataFrame) -> pd.DataFrame:
    missing = [column for column in BAR_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(f"replacement frame missing columns: {', '.join(missing)}")
    normalized = frame[BAR_COLUMNS].copy()
    normalized["ts"] = pd.to_datetime(normalized["ts"]).dt.tz_localize(None)
    for column in ["open", "high", "low", "close"]:
        normalized[column] = pd.to_numeric(normalized[column], errors="raise").astype(float)
    normalized["volume"] = pd.to_numeric(normalized["volume"], errors="raise").astype("int64")
    return normalized.sort_values("ts").reset_index(drop=True)


def validate_replacement(spec: RepairSpec, frame: pd.DataFrame) -> pd.DataFrame:
    rows = _normalize_frame(frame)
    start = pd.Timestamp(spec.start_et)
    end = pd.Timestamp(spec.end_et)
    if len(rows) != spec.expected_replacement_rows:
        raise ValueError(
            f"{spec.repair_id} expected {spec.expected_replacement_rows} replacement rows, got {len(rows)}"
        )
    if rows["ts"].duplicated().any():
        raise ValueError(f"{spec.repair_id} replacement timestamps are not unique")
    if rows.empty or rows["ts"].min() < start or rows["ts"].max() >= end:
        raise ValueError(f"{spec.repair_id} replacement rows escape the audited half-open interval")
    if (rows["volume"] < 0).any():
        raise ValueError(f"{spec.repair_id} contains negative volume")
    if (
        (rows["high"] < rows[["open", "low", "close"]].max(axis=1))
        | (rows["low"] > rows[["open", "high", "close"]].min(axis=1))
    ).any():
        raise ValueError(f"{spec.repair_id} contains invalid OHLC bounds")
    return rows


def _frame_fingerprint(frame: pd.DataFrame) -> str:
    rows = _normalize_frame(frame)
    lines = []
    for row in rows.itertuples(index=False):
        lines.append("|".join([
            pd.Timestamp(row.ts).isoformat(),
            repr(float(row.open)),
            repr(float(row.high)),
            repr(float(row.low)),
            repr(float(row.close)),
            str(int(row.volume)),
        ]))
    return _sha256_bytes("\n".join(lines).encode("utf-8"))


def _load_interval(conn: duckdb.DuckDBPyConnection, spec: RepairSpec) -> pd.DataFrame:
    return conn.execute(
        """
select ts, open, high, low, close, volume
from futures_1m
where instrument = ? and ts >= ? and ts < ?
order by ts
""".strip(),
        [INSTRUMENT, datetime.fromisoformat(spec.start_et), datetime.fromisoformat(spec.end_et)],
    ).fetchdf()


def _database_evidence(db_path: Path) -> dict[str, object]:
    with duckdb.connect(str(db_path), read_only=True) as conn:
        total_rows = int(conn.execute("select count(*) from futures_1m").fetchone()[0])
        nq_rows = int(conn.execute("select count(*) from futures_1m where instrument = ?", [INSTRUMENT]).fetchone()[0])
        intervals = {}
        for spec in REPAIR_SPECS:
            frame = _load_interval(conn, spec)
            if len(frame) != spec.expected_current_rows:
                raise ValueError(
                    f"{spec.repair_id} expected {spec.expected_current_rows} current rows, got {len(frame)}"
                )
            intervals[spec.repair_id] = {
                "rows": len(frame),
                "fingerprint": _frame_fingerprint(frame),
            }
    stat = db_path.stat()
    return {
        "size": stat.st_size,
        "mtimeNs": stat.st_mtime_ns,
        "totalRows": total_rows,
        "nqRows": nq_rows,
        "intervals": intervals,
    }


def _candidate_calendar(calendar_path: Path, confirmed_at: str) -> str:
    data = yaml.safe_load(calendar_path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict) or not isinstance(data.get("rolls"), list):
        raise ValueError("roll calendar must contain a rolls list")
    repair_keys = {
        (str(event["instrument"]), str(event["old_contract"]), str(event["new_contract"]))
        for event in CALENDAR_EVENTS
    }
    remaining = [
        row for row in data["rolls"]
        if (str(row.get("instrument")), str(row.get("old_contract")), str(row.get("new_contract")))
        not in repair_keys
    ]
    first_nq = next(
        (index for index, row in enumerate(remaining) if str(row.get("instrument")) == INSTRUMENT),
        len(remaining),
    )
    events = []
    for source in CALENDAR_EVENTS:
        event = deepcopy(source)
        event["confirmed_at"] = confirmed_at
        events.append(event)
    candidate = deepcopy(data)
    candidate["version"] = 2
    candidate["timezone"] = "America/New_York"
    candidate_rows = [*remaining[:first_nq], *events, *remaining[first_nq:]]
    candidate_rows.sort(key=lambda row: (
        roll_calendar_service._event_from_row(row).effective_at_et,
        str(row.get("instrument") or ""),
    ))
    candidate["rolls"] = candidate_rows
    parsed_events = [roll_calendar_service._event_from_row(row) for row in candidate["rolls"]]
    roll_calendar_service.validate_calendar(candidate, parsed_events)
    body = yaml.dump(
        candidate,
        Dumper=_IndentedSafeDumper,
        sort_keys=False,
        allow_unicode=True,
    )
    return CALENDAR_HEADER + body


def _safe_preview_dir(root: Path, token: str) -> Path:
    if not TOKEN_PATTERN.fullmatch(token):
        raise ValueError("invalid historical repair preview token")
    previews = (root / "previews").resolve()
    path = (previews / token).resolve()
    if path.parent != previews:
        raise ValueError("historical repair preview path escaped its root")
    return path


def create_preview(
    db_path: Path | str,
    calendar_path: Path | str,
    replacements: dict[str, pd.DataFrame],
    condition_evidence: dict[str, list[dict[str, str | None]]],
    *,
    repair_root: Path | str | None = None,
    now: datetime | None = None,
) -> dict[str, object]:
    database = Path(db_path).expanduser().resolve()
    calendar = Path(calendar_path).expanduser().resolve()
    root = Path(repair_root).expanduser().resolve() if repair_root else default_repair_root()
    if not database.is_file() or not calendar.is_file():
        raise ValueError("historical repair requires existing database and calendar files")
    current = now or datetime.now(ET)
    confirmed_at = current.isoformat(timespec="seconds")
    token = f"nq-2025-roll-{secrets.token_urlsafe(18)}"
    preview_dir = _safe_preview_dir(root, token)
    if preview_dir.exists():
        raise ValueError("historical repair preview token collision")
    preview_dir.mkdir(parents=True)

    staged_specs = []
    try:
        for spec in REPAIR_SPECS:
            conditions = condition_evidence.get(spec.repair_id) or []
            non_available = [
                row for row in conditions if str(row.get("condition") or "unknown") != "available"
            ]
            if not conditions or non_available:
                raise ValueError(f"{spec.repair_id} has missing or non-available Databento condition evidence")
            if spec.repair_id not in replacements:
                raise ValueError(f"missing staged replacement for {spec.repair_id}")
            frame = validate_replacement(spec, replacements[spec.repair_id])
            csv_path = preview_dir / f"{spec.repair_id}.csv"
            csv_text = frame.to_csv(index=False, date_format="%Y-%m-%dT%H:%M:%S")
            _atomic_write_text(csv_path, csv_text)
            staged_specs.append({
                **asdict(spec),
                "csv": csv_path.name,
                "csvSha256": _sha256_file(csv_path),
                "frameFingerprint": _frame_fingerprint(frame),
                "conditions": conditions,
            })

        calendar_text = _candidate_calendar(calendar, confirmed_at)
        calendar_stage = preview_dir / "futures_roll_calendar.yml"
        _atomic_write_text(calendar_stage, calendar_text)
        database_evidence = _database_evidence(database)
        manifest = {
            "version": 1,
            "status": "previewed",
            "token": token,
            "createdAt": current.timestamp(),
            "createdAtEt": confirmed_at,
            "dataset": DATASET,
            "schema": SCHEMA,
            "instrument": INSTRUMENT,
            "expectedConfirmation": EXPECTED_CONFIRMATION,
            "databasePath": str(database),
            "calendarPath": str(calendar),
            "calendarRevision": roll_calendar_service.calendar_revision(calendar),
            "candidateCalendarSha256": _sha256_file(calendar_stage),
            "databaseEvidence": database_evidence,
            "currentRowsInRepairIntervals": sum(spec.expected_current_rows for spec in REPAIR_SPECS),
            "replacementRows": sum(spec.expected_replacement_rows for spec in REPAIR_SPECS),
            "netRestoredMinutes": sum(
                spec.expected_replacement_rows - spec.expected_current_rows for spec in REPAIR_SPECS
            ),
            "repairs": staged_specs,
        }
        manifest_path = preview_dir / "manifest.json"
        _atomic_write_text(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    except Exception:
        shutil.rmtree(preview_dir, ignore_errors=True)
        raise

    return {
        "ok": True,
        "returncode": 0,
        "previewToken": token,
        "expectedConfirmation": EXPECTED_CONFIRMATION,
        "manifest": str(manifest_path),
        "output": "\n".join([
            "historical_roll_repair_preview_status: ok",
            f"preview_token: {token}",
            f"expected_confirmation: {EXPECTED_CONFIRMATION}",
            f"current_rows_in_repair_intervals: {manifest['currentRowsInRepairIntervals']}",
            f"replacement_rows: {manifest['replacementRows']}",
            f"net_restored_minutes: {manifest['netRestoredMinutes']}",
            f"manifest: {manifest_path}",
            "write_status: preview-only",
        ]),
    }


def _load_manifest(root: Path, token: str) -> tuple[Path, dict[str, object]]:
    preview_dir = _safe_preview_dir(root, token)
    manifest_path = preview_dir / "manifest.json"
    if not manifest_path.is_file():
        raise ValueError("historical repair preview manifest not found")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("token") != token or manifest.get("status") != "previewed":
        raise ValueError("historical repair preview is not commit-eligible")
    if time.time() - float(manifest.get("createdAt") or 0) > PREVIEW_TTL_SECONDS:
        raise ValueError("historical repair preview expired; Preview again")
    return preview_dir, manifest


def _verify_manifest_state(preview_dir: Path, manifest: dict[str, object]) -> dict[str, pd.DataFrame]:
    database = Path(str(manifest["databasePath"])).resolve()
    calendar = Path(str(manifest["calendarPath"])).resolve()
    if roll_calendar_service.calendar_revision(calendar) != manifest["calendarRevision"]:
        raise ValueError("roll calendar changed after historical repair Preview")
    if _database_evidence(database) != manifest["databaseEvidence"]:
        raise ValueError("market-data database changed after historical repair Preview")
    candidate = preview_dir / "futures_roll_calendar.yml"
    if _sha256_file(candidate) != manifest["candidateCalendarSha256"]:
        raise ValueError("staged roll calendar hash mismatch")
    parsed = yaml.safe_load(candidate.read_text(encoding="utf-8")) or {}
    events = [roll_calendar_service._event_from_row(row) for row in parsed.get("rolls") or []]
    roll_calendar_service.validate_calendar(parsed, events)

    replacements = {}
    repair_manifest = {str(row["repair_id"]): row for row in manifest["repairs"]}
    for spec in REPAIR_SPECS:
        item = repair_manifest.get(spec.repair_id)
        if not item:
            raise ValueError(f"manifest missing repair {spec.repair_id}")
        csv_path = preview_dir / str(item["csv"])
        if _sha256_file(csv_path) != item["csvSha256"]:
            raise ValueError(f"{spec.repair_id} staged CSV hash mismatch")
        frame = validate_replacement(spec, pd.read_csv(csv_path))
        if _frame_fingerprint(frame) != item["frameFingerprint"]:
            raise ValueError(f"{spec.repair_id} staged frame fingerprint mismatch")
        replacements[spec.repair_id] = frame
    return replacements


def _restore_database(backup_path: Path, database: Path) -> None:
    staged = database.with_suffix(f"{database.suffix}.historical-repair-restore")
    try:
        shutil.copy2(backup_path, staged)
        os.replace(staged, database)
    finally:
        staged.unlink(missing_ok=True)


def _apply_database_repair(database: Path, replacements: dict[str, pd.DataFrame]) -> dict[str, int]:
    connection = duckdb.connect(str(database))
    committed = False
    try:
        connection.execute("begin transaction")
        for index, spec in enumerate(REPAIR_SPECS):
            connection.execute(
                "delete from futures_1m where instrument = ? and ts >= ? and ts < ?",
                [INSTRUMENT, datetime.fromisoformat(spec.start_et), datetime.fromisoformat(spec.end_et)],
            )
            relation = f"historical_roll_repair_{index}"
            insert_frame = replacements[spec.repair_id].copy()
            insert_frame.insert(0, "instrument", INSTRUMENT)
            connection.register(relation, insert_frame)
            try:
                connection.execute(
                    f"""
insert into futures_1m (instrument, ts, open, high, low, close, volume)
select instrument, ts, open, high, low, close, volume from {relation}
""".strip()
                )
            finally:
                connection.unregister(relation)
            written = _load_interval(connection, spec)
            if len(written) != spec.expected_replacement_rows:
                raise ValueError(f"{spec.repair_id} post-write row count mismatch")
            if _frame_fingerprint(written) != _frame_fingerprint(replacements[spec.repair_id]):
                raise ValueError(f"{spec.repair_id} post-write fingerprint mismatch")
        duplicates = int(connection.execute(
            "select count(*) - count(distinct ts) from futures_1m where instrument = ?", [INSTRUMENT]
        ).fetchone()[0])
        if duplicates:
            raise ValueError(f"historical repair created {duplicates} duplicate NQ timestamps")
        total_rows = int(connection.execute("select count(*) from futures_1m").fetchone()[0])
        nq_rows = int(connection.execute(
            "select count(*) from futures_1m where instrument = ?", [INSTRUMENT]
        ).fetchone()[0])
        connection.execute("commit")
        committed = True
        return {"totalRows": total_rows, "nqRows": nq_rows, "duplicates": duplicates}
    finally:
        if not committed:
            try:
                connection.execute("rollback")
            except Exception:
                pass
        connection.close()


def commit_preview(
    preview_token: str,
    confirm_text: str,
    *,
    repair_root: Path | str | None = None,
    backup_dir: Path | str | None = None,
    audit_path: Path | str | None = None,
) -> dict[str, object]:
    if str(confirm_text or "").strip() != EXPECTED_CONFIRMATION:
        raise ValueError(f"type '{EXPECTED_CONFIRMATION}' to execute historical repair")
    root = Path(repair_root).expanduser().resolve() if repair_root else default_repair_root()
    preview_dir, manifest = _load_manifest(root, preview_token)
    replacements = _verify_manifest_state(preview_dir, manifest)
    database = Path(str(manifest["databasePath"])).resolve()
    calendar = Path(str(manifest["calendarPath"])).resolve()
    candidate_calendar = (preview_dir / "futures_roll_calendar.yml").read_text(encoding="utf-8")
    backups = Path(backup_dir).expanduser().resolve() if backup_dir else root / "backups"
    audit = Path(audit_path).expanduser().resolve() if audit_path else root / "historical_roll_repair_audit.jsonl"
    backups.mkdir(parents=True, exist_ok=True)

    database_backup_result = market_data_backup_service.backup_market_data_database(
        database, backup_dir=backups / "market-data"
    )
    database_backup = Path(database_backup_result["backupPath"])
    stamp = datetime.now(ET).strftime("%Y%m%dT%H%M%S%z")
    calendar_backup = backups / "calendar" / f"futures_roll_calendar.{stamp}.yml"
    calendar_backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(calendar, calendar_backup)
    original_calendar = calendar.read_text(encoding="utf-8")
    original_audit = audit.read_text(encoding="utf-8") if audit.exists() else None
    manifest_path = preview_dir / "manifest.json"
    original_manifest = manifest_path.read_text(encoding="utf-8")
    database_committed = False
    try:
        result_counts = _apply_database_repair(database, replacements)
        database_committed = True
        _atomic_write_text(calendar, candidate_calendar)
        record = {
            "committedAt": datetime.now(ET).isoformat(timespec="seconds"),
            "previewToken": preview_token,
            "dataset": DATASET,
            "schema": SCHEMA,
            "instrument": INSTRUMENT,
            "databaseBackup": str(database_backup),
            "calendarBackup": str(calendar_backup),
            "previousCalendarRevision": manifest["calendarRevision"],
            "newCalendarRevision": roll_calendar_service.calendar_revision(calendar),
            "currentRowsReplaced": manifest["currentRowsInRepairIntervals"],
            "replacementRows": manifest["replacementRows"],
            "netRestoredMinutes": manifest["netRestoredMinutes"],
            "databaseCounts": result_counts,
            "repairs": manifest["repairs"],
        }
        _append_jsonl(audit, record)
        verification = verify_repair(database, calendar, preview_dir=preview_dir)
        manifest["status"] = "committed"
        manifest["committedAtEt"] = datetime.now(ET).isoformat(timespec="seconds")
        manifest["databaseBackup"] = str(database_backup)
        manifest["calendarBackup"] = str(calendar_backup)
        manifest["auditPath"] = str(audit)
        _atomic_write_text(
            manifest_path,
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        )
    except Exception as commit_error:
        rollback_errors = []
        if database_committed:
            try:
                _restore_database(database_backup, database)
            except Exception as rollback_error:
                rollback_errors.append(f"database: {rollback_error}")
        try:
            _atomic_write_text(calendar, original_calendar)
        except Exception as rollback_error:
            rollback_errors.append(f"calendar: {rollback_error}")
        try:
            if original_audit is None:
                audit.unlink(missing_ok=True)
            else:
                _atomic_write_text(audit, original_audit)
        except Exception as rollback_error:
            rollback_errors.append(f"audit: {rollback_error}")
        try:
            _atomic_write_text(manifest_path, original_manifest)
        except Exception as rollback_error:
            rollback_errors.append(f"manifest: {rollback_error}")
        if rollback_errors:
            raise RuntimeError(
                f"historical repair failed ({commit_error}); rollback also failed: {'; '.join(rollback_errors)}"
            ) from commit_error
        raise

    return {
        "ok": True,
        "returncode": 0,
        "previewToken": preview_token,
        "databaseBackup": str(database_backup),
        "calendarBackup": str(calendar_backup),
        "audit": str(audit),
        "verification": verification,
        "output": "\n".join([
            "historical_roll_repair_commit_status: committed",
            f"current_rows_replaced: {manifest['currentRowsInRepairIntervals']}",
            f"replacement_rows: {manifest['replacementRows']}",
            f"net_restored_minutes: {manifest['netRestoredMinutes']}",
            f"database_backup: {database_backup}",
            f"calendar_backup: {calendar_backup}",
            f"audit_log: {audit}",
            f"nq_duplicate_timestamps: {verification['nqDuplicates']}",
            "verification_status: ok",
        ]),
    }


def verify_repair(
    db_path: Path | str,
    calendar_path: Path | str,
    *,
    preview_dir: Path | str | None = None,
) -> dict[str, object]:
    database = Path(db_path).expanduser().resolve()
    calendar = Path(calendar_path).expanduser().resolve()
    expected_frames = {}
    if preview_dir:
        stage = Path(preview_dir).expanduser().resolve()
        manifest = json.loads((stage / "manifest.json").read_text(encoding="utf-8"))
        for item in manifest["repairs"]:
            expected_frames[str(item["repair_id"])] = pd.read_csv(stage / str(item["csv"]))
    interval_rows = {}
    with duckdb.connect(str(database), read_only=True) as conn:
        for spec in REPAIR_SPECS:
            frame = _load_interval(conn, spec)
            if len(frame) != spec.expected_replacement_rows:
                raise ValueError(f"{spec.repair_id} verification row count mismatch")
            if spec.repair_id in expected_frames and (
                _frame_fingerprint(frame) != _frame_fingerprint(expected_frames[spec.repair_id])
            ):
                raise ValueError(f"{spec.repair_id} verification fingerprint mismatch")
            interval_rows[spec.repair_id] = len(frame)
        duplicates = int(conn.execute(
            "select count(*) - count(distinct ts) from futures_1m where instrument = ?", [INSTRUMENT]
        ).fetchone()[0])
        nq_rows = int(conn.execute(
            "select count(*) from futures_1m where instrument = ?", [INSTRUMENT]
        ).fetchone()[0])
    if duplicates:
        raise ValueError(f"NQ verification found {duplicates} duplicate timestamps")
    data, events = roll_calendar_service.load_calendar(calendar)
    actual = {
        (event.old_contract, event.new_contract): event.effective_at_et.isoformat(timespec="minutes")
        for event in events if event.instrument == INSTRUMENT
    }
    for event in CALENDAR_EVENTS:
        expected = str(event["effective_at_et"])
        actual_value = actual.get((str(event["old_contract"]), str(event["new_contract"])))
        if actual_value != expected:
            raise ValueError(
                f"calendar verification mismatch for {event['old_contract']}->{event['new_contract']}: "
                f"expected {expected}, got {actual_value}"
            )
    return {
        "ok": True,
        "dataset": str(data.get("dataset")),
        "schema": str(data.get("schema")),
        "nqRows": nq_rows,
        "nqDuplicates": duplicates,
        "intervalRows": interval_rows,
        "calendarRevision": roll_calendar_service.calendar_revision(calendar),
    }
