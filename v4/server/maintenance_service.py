import os
import secrets
import subprocess
import threading
import time
from copy import deepcopy
from datetime import datetime, timezone


_MAINTENANCE_LOCK = threading.Lock()
_MAINTENANCE_JOB_LOCK = threading.Lock()
_MAINTENANCE_JOB = None
_MAINTENANCE_PROCESS = None

_ASYNC_ACTIONS = frozenset({
    "api_smoke",
    "backup",
    "dry_run",
    "preflight",
    "roll_report",
    "roll_scan_v2",
    "verify",
    "verify_api",
    "write",
})


def _clean_text(value, max_length=500):
    text = str(value or "").strip()
    if "\n" in text or "\r" in text:
        raise ValueError("Values must be single-line text")
    if len(text) > max_length:
        raise ValueError(f"Value is too long; max {max_length} characters")
    return text


def run_maintenance_command(args, timeout=600):
    global _MAINTENANCE_PROCESS
    env = os.environ.copy()
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    process = subprocess.Popen(
        args,
        cwd=repo_root,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    _MAINTENANCE_PROCESS = process
    try:
        output, _ = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        output, _ = process.communicate()
        raise
    finally:
        if _MAINTENANCE_PROCESS is process:
            _MAINTENANCE_PROCESS = None
    command_label = " ".join(args[:3] + (["..."] if len(args) > 3 else []))
    return {
        "ok": process.returncode == 0,
        "returncode": process.returncode,
        "command": command_label,
        "output": output,
    }


def _terminate_active_maintenance_process(timeout=2.0):
    process = _MAINTENANCE_PROCESS
    if not process or process.poll() is not None:
        return "none"
    process.terminate()
    try:
        process.wait(timeout=timeout)
        return "terminated"
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=timeout)
        return "killed"


def _schedule_api_restart(v4_root):
    def restart_later():
        time.sleep(0.6)
        log_path = os.path.join(v4_root, ".api-restart.log")
        try:
            log = open(log_path, "a", encoding="utf-8")
            log.write(f"\n[{datetime.now(timezone.utc).isoformat()}] scheduled restart\n")
            log.flush()
            subprocess.Popen(
                ["bash", "start.sh", "restart"],
                cwd=v4_root,
                env=os.environ.copy(),
                stdin=subprocess.DEVNULL,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        except Exception as exc:
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"restart_schedule_error: {exc}\n")
            except Exception:
                pass

    thread = threading.Thread(target=restart_later, name="v4-api-restart", daemon=True)
    thread.start()


def run_api_restart_action(payload, *, v4_root):
    confirm_text = _clean_text(payload.get("confirmText"), 80)
    if confirm_text != "RESTART API":
        raise ValueError("Type 'RESTART API' to restart the V4 API")
    if os.name == "nt":
        raise ValueError("Restart API from data-maintenance.html is only supported on Linux; use v4/start_windows.ps1 restart on Windows")
    child_status = _terminate_active_maintenance_process()
    _schedule_api_restart(v4_root)
    return {
        "ok": True,
        "returncode": 0,
        "command": "api restart scheduled",
        "output": (
            "api_restart_status: scheduled\n"
            "restart_delay_seconds: 0.6\n"
            f"active_maintenance_process: {child_status}\n"
            "service: V4 API\n"
            "health_url: http://127.0.0.1:8766/v4/health\n"
            "note: The API may be unavailable for a few seconds while start.sh restarts it.\n"
        ),
    }


def _maintenance_busy_result():
    with _MAINTENANCE_JOB_LOCK:
        job = deepcopy(_MAINTENANCE_JOB or {})
    return {
        "ok": False,
        "returncode": 423,
        "command": "data_maintenance busy",
        "job": job or None,
        "output": (
            "Another data maintenance action is already running.\n"
            f"running_action: {job.get('action', 'unknown')}\n"
            f"started_at: {job.get('startedAt', 'unknown')}\n"
            "Wait for it to finish, or restart the V4 API if the job is known to be stale."
        ),
    }


def _job_status_result(payload):
    requested_id = _clean_text(payload.get("jobId"), 120)
    with _MAINTENANCE_JOB_LOCK:
        job = deepcopy(_MAINTENANCE_JOB)
    if not job:
        return {
            "ok": False,
            "returncode": 404,
            "command": "data_maintenance job status",
            "job": None,
            "output": "No retained data maintenance job is available.",
        }
    if requested_id and requested_id != job.get("jobId"):
        return {
            "ok": False,
            "returncode": 404,
            "command": "data_maintenance job status",
            "job": None,
            "output": "The requested data maintenance job is no longer retained.",
        }
    return {
        "ok": True,
        "returncode": 0,
        "command": "data_maintenance job status",
        "job": job,
        "output": (
            f"job_id: {job.get('jobId', 'synchronous')}\n"
            f"job_state: {job['state']}\n"
            f"job_action: {job['action']}"
        ),
    }


def _run_background_job(job_id, request, run_action):
    try:
        result = run_action(request)
        if not isinstance(result, dict):
            raise TypeError("Maintenance action must return a result object")
    except subprocess.TimeoutExpired:
        result = {
            "ok": False,
            "returncode": 504,
            "command": f"data_maintenance {request['action']}",
            "output": "Command timed out",
        }
    except Exception as exc:
        result = {
            "ok": False,
            "returncode": 500,
            "command": f"data_maintenance {request['action']}",
            "output": str(exc),
        }
    try:
        finished_at = datetime.now(timezone.utc).isoformat()
        with _MAINTENANCE_JOB_LOCK:
            if _MAINTENANCE_JOB and _MAINTENANCE_JOB.get("jobId") == job_id:
                _MAINTENANCE_JOB.update({
                    "state": "succeeded" if result.get("ok") else "failed",
                    "finishedAt": finished_at,
                    "result": result,
                })
    finally:
        _MAINTENANCE_LOCK.release()


def _start_background_job(payload, run_action):
    global _MAINTENANCE_JOB
    request = payload.get("request")
    if not isinstance(request, dict):
        raise ValueError("job_start requires a request object")
    action = _clean_text(request.get("action"), 80)
    if action not in _ASYNC_ACTIONS:
        raise ValueError(f"Action cannot run as a background job: {action or 'unknown'}")
    if not _MAINTENANCE_LOCK.acquire(blocking=False):
        return _maintenance_busy_result()
    job_id = f"maintenance-{secrets.token_urlsafe(12)}"
    job = {
        "jobId": job_id,
        "action": action,
        "state": "running",
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "finishedAt": None,
        "result": None,
    }
    with _MAINTENANCE_JOB_LOCK:
        _MAINTENANCE_JOB = job
    thread = threading.Thread(
        target=_run_background_job,
        args=(job_id, deepcopy(request), run_action),
        name=f"v4-maintenance-{action}",
        daemon=True,
    )
    thread.start()
    return {
        "ok": True,
        "returncode": 202,
        "command": "data_maintenance job start",
        "job": deepcopy(job),
        "output": (
            f"job_id: {job_id}\n"
            "job_state: running\n"
            f"job_action: {action}"
        ),
    }


def run_data_maintenance_action_guarded(payload, *, run_action):
    global _MAINTENANCE_JOB
    action = str(payload.get("action") or "unknown")
    if action == "job_status":
        return _job_status_result(payload)
    if action == "job_start":
        return _start_background_job(payload, run_action)
    if action == "api_restart":
        return run_action(payload)
    if not _MAINTENANCE_LOCK.acquire(blocking=False):
        return _maintenance_busy_result()
    with _MAINTENANCE_JOB_LOCK:
        _MAINTENANCE_JOB = {
            "action": action,
            "state": "running",
            "startedAt": datetime.now(timezone.utc).isoformat(),
        }
    try:
        return run_action(payload)
    finally:
        with _MAINTENANCE_JOB_LOCK:
            _MAINTENANCE_JOB = None
        _MAINTENANCE_LOCK.release()
