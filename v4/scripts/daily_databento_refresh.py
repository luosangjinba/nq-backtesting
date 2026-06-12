#!/usr/bin/env python3
"""Daily Databento refresh wrapper for V4 futures data.

This wrapper deliberately keeps the production path narrow:

- ES only.
- Dry-run first, even when write mode is requested.
- Degraded Databento condition warnings block write unless explicitly allowed.
- NQ remains excluded until its roll calendar conflict is resolved.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


V4_ROOT = Path(__file__).resolve().parents[1]
UPDATER = V4_ROOT / "scripts" / "update_databento_1m.py"
API_SMOKE = V4_ROOT / "scripts" / "verify_v4_bars_api.py"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the guarded daily ES Databento refresh workflow.")
    parser.add_argument("--write", action="store_true", help="After a clean dry-run, execute ES insert-only write.")
    parser.add_argument("--confirm-write", action="store_true", help="Required with --write.")
    parser.add_argument("--allow-degraded", action="store_true", help="Allow write when Databento reports degraded days.")
    parser.add_argument("--chunk-days", type=int, default=3, help="Databento request chunk size in ET days.")
    parser.add_argument("--retries", type=int, default=2, help="Retries per Databento request chunk.")
    parser.add_argument("--retry-sleep", type=float, default=2.0, help="Seconds to sleep before retrying a chunk.")
    parser.add_argument("--show-sample", type=int, default=2, help="Number of candidate rows to show.")
    parser.add_argument("--verify-api", action="store_true", help="Run /v4/bars smoke after write succeeds.")
    parser.add_argument("--api-url", default="http://127.0.0.1:8766", help="V4 API base URL for --verify-api.")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(V4_ROOT.parent),
        env=os.environ.copy(),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def print_section(title: str, output: str) -> None:
    print(f"\n== {title} ==")
    print(output.rstrip() or "(no output)")


def empty_range(output: str) -> bool:
    return "empty requested range after clamp" in output


def has_databento_warnings(output: str) -> bool:
    return "\ndatabento warnings\n" in f"\n{output}\n"


def parse_metric(output: str, metric: str) -> int | None:
    prefix = f"{metric}:"
    for line in output.splitlines():
        if line.startswith(prefix):
            value = line.split(":", 1)[1].strip().replace(",", "")
            try:
                return int(value)
            except ValueError:
                return None
    return None


def updater_command(args: argparse.Namespace, *, write: bool) -> list[str]:
    command = [
        sys.executable,
        str(UPDATER),
        "--instrument",
        "ES",
        "--chunk-days",
        str(args.chunk_days),
        "--retries",
        str(args.retries),
        "--retry-sleep",
        str(args.retry_sleep),
        "--show-sample",
        str(args.show_sample),
    ]
    if write:
        command.extend(["--write", "--confirm-write"])
    return command


def main() -> int:
    args = parse_args()
    if args.write and not args.confirm_write:
        print("--write requires --confirm-write", file=sys.stderr)
        return 2
    if not os.environ.get("DATABENTO_API_KEY"):
        print("DATABENTO_API_KEY is required in the environment.", file=sys.stderr)
        return 2

    dry_run = run_command(updater_command(args, write=False))
    print_section("ES dry-run", dry_run.stdout)
    if dry_run.returncode != 0:
        return 0 if empty_range(dry_run.stdout) else dry_run.returncode
    if not args.write:
        print("\nwrite_status: dry-run only; no DB changes were made")
        return 0

    warning_blocked = has_databento_warnings(dry_run.stdout) and not args.allow_degraded
    if warning_blocked:
        print("\nwrite_status: blocked; Databento warnings require --allow-degraded")
        return 3

    would_insert = parse_metric(dry_run.stdout, "would_insert_rows")
    if would_insert == 0:
        print("\nwrite_status: skipped; dry-run found no missing ES rows")
        return 0

    write = run_command(updater_command(args, write=True))
    print_section("ES write", write.stdout)
    if write.returncode != 0:
        return write.returncode

    if args.verify_api:
        verify = run_command([sys.executable, str(API_SMOKE), "--instrument", "ES", "--api-url", args.api_url])
        print_section("V4 API bars smoke", verify.stdout)
        if verify.returncode != 0:
            return verify.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
