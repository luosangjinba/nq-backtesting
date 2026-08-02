"""Resolve reviewed historical-roll manifests without accepting arbitrary paths."""

from __future__ import annotations

import re
from pathlib import Path

import yaml


PLAN_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{2,80}$")


def resolve_plan(plan_id: str, plan_dir: Path | str) -> Path:
    normalized = str(plan_id or "").strip()
    if not PLAN_ID_PATTERN.fullmatch(normalized):
        raise ValueError("invalid historical roll repair planId")
    root = Path(plan_dir).expanduser().resolve()
    plan = (root / f"{normalized}.yml").resolve()
    if plan.parent != root:
        raise ValueError("historical roll repair plan escaped its registry")
    if not plan.is_file():
        raise ValueError(f"unknown historical roll repair plan: {normalized}")
    return plan


def expected_confirmation(plan_path: Path | str) -> str:
    path = Path(plan_path).expanduser().resolve()
    payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    value = str(payload.get("expected_confirmation") or "").strip()
    if not value or "\n" in value or len(value) > 80:
        raise ValueError("historical roll repair manifest has invalid expected_confirmation")
    return value
