#!/usr/bin/env python3
"""Verify the legacy and deployed V4 entries keep distinct handler boundaries."""

from __future__ import annotations

import ast
import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"

def parse_source(relative_path: str):
    source = (V4_ROOT / relative_path).read_text(encoding="utf-8")
    return source, ast.parse(source, filename=relative_path)


def imported_names(tree: ast.AST, module: str):
    return {
        alias.name
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module == module
        for alias in node.names
    }


def imported_modules(tree: ast.AST):
    modules = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            modules.add(node.module)
        elif isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
    return modules


def called_names(tree: ast.AST):
    return {
        node.func.id
        for node in ast.walk(tree)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    }


api_source, api_tree = parse_source("v4_api.py")
read_source, read_tree = parse_source("read_api.py")

required_imports = {
    "server.bars_handler": {
        "handle_bars_request",
        "handle_price_request",
        "handle_projected_history_request",
        "handle_target_bars_request",
    },
    "server.economic_calendar_handler": {"handle_economic_events_request"},
    "server.maintenance_handler": {"handle_data_maintenance_post_request"},
    "server.workspace_handler": {
        "handle_workspace_get_request",
        "handle_workspace_put_request",
    },
}

for module, names in required_imports.items():
    assert names <= imported_names(api_tree, module), (module, names)

required_calls = [
    "handle_bars_request(",
    "handle_price_request(",
    "handle_economic_events_request(",
    "handle_workspace_get_request(",
    "handle_workspace_put_request(",
    "handle_data_maintenance_post_request(",
]

api_calls = called_names(api_tree)
for call in required_calls:
    assert call.removesuffix("(") in api_calls, call

assert imported_names(read_tree, "server.market_data_read_handler") == {
    "READ_ONLY_GET_PATHS",
    "build_market_data_read_handler",
}
for forbidden_module in {
    "server.maintenance_handler",
    "server.maintenance_service",
    "server.workspace_handler",
    "server.workspace_store",
}:
    assert forbidden_module not in imported_modules(read_tree), forbidden_module
assert "build_market_data_read_handler(" in read_source
assert "ThreadingHTTPServer((host, port), V4ReadOnlyHandler)" in read_source

for path in [
    V4_ROOT / "server" / "bars_handler.py",
    V4_ROOT / "server" / "workspace_handler.py",
    V4_ROOT / "server" / "maintenance_handler.py",
    V4_ROOT / "server" / "economic_calendar_handler.py",
]:
    assert path.exists(), str(path)

print("backend handler boundary smoke passed")
