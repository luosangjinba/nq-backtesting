"""Reviewed manifest schema and static validation for historical roll repairs."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import yaml

from . import roll_calendar_service
from .manifest_roll_repair_registry import PLAN_ID_PATTERN


ET = ZoneInfo("America/New_York")
FINGERPRINT_PATTERN = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class RepairSpec:
    repair_id: str
    transition: str
    source_contract: str
    start_et: str
    end_et: str
    expected_current_rows: int
    expected_replacement_rows: int
    expected_replacement_fingerprint: str


@dataclass(frozen=True)
class RepairPlan:
    version: int
    plan_id: str
    dataset: str
    schema: str
    instrument: str
    expected_confirmation: str
    audit_document: str
    expected_current_rows: int
    expected_replacement_rows: int
    expected_net_restored_minutes: int
    repairs: tuple[RepairSpec, ...]
    calendar_events: tuple[dict[str, object], ...]
    path: Path
    revision: str


def _single_line(value: object, field: str, max_length: int = 500) -> str:
    text = str(value or "").strip()
    if not text or "\n" in text or "\r" in text or len(text) > max_length:
        raise ValueError(f"manifest field {field} must be non-empty single-line text")
    return text


def _iso_naive(value: object, field: str) -> str:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime.combine(value, datetime.min.time())
    else:
        try:
            parsed = datetime.fromisoformat(_single_line(value, field, 40).replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"manifest field {field} must be an ISO datetime") from exc
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(ET).replace(tzinfo=None)
    return parsed.isoformat(timespec="seconds")


def _calendar_scalar(value: object) -> object:
    if isinstance(value, datetime):
        return value.isoformat(timespec="minutes")
    if isinstance(value, date):
        return value.isoformat()
    return value


def load_plan(plan_path: Path | str) -> RepairPlan:
    path = Path(plan_path).expanduser().resolve()
    if not path.is_file():
        raise ValueError("historical roll repair manifest does not exist")
    raw_bytes = path.read_bytes()
    payload = yaml.safe_load(raw_bytes) or {}
    if not isinstance(payload, dict) or int(payload.get("version") or 0) != 1:
        raise ValueError("historical roll repair manifest version must be 1")
    plan_id = _single_line(payload.get("plan_id"), "plan_id", 81)
    if not PLAN_ID_PATTERN.fullmatch(plan_id):
        raise ValueError("historical roll repair manifest has invalid plan_id")
    dataset = _single_line(payload.get("dataset"), "dataset", 80)
    schema = _single_line(payload.get("schema"), "schema", 80)
    instrument = _single_line(payload.get("instrument"), "instrument", 8).upper()
    roll_calendar_service.parse_contract(f"{instrument}H0")
    confirmation = _single_line(payload.get("expected_confirmation"), "expected_confirmation", 80)
    audit_document = _single_line(payload.get("audit_document"), "audit_document", 300)

    raw_repairs = payload.get("repairs")
    if not isinstance(raw_repairs, list) or not raw_repairs:
        raise ValueError("historical roll repair manifest requires repairs")
    repairs = []
    seen_ids: set[str] = set()
    for index, row in enumerate(raw_repairs):
        if not isinstance(row, dict):
            raise ValueError("each historical roll repair must be a mapping")
        repair_id = _single_line(row.get("repair_id"), f"repairs[{index}].repair_id", 100)
        if repair_id in seen_ids:
            raise ValueError(f"duplicate repair_id: {repair_id}")
        seen_ids.add(repair_id)
        transition = _single_line(row.get("transition"), f"repairs[{index}].transition", 40).upper()
        parts = transition.split("->")
        if len(parts) != 2 or roll_calendar_service.next_contract(parts[0]) != parts[1]:
            raise ValueError(f"invalid quarterly transition: {transition}")
        if any(not part.startswith(instrument) for part in parts):
            raise ValueError(f"transition prefix does not match {instrument}: {transition}")
        source_contract = _single_line(
            row.get("source_contract"), f"repairs[{index}].source_contract", 20
        ).upper()
        source_prefix, _, _, _ = roll_calendar_service.parse_contract(source_contract)
        if source_prefix != instrument or source_contract not in parts:
            raise ValueError(
                f"replacement source must be one side of {transition}: {source_contract}"
            )
        start_et = _iso_naive(row.get("start_et"), f"repairs[{index}].start_et")
        end_et = _iso_naive(row.get("end_et"), f"repairs[{index}].end_et")
        if datetime.fromisoformat(start_et) >= datetime.fromisoformat(end_et):
            raise ValueError(f"{repair_id} must use a non-empty half-open interval")
        current_rows = int(row.get("expected_current_rows") or 0)
        replacement_rows = int(row.get("expected_replacement_rows") or 0)
        if current_rows <= 0 or replacement_rows <= 0:
            raise ValueError(f"{repair_id} row expectations must be positive")
        fingerprint = _single_line(
            row.get("expected_replacement_fingerprint"),
            f"repairs[{index}].expected_replacement_fingerprint",
            64,
        ).lower()
        if not FINGERPRINT_PATTERN.fullmatch(fingerprint):
            raise ValueError(f"{repair_id} has invalid replacement fingerprint")
        repairs.append(RepairSpec(
            repair_id,
            transition,
            source_contract,
            start_et,
            end_et,
            current_rows,
            replacement_rows,
            fingerprint,
        ))

    ordered = sorted(repairs, key=lambda item: datetime.fromisoformat(item.start_et))
    for previous, current in zip(ordered, ordered[1:]):
        if datetime.fromisoformat(previous.end_et) > datetime.fromisoformat(current.start_et):
            raise ValueError(f"repair intervals overlap: {previous.repair_id}, {current.repair_id}")

    raw_events = payload.get("calendar_events")
    if not isinstance(raw_events, list) or not raw_events:
        raise ValueError("historical roll repair manifest requires calendar_events")
    calendar_events = []
    event_transitions = set()
    for index, source in enumerate(raw_events):
        if not isinstance(source, dict):
            raise ValueError("each calendar event must be a mapping")
        event = {str(key): _calendar_scalar(value) for key, value in source.items()}
        event["instrument"] = _single_line(
            event.get("instrument"), f"calendar_events[{index}].instrument", 8
        ).upper()
        event["old_contract"] = _single_line(
            event.get("old_contract"), f"calendar_events[{index}].old_contract", 20
        ).upper()
        event["new_contract"] = _single_line(
            event.get("new_contract"), f"calendar_events[{index}].new_contract", 20
        ).upper()
        if event["instrument"] != instrument:
            raise ValueError("calendar event instrument does not match manifest")
        parsed = roll_calendar_service._event_from_row(event)
        if roll_calendar_service.next_contract(str(event["old_contract"])) != str(event["new_contract"]):
            raise ValueError(
                f"non-consecutive calendar event: {event['old_contract']}->{event['new_contract']}"
            )
        if parsed.status not in roll_calendar_service.NEW_CONFIRMATION_STATUSES:
            raise ValueError(f"calendar event status is not confirmed: {parsed.status}")
        key = (event["old_contract"], event["new_contract"])
        if key in event_transitions:
            raise ValueError(f"duplicate calendar event: {key[0]}->{key[1]}")
        event_transitions.add(key)
        calendar_events.append(event)
    for repair in repairs:
        old_contract, new_contract = repair.transition.split("->")
        if (old_contract, new_contract) not in event_transitions:
            raise ValueError(f"calendar_events does not cover repair {repair.transition}")

    totals = payload.get("expected_totals")
    if not isinstance(totals, dict):
        raise ValueError("historical roll repair manifest requires expected_totals")
    expected_current = int(totals.get("current_rows") or 0)
    expected_replacement = int(totals.get("replacement_rows") or 0)
    expected_net = int(totals.get("net_restored_minutes") or 0)
    actual_current = sum(item.expected_current_rows for item in repairs)
    actual_replacement = sum(item.expected_replacement_rows for item in repairs)
    if (expected_current, expected_replacement, expected_net) != (
        actual_current,
        actual_replacement,
        actual_replacement - actual_current,
    ):
        raise ValueError("historical roll repair manifest expected_totals do not match repairs")
    return RepairPlan(
        1,
        plan_id,
        dataset,
        schema,
        instrument,
        confirmation,
        audit_document,
        expected_current,
        expected_replacement,
        expected_net,
        tuple(repairs),
        tuple(calendar_events),
        path,
        hashlib.sha256(raw_bytes).hexdigest(),
    )
