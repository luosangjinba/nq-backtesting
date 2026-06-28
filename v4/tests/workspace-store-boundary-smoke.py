#!/usr/bin/env python3
"""Verify workspace persistence lives outside v4_api.py."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")
store_source = (V4_ROOT / "server" / "workspace_store.py").read_text(encoding="utf-8")

for expected in [
    "from server import workspace_store",
    "workspace_store.read_workspace_document",
    "workspace_store.write_workspace_document",
    "workspace_store.configure_workspace_store",
]:
    assert expected in api_source, f"v4_api.py should delegate workspace behavior via {expected}"

for forbidden in [
    "WORKSPACE_DOMAIN_RE =",
    "WORKSPACE_INSTRUMENT_RE =",
    "ALLOWED_WORKSPACE_DOMAINS =",
    "_WORKSPACE_LOCK =",
    "def _normalize_workspace_domain",
    "def _normalize_workspace_instrument",
    "def _workspace_document_path",
    "def _workspace_response",
]:
    assert forbidden not in api_source, f"v4_api.py should not own workspace implementation: {forbidden}"

for expected in [
    "WORKSPACE_DOMAIN_RE =",
    "WORKSPACE_INSTRUMENT_RE =",
    "ALLOWED_WORKSPACE_DOMAINS =",
    "_WORKSPACE_LOCK =",
    "def _normalize_workspace_domain",
    "def _normalize_workspace_instrument",
    "def _workspace_document_path",
    "def _workspace_response",
    "def read_workspace_document",
    "def write_workspace_document",
]:
    assert expected in store_source, f"workspace_store.py should own {expected}"

print("workspace store boundary smoke passed")
