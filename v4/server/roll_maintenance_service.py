"""Maintenance adapter for Roll Calendar v2 actions."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from . import roll_calendar_service


ROLL_ACTIONS = frozenset({
    "roll_report",
    "roll_health",
    "roll_scan_v2",
    "roll_preview_v2",
    "roll_commit_v2",
})


def _text(value: object, field: str, max_length: int = 500) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"{field} is required")
    if "\n" in text or "\r" in text:
        raise ValueError(f"{field} must be single-line text")
    if len(text) > max_length:
        raise ValueError(f"{field} is too long")
    return text


def _choice(value: object, allowed: set[str] | frozenset[str], field: str) -> str:
    text = _text(value, field, 80)
    if text not in allowed:
        raise ValueError(f"invalid {field}: {text}")
    return text


def _iso_date(value: object, field: str) -> str:
    text = _text(value, field, 20)
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError as exc:
        raise ValueError(f"{field} must be an ISO date") from exc


def _metric(output: object, name: str) -> str:
    prefix = f"{name}:"
    for line in str(output or "").splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return ""


def run_roll_action(
    action: str,
    payload: dict[str, object],
    *,
    calendar_path: Path | str,
    db_path: Path | str,
    backup_dir: Path | str,
    audit_path: Path | str,
    python: str,
    run_command,
) -> dict[str, object]:
    if action not in ROLL_ACTIONS:
        raise ValueError(f"unsupported Roll Calendar action: {action}")
    if action in {"roll_report", "roll_health"}:
        return roll_calendar_service.health_snapshot(calendar_path)
    if action == "roll_preview_v2":
        return roll_calendar_service.create_roll_preview(
            calendar_path,
            db_path,
            scan_token=_text(payload.get("scanToken"), "scanToken", 160),
            status=_choice(
                payload.get("status"), roll_calendar_service.NEW_CONFIRMATION_STATUSES, "status"
            ),
            note=_text(payload.get("note"), "note", 500),
        )
    if action == "roll_commit_v2":
        return roll_calendar_service.commit_roll_preview(
            calendar_path,
            preview_token=_text(payload.get("previewToken"), "previewToken", 160),
            confirm_text=_text(payload.get("confirmText"), "confirmText", 120),
            backup_dir=backup_dir,
            audit_path=audit_path,
        )

    instrument = _choice(payload.get("instrument"), {"ES", "NQ"}, "instrument")
    scan_start = _iso_date(payload.get("scanStart"), "scanStart")
    scan_end = _iso_date(payload.get("scanEnd"), "scanEnd")
    start_date = date.fromisoformat(scan_start)
    end_date = date.fromisoformat(scan_end)
    if end_date < start_date:
        raise ValueError("scanEnd must be on or after scanStart")
    start = roll_calendar_service.session_open_for_trade_date(start_date).isoformat(timespec="minutes")
    end = roll_calendar_service.session_open_for_trade_date(end_date + timedelta(days=1)).isoformat(timespec="minutes")
    health = roll_calendar_service.health_snapshot(calendar_path)
    item = next(row for row in health["rollHealth"] if row["instrument"] == instrument)
    old_contract = str(item["nextOldContract"])
    new_contract = str(item["nextNewContract"])
    result = run_command([
        python, "v4/scripts/scan_roll_volume_candidates.py",
        "--instrument", instrument,
        "--old-contract", old_contract,
        "--new-contract", new_contract,
        "--start", start,
        "--end", end,
        "--min-session-minutes", "1200",
    ], timeout=1800)
    if result.get("ok"):
        candidate = _metric(result.get("output"), "candidate_roll_date")
        result["rollScan"] = None
        if candidate and candidate != "n/a":
            result["rollScan"] = roll_calendar_service.record_scan_evidence(
                calendar_path,
                instrument=instrument,
                old_contract=old_contract,
                new_contract=new_contract,
                candidate_trade_date=candidate,
                scan_start=scan_start,
                scan_end=scan_end,
                output=str(result.get("output") or ""),
            )
    return result
