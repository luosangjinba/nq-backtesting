#!/usr/bin/env python3
"""Unified manual/automatic V4 data refresh runner.

Default mode is manual dry-run plus verification. Writes require explicit
component flags and `--confirm-write`.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path


V4_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = V4_ROOT.parent
DAILY_DATABENTO = V4_ROOT / "scripts" / "daily_databento_refresh.py"
VIX_UPDATER = V4_ROOT / "scripts" / "update_vix_daily.py"
FRESHNESS_VERIFIER = V4_ROOT / "scripts" / "verify_data_freshness.py"
DEFAULT_LOCK_FILE = Path("/tmp/v4_daily_data_refresh.lock")
DEFAULT_STATE_FILE = Path("/tmp/v4_daily_data_refresh_state.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run V4 manual/automatic data refresh workflow.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--manual", action="store_true", help="User-triggered refresh. This is the default.")
    mode.add_argument("--auto", action="store_true", help="Scheduler-oriented once-per-day refresh.")

    parser.add_argument("--write-es", action="store_true", help="Allow guarded ES Databento write.")
    parser.add_argument("--write-vix", action="store_true", help="Allow VIX CSV write.")
    parser.add_argument("--confirm-write", action="store_true", help="Required with any write flag.")
    parser.add_argument("--skip-es", action="store_true", help="Skip ES Databento refresh stage.")
    parser.add_argument("--skip-vix", action="store_true", help="Skip VIX refresh stage.")
    parser.add_argument("--skip-verify", action="store_true", help="Skip freshness verifier stage.")
    parser.add_argument("--allow-degraded", action="store_true", help="Allow degraded Databento warnings for ES write.")

    parser.add_argument("--chunk-days", type=int, default=3, help="ES Databento request chunk size in ET days.")
    parser.add_argument("--retries", type=int, default=2, help="ES Databento request retries per chunk.")
    parser.add_argument("--retry-sleep", type=float, default=2.0, help="Seconds to sleep before retrying ES chunks.")
    parser.add_argument("--show-sample", type=int, default=2, help="Sample rows to show for refresh stages.")

    parser.add_argument("--vix-source-url", help="Override Cboe VIX history CSV URL.")
    parser.add_argument("--vix-source-file", help="Use local VIX source CSV instead of network URL.")
    parser.add_argument("--vix-csv", help="Target VIX CSV path.")

    parser.add_argument("--api-url", help="Optional V4 API base URL for freshness API smoke.")
    parser.add_argument("--warn-es-stale-hours", type=float, default=72.0, help="Freshness warning threshold for ES.")
    parser.add_argument("--warn-vix-stale-days", type=int, default=7, help="Freshness warning threshold for VIX.")

    parser.add_argument("--lock-file", default=str(DEFAULT_LOCK_FILE), help="Auto mode lock file path.")
    parser.add_argument("--state-file", default=str(DEFAULT_STATE_FILE), help="Auto mode run-state JSON path.")
    parser.add_argument("--force-auto", action="store_true", help="Run auto mode even if today's success is recorded.")
    return parser.parse_args()


def mode_label(args: argparse.Namespace) -> str:
    return "auto" if args.auto else "manual"


def validate_args(args: argparse.Namespace) -> int:
    if (args.write_es or args.write_vix) and not args.confirm_write:
        print("--write-es/--write-vix require --confirm-write")
        return 2
    if args.write_es and args.skip_es:
        print("--write-es cannot be used with --skip-es")
        return 2
    if args.write_vix and args.skip_vix:
        print("--write-vix cannot be used with --skip-vix")
        return 2
    return 0


def run_command(title: str, command: list[str]) -> int:
    print(f"\n== {title} ==")
    print(f"command: {' '.join(command)}")
    completed = subprocess.run(
        command,
        cwd=str(REPO_ROOT),
        env=os.environ.copy(),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    print(completed.stdout.rstrip() or "(no output)")
    print(f"exit_code: {completed.returncode}")
    return completed.returncode


def es_command(args: argparse.Namespace) -> list[str]:
    command = [
        sys.executable,
        str(DAILY_DATABENTO),
        "--chunk-days",
        str(args.chunk_days),
        "--retries",
        str(args.retries),
        "--retry-sleep",
        str(args.retry_sleep),
        "--show-sample",
        str(args.show_sample),
    ]
    if args.write_es:
        command.extend(["--write", "--confirm-write"])
    if args.allow_degraded:
        command.append("--allow-degraded")
    return command


def vix_command(args: argparse.Namespace) -> list[str]:
    command = [
        sys.executable,
        str(VIX_UPDATER),
        "--show-sample",
        str(args.show_sample),
    ]
    if args.vix_csv:
        command.extend(["--csv", args.vix_csv])
    if args.vix_source_file:
        command.extend(["--source-file", args.vix_source_file])
    elif args.vix_source_url:
        command.extend(["--source-url", args.vix_source_url])
    if args.write_vix:
        command.extend(["--write", "--confirm-write"])
    return command


def verify_command(args: argparse.Namespace) -> list[str]:
    command = [
        sys.executable,
        str(FRESHNESS_VERIFIER),
        "--warn-es-stale-hours",
        str(args.warn_es_stale_hours),
        "--warn-vix-stale-days",
        str(args.warn_vix_stale_days),
    ]
    if args.vix_csv:
        command.extend(["--vix-csv", args.vix_csv])
    if args.api_url:
        command.extend(["--api-url", args.api_url])
    return command


def read_state(path: Path) -> dict[str, object]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}


def write_state(path: Path, state: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


@contextmanager
def auto_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = None
    try:
        fd = os.open(str(path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, f"{os.getpid()}\n".encode("utf-8"))
        yield
    finally:
        if fd is not None:
            os.close(fd)
            try:
                path.unlink()
            except FileNotFoundError:
                pass


def should_skip_auto(args: argparse.Namespace) -> bool:
    if not args.auto or args.force_auto:
        return False
    state = read_state(Path(args.state_file).expanduser().resolve())
    return state.get("last_success_date") == date.today().isoformat()


def record_auto_success(args: argparse.Namespace) -> None:
    if not args.auto:
        return
    state_path = Path(args.state_file).expanduser().resolve()
    write_state(state_path, {
        "last_success_date": date.today().isoformat(),
        "last_success_at": datetime.now().isoformat(timespec="seconds"),
        "mode": "auto",
        "write_es": bool(args.write_es),
        "write_vix": bool(args.write_vix),
    })
    print(f"\nauto_state: recorded success in {state_path}")


def run_workflow(args: argparse.Namespace) -> int:
    print("data_refresh_status: running")
    print(f"mode: {mode_label(args)}")
    print(f"write_es: {bool(args.write_es)}")
    print(f"write_vix: {bool(args.write_vix)}")
    print(f"skip_es: {bool(args.skip_es)}")
    print(f"skip_vix: {bool(args.skip_vix)}")
    print(f"skip_verify: {bool(args.skip_verify)}")

    exit_code = 0
    if not args.skip_es:
        exit_code = run_command(f"{mode_label(args)} ES Databento refresh", es_command(args))
        if exit_code != 0:
            print("\ndata_refresh_status: failed")
            return exit_code
    else:
        print("\n== ES Databento refresh ==")
        print("stage_status: skipped")

    if not args.skip_vix:
        exit_code = run_command(f"{mode_label(args)} VIX daily refresh", vix_command(args))
        if exit_code != 0:
            print("\ndata_refresh_status: failed")
            return exit_code
    else:
        print("\n== VIX daily refresh ==")
        print("stage_status: skipped")

    if not args.skip_verify:
        exit_code = run_command(f"{mode_label(args)} freshness verification", verify_command(args))
        if exit_code != 0:
            print("\ndata_refresh_status: failed")
            return exit_code
    else:
        print("\n== freshness verification ==")
        print("stage_status: skipped")

    record_auto_success(args)
    print("\ndata_refresh_status: ok")
    return 0


def main() -> int:
    args = parse_args()
    validation = validate_args(args)
    if validation:
        return validation
    if args.auto and should_skip_auto(args):
        print("data_refresh_status: skipped")
        print("mode: auto")
        print(f"reason: success already recorded for {date.today().isoformat()}")
        print(f"state_file: {Path(args.state_file).expanduser().resolve()}")
        return 0
    if not args.auto:
        return run_workflow(args)

    lock_path = Path(args.lock_file).expanduser().resolve()
    try:
        with auto_lock(lock_path):
            print(f"auto_lock: acquired {lock_path}")
            return run_workflow(args)
    except FileExistsError:
        print("data_refresh_status: failed")
        print("mode: auto")
        print(f"error: lock already exists: {lock_path}")
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
