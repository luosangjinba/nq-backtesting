"""Versioned futures roll-calendar domain and guarded mutation service.

This module owns roll-chain validation, safe calendar horizons, scan/preview
evidence, and atomic calendar commits.  It intentionally does not own market
data downloads or chart/session state.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import os
import re
import secrets
import shutil
import tempfile
import threading
import time
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime, time as wall_time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb
import yaml


ET = ZoneInfo("America/New_York")
CONTRACT_PATTERN = re.compile(r"^(ES|NQ)([HMUZ])(\d{1,2})$")
QUARTER_CYCLE = {"H": "M", "M": "U", "U": "Z", "Z": "H"}
CONTRACT_MONTH = {"H": 3, "M": 6, "U": 9, "Z": 12}
WRITE_ELIGIBLE_STATUSES = frozenset({
    "validated",
    "volume_validated",
    "manual_validated",
    "volume_confirmed",
    "manual_confirmed",
})
NEW_CONFIRMATION_STATUSES = frozenset({"volume_confirmed", "manual_confirmed"})
EVIDENCE_TTL_SECONDS = 30 * 60


@dataclass(frozen=True)
class RollEvent:
    instrument: str
    old_contract: str
    new_contract: str
    effective_at_et: datetime
    status: str
    note: str
    boundary_policy: str


_EVIDENCE_LOCK = threading.Lock()
_SCAN_EVIDENCE: dict[str, dict[str, object]] = {}
_PREVIEW_EVIDENCE: dict[str, dict[str, object]] = {}


def _et_naive(value: object, field: str) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime.combine(value, wall_time.min)
    else:
        text = str(value or "").strip()
        if not text:
            raise ValueError(f"{field} is required")
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(ET).replace(tzinfo=None)
    return parsed.replace(second=0, microsecond=0)


def _event_from_row(row: object) -> RollEvent:
    if not isinstance(row, dict):
        raise ValueError("each roll entry must be a mapping")
    legacy = "effective_at_et" not in row
    effective = row.get("effective_at_et") if not legacy else row.get("roll_date_et")
    return RollEvent(
        instrument=str(row.get("instrument") or "").strip().upper(),
        old_contract=str(row.get("old_contract") or "").strip().upper(),
        new_contract=str(row.get("new_contract") or "").strip().upper(),
        effective_at_et=_et_naive(effective, "effective_at_et" if not legacy else "roll_date_et"),
        status=str(row.get("status") or "unknown").strip(),
        note=str(row.get("note") or "").strip(),
        boundary_policy=str(row.get("boundary_policy") or ("legacy_midnight" if legacy else "explicit")).strip(),
    )


def calendar_revision(path: Path | str) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_calendar(path: Path | str) -> tuple[dict[str, object], list[RollEvent]]:
    calendar_path = Path(path).expanduser().resolve()
    data = yaml.safe_load(calendar_path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError("roll calendar root must be a mapping")
    rows = data.get("rolls")
    if not isinstance(rows, list):
        raise ValueError("roll calendar requires a rolls list")
    events = [_event_from_row(row) for row in rows]
    validate_calendar(data, events)
    return data, events


def parse_contract(contract: str) -> tuple[str, str, int, int]:
    match = CONTRACT_PATTERN.fullmatch(str(contract or "").strip().upper())
    if not match:
        raise ValueError(f"invalid quarterly contract: {contract}")
    prefix, quarter, raw_year = match.groups()
    return prefix, quarter, int(raw_year), len(raw_year)


def next_contract(contract: str) -> str:
    prefix, quarter, year, width = parse_contract(contract)
    next_quarter = QUARTER_CYCLE[quarter]
    next_year = year + (1 if quarter == "Z" else 0)
    modulus = 10 ** width
    return f"{prefix}{next_quarter}{next_year % modulus:0{width}d}"


def validate_calendar(data: dict[str, object], events: list[RollEvent]) -> None:
    version = int(data.get("version") or 1)
    if version not in {1, 2}:
        raise ValueError(f"unsupported roll calendar version: {version}")
    if str(data.get("timezone") or "America/New_York") != "America/New_York":
        raise ValueError("roll calendar timezone must be America/New_York")
    seen: set[tuple[str, str, str]] = set()
    by_instrument: dict[str, list[RollEvent]] = {}
    for event in events:
        if event.instrument not in {"ES", "NQ"}:
            raise ValueError(f"unsupported roll instrument: {event.instrument or 'empty'}")
        old_prefix, _, _, _ = parse_contract(event.old_contract)
        new_prefix, _, _, _ = parse_contract(event.new_contract)
        if old_prefix != event.instrument or new_prefix != event.instrument:
            raise ValueError(f"contract prefix does not match {event.instrument}: {event.old_contract}->{event.new_contract}")
        if next_contract(event.old_contract) != event.new_contract:
            raise ValueError(f"non-consecutive quarterly contracts: {event.old_contract}->{event.new_contract}")
        key = (event.instrument, event.old_contract, event.new_contract)
        if key in seen:
            raise ValueError(f"duplicate roll transition: {event.instrument} {event.old_contract}->{event.new_contract}")
        seen.add(key)
        by_instrument.setdefault(event.instrument, []).append(event)
    for instrument, rows in by_instrument.items():
        ordered = sorted(rows, key=lambda row: row.effective_at_et)
        if ordered != rows:
            raise ValueError(f"{instrument} roll entries must be ordered by effective time")
        for previous, current in zip(ordered, ordered[1:]):
            if previous.effective_at_et >= current.effective_at_et:
                raise ValueError(f"{instrument} roll effective times must increase strictly")
            if previous.new_contract != current.old_contract:
                raise ValueError(
                    f"broken {instrument} roll chain: {previous.new_contract} does not feed {current.old_contract}"
                )


def events_for_instrument(events: list[RollEvent], instrument: str) -> list[RollEvent]:
    normalized = str(instrument or "").strip().upper()
    rows = [event for event in events if event.instrument == normalized]
    if not rows:
        raise ValueError(f"roll calendar has no entries for {normalized}")
    return rows


def contract_for_instant(events: list[RollEvent], instrument: str, instant_et: datetime) -> tuple[str, str, str]:
    rows = events_for_instrument(events, instrument)
    selected_contract = rows[0].old_contract
    selected_status = rows[0].status
    selected_note = rows[0].note
    for event in rows:
        if instant_et < event.effective_at_et:
            break
        selected_contract = event.new_contract
        selected_status = event.status
        selected_note = event.note
    return selected_contract, selected_status, selected_note


def _full_contract_year(contract: str, reference_year: int) -> int:
    _, _, raw_year, width = parse_contract(contract)
    if width == 2:
        return 2000 + raw_year
    decade = (reference_year // 10) * 10
    candidates = [decade - 10 + raw_year, decade + raw_year, decade + 10 + raw_year]
    return min(candidates, key=lambda candidate: abs(candidate - reference_year))


def decision_deadline_et(contract: str, *, reference_year: int) -> datetime:
    """Return Monday of the quarterly third-Friday expiry week as a hard stop."""
    _, quarter, _, _ = parse_contract(contract)
    year = _full_contract_year(contract, reference_year)
    month = CONTRACT_MONTH[quarter]
    first = date(year, month, 1)
    first_friday = 1 + ((4 - first.weekday()) % 7)
    third_friday = date(year, month, first_friday + 14)
    expiry_week_monday = third_friday - timedelta(days=4)
    return datetime.combine(expiry_week_monday, wall_time.min)


def health_snapshot(path: Path | str, *, now_et: datetime | None = None) -> dict[str, object]:
    calendar_path = Path(path).expanduser().resolve()
    data, events = load_calendar(calendar_path)
    now = (now_et or datetime.now(ET).replace(tzinfo=None)).replace(second=0, microsecond=0)
    instruments = []
    for instrument in ("ES", "NQ"):
        rows = events_for_instrument(events, instrument)
        active_contract, _, _ = contract_for_instant(events, instrument, now)
        last = rows[-1]
        expected_old = last.new_contract
        expected_new = next_contract(expected_old)
        deadline = decision_deadline_et(expected_old, reference_year=now.year)
        if now >= deadline:
            state = "blocked"
        elif now >= deadline - timedelta(days=14):
            state = "due-soon"
        else:
            state = "ready"
        instruments.append({
            "instrument": instrument,
            "activeContract": active_contract,
            "lastConfirmedContract": last.new_contract,
            "lastEffectiveAtEt": last.effective_at_et.isoformat(timespec="minutes"),
            "nextOldContract": expected_old,
            "nextNewContract": expected_new,
            "decisionDeadlineEt": deadline.isoformat(timespec="minutes"),
            "state": state,
            "horizonPolicy": "expiry-week Monday hard stop; confirm earlier from complete trade-date volume evidence",
        })
    return {
        "ok": True,
        "returncode": 0,
        "calendar": str(calendar_path),
        "calendarVersion": int(data.get("version") or 1),
        "calendarRevision": calendar_revision(calendar_path),
        "rollHealth": instruments,
        "output": _format_health_output(instruments, calendar_path),
    }


def _format_health_output(items: list[dict[str, object]], path: Path) -> str:
    lines = ["roll_health_status: ok", f"calendar: {path}"]
    for item in items:
        lines.extend([
            f"{item['instrument']}_active_contract: {item['activeContract']}",
            f"{item['instrument']}_next_transition: {item['nextOldContract']}->{item['nextNewContract']}",
            f"{item['instrument']}_decision_deadline_et: {item['decisionDeadlineEt']}",
            f"{item['instrument']}_roll_state: {item['state']}",
        ])
    lines.append("report_mode: read-only")
    return "\n".join(lines)


def assert_range_within_horizon(
    events: list[RollEvent], instrument: str, end_et: datetime, *, reference_year: int | None = None,
) -> datetime:
    rows = events_for_instrument(events, instrument)
    last_contract = rows[-1].new_contract
    deadline = decision_deadline_et(last_contract, reference_year=reference_year or end_et.year)
    if end_et > deadline:
        raise ValueError(
            f"roll calendar horizon exceeded for {instrument}: end {end_et.isoformat(timespec='minutes')} is after "
            f"{deadline.isoformat(timespec='minutes')}; confirm {last_contract}->{next_contract(last_contract)} first"
        )
    return deadline


def trade_date_for_et(timestamp: datetime) -> date:
    naive = timestamp.astimezone(ET).replace(tzinfo=None) if timestamp.tzinfo else timestamp
    return naive.date() + timedelta(days=1) if naive.time() >= wall_time(18, 0) else naive.date()


def session_open_for_trade_date(trade_date: date | str) -> datetime:
    parsed = date.fromisoformat(trade_date) if isinstance(trade_date, str) else trade_date
    return datetime.combine(parsed - timedelta(days=1), wall_time(18, 0))


def record_scan_evidence(
    calendar_path: Path | str,
    *,
    instrument: str,
    old_contract: str,
    new_contract: str,
    candidate_trade_date: str,
    scan_start: str,
    scan_end: str,
    output: str,
) -> dict[str, object]:
    candidate = date.fromisoformat(str(candidate_trade_date))
    health = health_snapshot(calendar_path)
    item = next(row for row in health["rollHealth"] if row["instrument"] == instrument)
    if old_contract != item["nextOldContract"] or new_contract != item["nextNewContract"]:
        raise ValueError(
            f"scan contracts are stale; expected {item['nextOldContract']}->{item['nextNewContract']}"
        )
    token = f"roll-scan-{secrets.token_urlsafe(18)}"
    evidence = {
        "token": token,
        "createdAt": time.time(),
        "calendarRevision": health["calendarRevision"],
        "instrument": instrument,
        "oldContract": old_contract,
        "newContract": new_contract,
        "candidateTradeDate": candidate.isoformat(),
        "effectiveAtEt": session_open_for_trade_date(candidate).isoformat(timespec="minutes"),
        "scanStart": scan_start,
        "scanEnd": scan_end,
        "outputDigest": hashlib.sha256(output.encode("utf-8")).hexdigest(),
    }
    with _EVIDENCE_LOCK:
        _SCAN_EVIDENCE[token] = evidence
    return deepcopy(evidence)


def _require_fresh_evidence(store: dict[str, dict[str, object]], token: str, label: str) -> dict[str, object]:
    with _EVIDENCE_LOCK:
        evidence = deepcopy(store.get(str(token or "")))
    if not evidence:
        raise ValueError(f"{label} token is missing or no longer retained")
    if time.time() - float(evidence["createdAt"]) > EVIDENCE_TTL_SECONDS:
        raise ValueError(f"{label} token expired; run the preceding step again")
    return evidence


def _database_max_ts(db_path: Path | str, instrument: str) -> datetime | None:
    path = Path(db_path).expanduser().resolve()
    if not path.exists():
        return None
    with duckdb.connect(str(path), read_only=True) as conn:
        return conn.execute(
            "select max(ts) from futures_1m where instrument = ?", [instrument]
        ).fetchone()[0]


def create_roll_preview(
    calendar_path: Path | str,
    db_path: Path | str,
    *,
    scan_token: str,
    status: str,
    note: str,
) -> dict[str, object]:
    if status not in NEW_CONFIRMATION_STATUSES:
        raise ValueError("new roll status must be volume_confirmed or manual_confirmed")
    clean_note = str(note or "").strip()
    if not clean_note or "\n" in clean_note or "\r" in clean_note:
        raise ValueError("a single-line evidence note is required")
    evidence = _require_fresh_evidence(_SCAN_EVIDENCE, scan_token, "scan")
    calendar_path = Path(calendar_path).expanduser().resolve()
    revision = calendar_revision(calendar_path)
    if revision != evidence["calendarRevision"]:
        raise ValueError("roll calendar changed after the scan; scan again")
    data, events = load_calendar(calendar_path)
    instrument = str(evidence["instrument"])
    effective = _et_naive(evidence["effectiveAtEt"], "effectiveAtEt")
    max_ts = _database_max_ts(db_path, instrument)
    if max_ts is not None and max_ts >= effective:
        raise ValueError(
            f"historical roll repair required: {instrument} database already reaches {max_ts.isoformat(sep=' ')} "
            f"at/after proposed boundary {effective.isoformat(sep=' ')}"
        )
    candidate = deepcopy(data)
    candidate["version"] = 2
    candidate.setdefault("timezone", "America/New_York")
    candidate_rows = candidate.setdefault("rolls", [])
    candidate_rows.append({
        "instrument": instrument,
        "old_contract": evidence["oldContract"],
        "new_contract": evidence["newContract"],
        "roll_date_et": evidence["candidateTradeDate"],
        "effective_at_et": evidence["effectiveAtEt"],
        "boundary_policy": "cme_trade_date_session_open",
        "status": status,
        "evidence_type": "trade_date_volume_scan",
        "scan_start_et": evidence["scanStart"],
        "scan_end_et": evidence["scanEnd"],
        "confirmed_at": datetime.now(ET).isoformat(timespec="seconds"),
        "note": clean_note,
    })
    candidate_events = [_event_from_row(row) for row in candidate_rows]
    validate_calendar(candidate, candidate_events)
    new_text = yaml.safe_dump(candidate, sort_keys=False, allow_unicode=True)
    old_text = calendar_path.read_text(encoding="utf-8")
    diff = "\n".join(difflib.unified_diff(
        old_text.splitlines(), new_text.splitlines(),
        fromfile=str(calendar_path), tofile=str(calendar_path), lineterm="",
    ))
    preview_token = f"roll-preview-{secrets.token_urlsafe(18)}"
    expected = f"ROLL {evidence['oldContract']} {evidence['newContract']}"
    preview = {
        "token": preview_token,
        "createdAt": time.time(),
        "calendarRevision": revision,
        "calendarPath": str(calendar_path),
        "newText": new_text,
        "instrument": instrument,
        "oldContract": evidence["oldContract"],
        "newContract": evidence["newContract"],
        "effectiveAtEt": evidence["effectiveAtEt"],
        "expectedConfirmation": expected,
        "note": clean_note,
        "status": status,
    }
    with _EVIDENCE_LOCK:
        _PREVIEW_EVIDENCE[preview_token] = preview
    return {
        "ok": True,
        "returncode": 0,
        "previewToken": preview_token,
        "expectedConfirmation": expected,
        "rollPreview": {key: value for key, value in preview.items() if key not in {"newText", "token", "createdAt"}},
        "output": "\n".join([
            "roll_preview_status: ok",
            f"instrument: {instrument}",
            f"transition: {evidence['oldContract']}->{evidence['newContract']}",
            f"effective_at_et: {evidence['effectiveAtEt']}",
            f"expected_confirmation: {expected}",
            "history_guard: clear",
            "",
            diff,
        ]),
    }


def _atomic_write(path: Path, text: str) -> None:
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        directory_fd = os.open(path.parent, os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def commit_roll_preview(
    calendar_path: Path | str,
    *,
    preview_token: str,
    confirm_text: str,
    backup_dir: Path | str,
    audit_path: Path | str,
) -> dict[str, object]:
    preview = _require_fresh_evidence(_PREVIEW_EVIDENCE, preview_token, "preview")
    path = Path(calendar_path).expanduser().resolve()
    if str(path) != preview["calendarPath"]:
        raise ValueError("preview belongs to a different roll calendar")
    if str(confirm_text or "").strip() != preview["expectedConfirmation"]:
        raise ValueError(f"type '{preview['expectedConfirmation']}' to commit the roll")
    if calendar_revision(path) != preview["calendarRevision"]:
        raise ValueError("roll calendar changed after Preview; Preview again")
    parsed = yaml.safe_load(str(preview["newText"])) or {}
    events = [_event_from_row(row) for row in parsed.get("rolls") or []]
    validate_calendar(parsed, events)
    backups = Path(backup_dir).expanduser().resolve()
    backups.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(ET).strftime("%Y%m%dT%H%M%S%z")
    backup = backups / f"{path.stem}.{stamp}.{str(preview['calendarRevision'])[:12]}.yml"
    shutil.copy2(path, backup)
    _atomic_write(path, str(preview["newText"]))
    new_revision = calendar_revision(path)
    audit = Path(audit_path).expanduser().resolve()
    audit.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "committedAt": datetime.now(ET).isoformat(timespec="seconds"),
        "instrument": preview["instrument"],
        "oldContract": preview["oldContract"],
        "newContract": preview["newContract"],
        "effectiveAtEt": preview["effectiveAtEt"],
        "status": preview["status"],
        "note": preview["note"],
        "previousRevision": preview["calendarRevision"],
        "newRevision": new_revision,
        "backup": str(backup),
    }
    with audit.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    with _EVIDENCE_LOCK:
        _PREVIEW_EVIDENCE.clear()
        _SCAN_EVIDENCE.clear()
    result = health_snapshot(path)
    result.update({
        "backup": str(backup),
        "audit": str(audit),
        "newRevision": new_revision,
        "output": "\n".join([
            "roll_commit_status: committed",
            f"transition: {preview['oldContract']}->{preview['newContract']}",
            f"effective_at_et: {preview['effectiveAtEt']}",
            f"calendar_backup: {backup}",
            f"calendar_revision: {new_revision}",
            f"audit_log: {audit}",
        ]),
    })
    return result
