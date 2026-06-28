#!/usr/bin/env python3
"""Run grouped V4 smoke checks from one entry point.

Default suite is intentionally local-only: it should not require a running API
server, browser, network access, or writable production data.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class SmokeCommand:
    name: str
    argv: list[str]
    suite: str
    description: str


def python(*args: str) -> list[str]:
    return [sys.executable, *args]


def build_commands(args: argparse.Namespace) -> list[SmokeCommand]:
    local = [
        SmokeCommand(
            "py_compile_core",
            python(
                "-m",
                "py_compile",
                "v4/v4_api.py",
                "v4/scripts/export_weekly_economic_manual_csv.py",
                "v4/scripts/smoke_all.py",
            ),
            "local",
            "Compile core Python entry points.",
        ),
        SmokeCommand(
            "workspace_api_smoke",
            python("v4/tests/workspace-api-smoke.py"),
            "local",
            "Exercise workspace API helpers without a running server.",
        ),
        SmokeCommand(
            "economic_manual_import_smoke",
            python("v4/tests/economic-manual-import-smoke.py"),
            "local",
            "Exercise manual economic CSV preview/write helpers in a temp directory.",
        ),
        SmokeCommand(
            "economic_weekly_manual_export_smoke",
            python("v4/tests/economic-weekly-manual-export-smoke.py"),
            "local",
            "Exercise weekly manual export conversion using fixture raw CSVs.",
        ),
        SmokeCommand(
            "data_maintenance_api_base_smoke",
            ["node", "v4/tests/data-maintenance-api-base-smoke.js"],
            "local",
            "Verify Data Maintenance resolves local/API proxy bases correctly.",
        ),
        SmokeCommand(
            "bars_api_boundary_smoke",
            ["node", "v4/tests/bars-api-boundary-smoke.js"],
            "local",
            "Verify UI and feature modules use the bars API client boundary.",
        ),
        SmokeCommand(
            "primary_bars_runtime_boundary_smoke",
            ["node", "v4/tests/primary-bars-runtime-boundary-smoke.js"],
            "local",
            "Verify primary bars writes go through the primary bars runtime.",
        ),
        SmokeCommand(
            "primary_chart_runtime_boundary_smoke",
            ["node", "v4/tests/primary-chart-runtime-boundary-smoke.js"],
            "local",
            "Verify primary chart series writes go through the primary chart runtime.",
        ),
        SmokeCommand(
            "runtime_commands_smoke",
            ["node", "v4/tests/runtime-commands-smoke.js"],
            "local",
            "Verify runtime command validation and no-op behavior.",
        ),
        SmokeCommand(
            "ui_command_boundary_smoke",
            ["node", "v4/tests/ui-command-boundary-smoke.js"],
            "local",
            "Verify UI modules use runtime commands for primary bar loading.",
        ),
        SmokeCommand(
            "chart_mode_store_smoke",
            ["node", "v4/tests/chart-mode-store-smoke.js"],
            "local",
            "Verify chart mode transitions and fallback behavior.",
        ),
        SmokeCommand(
            "replay_model_smoke",
            ["node", "v4/tests/replay-model-smoke.js"],
            "local",
            "Verify legacy replay model state transitions.",
        ),
        SmokeCommand(
            "git_diff_check",
            ["git", "diff", "--check"],
            "local",
            "Reject whitespace errors in unstaged changes.",
        ),
    ]

    api = [
        SmokeCommand(
            "server_status",
            python("v4/scripts/server_status.py", "--api-url", args.api_url, "--web-url", args.web_url),
            "api",
            "Check web/API health, DB coverage, and key data files.",
        ),
        SmokeCommand(
            "verify_es_bars_api",
            python("v4/scripts/verify_v4_bars_api.py", "--instrument", "ES", "--api-url", args.api_url),
            "api",
            "Fetch recent ES bars from the running API.",
        ),
        SmokeCommand(
            "verify_nq_bars_api",
            python("v4/scripts/verify_v4_bars_api.py", "--instrument", "NQ", "--api-url", args.api_url),
            "api",
            "Fetch recent NQ bars from the running API.",
        ),
    ]

    if args.suite == "local":
        return local
    if args.suite == "api":
        return api
    if args.suite == "all":
        return [*local, *api]
    raise ValueError(f"unknown suite: {args.suite}")


def run_command(command: SmokeCommand) -> int:
    started = time.monotonic()
    print(f"\n=== {command.suite}:{command.name} ===", flush=True)
    print(command.description, flush=True)
    print("$ " + " ".join(command.argv), flush=True)
    result = subprocess.run(command.argv, cwd=REPO_ROOT, env=os.environ.copy(), text=True)
    elapsed = time.monotonic() - started
    status = "ok" if result.returncode == 0 else "failed"
    print(f"--- {command.name}: {status} returncode={result.returncode} elapsed={elapsed:.1f}s", flush=True)
    return result.returncode


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run grouped V4 smoke checks.")
    parser.add_argument("--suite", choices=["local", "api", "all"], default="local", help="Smoke suite to run.")
    parser.add_argument("--api-url", default="http://127.0.0.1:8766", help="API base URL for api/all suites.")
    parser.add_argument("--web-url", default="http://127.0.0.1:8001/index.html", help="Web URL for api/all suites.")
    parser.add_argument("--list", action="store_true", help="List selected commands without running them.")
    parser.add_argument("--continue-on-error", action="store_true", help="Run remaining commands after a failure.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    commands = build_commands(args)
    if args.list:
        for command in commands:
            print(f"{command.suite}:{command.name}\t{' '.join(command.argv)}")
        return 0

    failures: list[str] = []
    for command in commands:
        returncode = run_command(command)
        if returncode != 0:
            failures.append(command.name)
            if not args.continue_on_error:
                break

    print("\nsummary")
    print(f"suite: {args.suite}")
    print(f"commands: {len(commands)}")
    print(f"failures: {len(failures)}")
    if failures:
        print(f"failed_commands: {', '.join(failures)}")
        return 1
    print("smoke_status: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
