#!/usr/bin/env python3
"""Verify maintenance execution and local env services live outside v4_api.py."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")
maintenance_source = (V4_ROOT / "server" / "maintenance_service.py").read_text(encoding="utf-8")
local_env_source = (V4_ROOT / "server" / "local_env_service.py").read_text(encoding="utf-8")
roll_maintenance_source = (V4_ROOT / "server" / "roll_maintenance_service.py").read_text(encoding="utf-8")
manifest_repair_source = (V4_ROOT / "server" / "manifest_historical_roll_repair_service.py").read_text(encoding="utf-8")
manifest_plan_source = (V4_ROOT / "server" / "historical_roll_repair_plan.py").read_text(encoding="utf-8")

for expected in [
    "from server import local_env_service",
    "from server import maintenance_service",
    "maintenance_service.run_maintenance_command",
    "local_env_service.run_local_env_action",
    "maintenance_service.run_api_restart_action",
    "maintenance_service.run_data_maintenance_action_guarded",
    "roll_maintenance_service.run_roll_action",
    '"--db",\n            DB_PATH',
    'if action == "confirm_roll_write":',
    "Legacy roll-calendar writes are disabled",
    '"historical_roll_repair_preview"',
    '"historical_roll_repair_write"',
    '"historical_roll_repair_verify"',
    '"v4/scripts/repair_nq_2025_rolls.py"',
    '"REPAIR NQ 2025"',
    '"manifest_roll_repair_preview"',
    '"manifest_roll_repair_write"',
    '"manifest_roll_repair_verify"',
    '"v4/scripts/repair_historical_roll_manifest.py"',
    "manifest_roll_repair_registry.resolve_plan",
    "manifest_roll_repair_registry.expected_confirmation",
]:
    assert expected in api_source, f"v4_api.py should delegate maintenance behavior via {expected}"

for forbidden in [
    "_MAINTENANCE_LOCK =",
    "_MAINTENANCE_JOB =",
    "_MAINTENANCE_PROCESS =",
    "LOCAL_ENV_VARIABLES =",
    "def _parse_local_env_lines",
    "def _write_local_env_entries",
    "def _terminate_active_maintenance_process",
    "def _schedule_api_restart",
]:
    assert forbidden not in api_source, f"v4_api.py should not own maintenance service detail: {forbidden}"

for expected in [
    "_MAINTENANCE_LOCK =",
    "_MAINTENANCE_JOB =",
    "_MAINTENANCE_PROCESS =",
    "def _start_background_job",
    "def _job_status_result",
    "def run_maintenance_command",
    "def run_api_restart_action",
    "def run_data_maintenance_action_guarded",
]:
    assert expected in maintenance_source, f"maintenance_service.py should own {expected}"

for expected in [
    "ROLL_ACTIONS =",
    "def run_roll_action",
    "roll_calendar_service.health_snapshot",
    '"--min-session-minutes", "1200"',
]:
    assert expected in roll_maintenance_source, f"roll_maintenance_service.py should own {expected}"

for expected in [
    "from .historical_roll_repair_plan import RepairPlan, RepairSpec, load_plan",
    "def create_preview",
    "def commit_preview",
    "def verify_repair",
]:
    assert expected in manifest_repair_source, f"manifest repair runtime should own {expected}"

for expected in [
    "class RepairSpec",
    "class RepairPlan",
    "def load_plan",
]:
    assert expected in manifest_plan_source, f"manifest repair plan domain should own {expected}"

for expected in [
    "LOCAL_ENV_VARIABLES =",
    "def _parse_local_env_lines",
    "def _write_local_env_entries",
    "def run_local_env_action",
]:
    assert expected in local_env_source, f"local_env_service.py should own {expected}"

print("maintenance service boundary smoke passed")
