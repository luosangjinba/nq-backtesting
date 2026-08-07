"""Strict staging, validation, and activation for a first market database."""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO

from database_import_validation import (
    IMPORT_CONFIRMATION,
    REQUIRED_COLUMNS,
    SUPPORTED_INSTRUMENTS,
    ImportRequestError,
    create_database_from_csv,
    require_user_id,
    validate_database,
)

MAX_DEFAULT_UPLOAD_BYTES = 5_000_000_000
UPLOAD_ID_PATTERN = re.compile(r"^[a-f0-9]{32}$")


def _safe_upload_id(value: Any) -> str:
    if not isinstance(value, str) or UPLOAD_ID_PATTERN.fullmatch(value) is None:
        raise ImportRequestError(400, "DATABASE_UPLOAD_ID_INVALID", "upload id is invalid")
    return value


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_suffix(".json.next")
    with temporary.open("w", encoding="utf-8") as output:
        json.dump(payload, output, ensure_ascii=False, separators=(",", ":"))
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)


class DatabaseImportStore:
    """Own one-at-a-time first-database staging and atomic activation."""

    def __init__(
        self,
        target_path: str,
        staging_root: str,
        *,
        import_enabled: bool = False,
        max_upload_bytes: int = MAX_DEFAULT_UPLOAD_BYTES,
    ) -> None:
        raw_target = Path(target_path).expanduser()
        self.target_path = raw_target.parent.resolve() / raw_target.name
        self.staging_root = Path(staging_root).resolve()
        self.import_enabled = import_enabled
        self.max_upload_bytes = max_upload_bytes
        self.staging_root.mkdir(mode=0o750, parents=True, exist_ok=True)
        self.target_path.parent.mkdir(mode=0o750, parents=True, exist_ok=True)
        self.activation_lock_path = self.staging_root / "activation-lock.json"
        self._lock = threading.RLock()
        self._jobs: dict[str, dict[str, Any]] = {}
        if self.import_enabled and self.target_path.is_file() \
                and not self.target_path.is_symlink() \
                and not os.path.lexists(self.activation_lock_path):
            self._write_activation_lock("pre-existing-target")
        self._restore_jobs()

    def _write_activation_lock(self, upload_id: str) -> None:
        _write_json(self.activation_lock_path, {
            "locked": True,
            "uploadId": upload_id,
            "lockedAt": datetime.now(timezone.utc).isoformat(),
        })
        directory_fd = os.open(self.staging_root, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)

    def _restore_jobs(self) -> None:
        for directory in self.staging_root.iterdir():
            if not directory.is_dir() or UPLOAD_ID_PATTERN.fullmatch(directory.name) is None:
                continue
            manifest = directory / "manifest.json"
            if not manifest.is_file():
                continue
            try:
                job = json.loads(manifest.read_text(encoding="utf-8"))
                self._validate_job_paths(job, directory.name)
            except (ImportRequestError, OSError, json.JSONDecodeError):
                continue
            source = Path(job["sourcePath"])
            candidate = self.target_path.parent / (
                f".{self.target_path.name}.import-{directory.name}.duckdb"
            )
            changed = False
            if job.get("state") == "preparing":
                candidate.unlink(missing_ok=True)
                if source.is_file() and not source.is_symlink():
                    job["state"] = "uploaded"
                    job["phase"] = "Validation was interrupted; run validation again"
                    job.pop("candidatePath", None)
                    job.pop("summary", None)
                    job.pop("error", None)
                else:
                    job["state"] = "failed"
                    job["phase"] = "Validation was interrupted and the staged source is missing"
                    job["error"] = {
                        "code": "DATABASE_PREPARE_INTERRUPTED",
                        "message": "candidate preparation was interrupted; upload the file again",
                    }
                changed = True
            elif job.get("state") == "ready" and (
                not candidate.is_file() or candidate.is_symlink()
            ):
                if source.is_file() and not source.is_symlink():
                    job["state"] = "uploaded"
                    job["phase"] = "Candidate is unavailable; run validation again"
                    job.pop("candidatePath", None)
                    job.pop("summary", None)
                    job.pop("error", None)
                else:
                    job["state"] = "failed"
                    job["phase"] = "Candidate and staged source are unavailable"
                    job["error"] = {
                        "code": "DATABASE_CANDIDATE_MISSING",
                        "message": "candidate and staged source are missing; upload the file again",
                    }
                changed = True
            elif job.get("state") == "uploaded" and (
                not source.is_file() or source.is_symlink()
            ):
                job["state"] = "failed"
                job["phase"] = "Staged source is unavailable"
                job["error"] = {
                    "code": "DATABASE_UPLOAD_UNAVAILABLE",
                    "message": "staged source is missing; upload the file again",
                }
                changed = True
            if changed:
                _write_json(manifest, job)
            self._jobs[directory.name] = job

    def health(self) -> dict[str, Any]:
        ready = self.target_path.is_file() and not self.target_path.is_symlink()
        target_present = os.path.lexists(self.target_path)
        activation_locked = os.path.lexists(self.activation_lock_path)
        return {
            "status": "ok",
            "version": 1,
            "databaseReady": ready,
            "bootstrapEnabled": self.import_enabled,
            "activationLocked": activation_locked,
            "importAllowed": self.import_enabled
            and not activation_locked
            and not target_present,
            "maxUploadBytes": self.max_upload_bytes,
            "requiredColumns": [name for name, _ in REQUIRED_COLUMNS],
            "supportedInstruments": sorted(SUPPORTED_INSTRUMENTS),
            "confirmation": IMPORT_CONFIRMATION,
        }

    def _assert_import_allowed(self) -> None:
        if not self.import_enabled:
            raise ImportRequestError(
                409,
                "DATABASE_IMPORT_DISABLED",
                "first-run database import is not enabled for this deployment",
            )
        if os.path.lexists(self.activation_lock_path):
            raise ImportRequestError(
                409,
                "DATABASE_ALREADY_ACTIVE",
                "first-run database import is permanently locked",
            )
        if os.path.lexists(self.target_path):
            raise ImportRequestError(
                409,
                "DATABASE_ALREADY_ACTIVE",
                "a market database is already active; first-run import is locked",
            )

    def _directory(self, upload_id: str) -> Path:
        return self.staging_root / _safe_upload_id(upload_id)

    def _manifest_path(self, upload_id: str) -> Path:
        return self._directory(upload_id) / "manifest.json"

    def _persist(self, job: dict[str, Any]) -> None:
        _write_json(self._manifest_path(job["uploadId"]), job)

    def _load(self, upload_id: str, user_id: str) -> dict[str, Any]:
        safe_id = _safe_upload_id(upload_id)
        job = self._jobs.get(safe_id)
        if job is None:
            path = self._manifest_path(safe_id)
            if not path.is_file():
                raise ImportRequestError(404, "DATABASE_UPLOAD_NOT_FOUND", "upload was not found")
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                raise ImportRequestError(503, "DATABASE_UPLOAD_UNAVAILABLE", "upload metadata is unavailable") from error
            self._validate_job_paths(job, safe_id)
            self._jobs[safe_id] = job
        if job.get("userId") != user_id:
            raise ImportRequestError(404, "DATABASE_UPLOAD_NOT_FOUND", "upload was not found")
        return job

    def _validate_job_paths(self, job: dict[str, Any], upload_id: str) -> None:
        if job.get("uploadId") != upload_id:
            raise ImportRequestError(503, "DATABASE_UPLOAD_UNAVAILABLE", "upload metadata identity is invalid")
        require_user_id(job.get("userId"))
        kind = job.get("kind")
        if kind not in {"csv", "duckdb"}:
            raise ImportRequestError(503, "DATABASE_UPLOAD_UNAVAILABLE", "upload metadata type is invalid")
        expected_source = self._directory(upload_id) / f"source.{kind if kind == 'csv' else 'duckdb'}"
        if Path(str(job.get("sourcePath", ""))).resolve() != expected_source.resolve():
            raise ImportRequestError(503, "DATABASE_UPLOAD_UNAVAILABLE", "upload source path is invalid")
        if "candidatePath" in job:
            expected_candidate = self.target_path.parent / (
                f".{self.target_path.name}.import-{upload_id}.duckdb"
            )
            if Path(str(job["candidatePath"])).resolve() != expected_candidate.resolve():
                raise ImportRequestError(503, "DATABASE_UPLOAD_UNAVAILABLE", "candidate path is invalid")

    @staticmethod
    def _public_job(job: dict[str, Any]) -> dict[str, Any]:
        return {
            key: job[key]
            for key in (
                "uploadId", "filename", "kind", "sizeBytes", "sourceSha256",
                "state", "phase", "summary", "error", "confirmation",
            )
            if key in job
        }

    def upload(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        length: int,
        source: BinaryIO,
    ) -> dict[str, Any]:
        identity = require_user_id(user_id)
        self._assert_import_allowed()
        clean_name = Path(filename).name
        suffix = Path(clean_name).suffix.lower()
        if not clean_name or suffix not in {".csv", ".duckdb"}:
            raise ImportRequestError(
                415,
                "DATABASE_FILE_TYPE",
                "file name must end with .csv or .duckdb",
            )
        if length < 1 or length > self.max_upload_bytes:
            raise ImportRequestError(
                413,
                "DATABASE_UPLOAD_SIZE",
                "upload is empty or exceeds the configured byte limit",
            )
        normalized_type = content_type.split(";", 1)[0].strip().lower()
        allowed_types = {
            ".csv": {
                "text/csv", "text/plain", "application/csv",
                "application/vnd.ms-excel", "application/octet-stream",
            },
            ".duckdb": {"application/vnd.duckdb", "application/octet-stream"},
        }
        if normalized_type not in allowed_types[suffix]:
            raise ImportRequestError(415, "DATABASE_CONTENT_TYPE", "upload Content-Type is not allowed")
        free_bytes = shutil.disk_usage(self.staging_root).free
        if free_bytes < length + 64 * 1024 * 1024:
            raise ImportRequestError(507, "DATABASE_STAGING_SPACE", "staging filesystem has insufficient free space")
        with self._lock:
            if any(job.get("state") in {"uploaded", "preparing", "ready"} for job in self._jobs.values()):
                raise ImportRequestError(409, "DATABASE_IMPORT_BUSY", "another database import is active")
            upload_id = secrets.token_hex(16)
            directory = self._directory(upload_id)
            directory.mkdir(mode=0o750)
            source_path = directory / f"source{suffix}"
            digest = hashlib.sha256()
            remaining = length
            try:
                with source_path.open("xb") as output:
                    while remaining:
                        chunk = source.read(min(1024 * 1024, remaining))
                        if not chunk:
                            raise ImportRequestError(400, "DATABASE_UPLOAD_TRUNCATED", "upload ended before Content-Length")
                        output.write(chunk)
                        digest.update(chunk)
                        remaining -= len(chunk)
                    output.flush()
                    os.fsync(output.fileno())
            except Exception:
                shutil.rmtree(directory, ignore_errors=True)
                raise
            job = {
                "uploadId": upload_id,
                "userId": identity,
                "filename": clean_name,
                "kind": "csv" if suffix == ".csv" else "duckdb",
                "sizeBytes": length,
                "sourceSha256": digest.hexdigest(),
                "state": "uploaded",
                "phase": "Awaiting strict validation",
                "confirmation": IMPORT_CONFIRMATION,
                "sourcePath": str(source_path),
            }
            self._jobs[upload_id] = job
            self._persist(job)
            return self._public_job(job)

    def status(self, user_id: str, upload_id: str) -> dict[str, Any]:
        identity = require_user_id(user_id)
        with self._lock:
            return self._public_job(self._load(upload_id, identity))

    def current(self, user_id: str) -> dict[str, Any]:
        identity = require_user_id(user_id)
        with self._lock:
            jobs = [
                job for job in self._jobs.values()
                if job.get("userId") == identity and job.get("state") != "discarded"
            ]
            active = [job for job in jobs if job.get("state") in {"uploaded", "preparing", "ready"}]
            if active:
                return self._public_job(active[0])
            if not jobs:
                raise ImportRequestError(404, "DATABASE_UPLOAD_NOT_FOUND", "upload was not found")
            latest = max(
                jobs,
                key=lambda job: self._manifest_path(job["uploadId"]).stat().st_mtime_ns,
            )
            return self._public_job(latest)

    def discard(self, user_id: str, upload_id: str) -> dict[str, Any]:
        identity = require_user_id(user_id)
        with self._lock:
            job = self._load(upload_id, identity)
            self._assert_import_allowed()
            state = job.get("state")
            if state == "discarded":
                return self._public_job(job)
            if state == "preparing":
                raise ImportRequestError(
                    409,
                    "DATABASE_IMPORT_BUSY",
                    "database validation is in progress and cannot be discarded",
                )
            if state == "activated":
                raise ImportRequestError(
                    409,
                    "DATABASE_ALREADY_ACTIVE",
                    "an activated database import cannot be discarded",
                )
            if state not in {"uploaded", "ready", "failed"}:
                raise ImportRequestError(
                    409,
                    "DATABASE_IMPORT_STATE",
                    "database import is not discardable",
                )

            safe_id = _safe_upload_id(upload_id)
            source = self._directory(safe_id) / (
                "source.csv" if job.get("kind") == "csv" else "source.duckdb"
            )
            candidate = self.target_path.parent / (
                f".{self.target_path.name}.import-{safe_id}.duckdb"
            )
            discarded = dict(job)
            discarded["state"] = "discarded"
            discarded["phase"] = "Staged database discarded; another file may be uploaded"
            discarded.pop("candidatePath", None)
            discarded.pop("summary", None)
            discarded.pop("error", None)
            try:
                candidate.unlink(missing_ok=True)
                source.unlink(missing_ok=True)
                target_directory_fd = os.open(self.target_path.parent, os.O_RDONLY)
                try:
                    os.fsync(target_directory_fd)
                finally:
                    os.close(target_directory_fd)
                self._persist(discarded)
                staging_directory_fd = os.open(self._directory(safe_id), os.O_RDONLY)
                try:
                    os.fsync(staging_directory_fd)
                finally:
                    os.close(staging_directory_fd)
            except OSError as error:
                raise ImportRequestError(
                    503,
                    "DATABASE_DISCARD_FAILED",
                    "staged database could not be discarded",
                ) from error
            self._jobs[safe_id] = discarded
            return self._public_job(discarded)

    def prepare(self, user_id: str, upload_id: str) -> dict[str, Any]:
        identity = require_user_id(user_id)
        self._assert_import_allowed()
        with self._lock:
            job = self._load(upload_id, identity)
            if job.get("state") != "uploaded":
                raise ImportRequestError(409, "DATABASE_IMPORT_STATE", "upload is not awaiting validation")
            job["state"] = "preparing"
            job["phase"] = "Creating and validating candidate database"
            job.pop("error", None)
            self._persist(job)
            worker = threading.Thread(target=self._prepare_worker, args=(upload_id,), daemon=True)
            worker.start()
            return self._public_job(job)

    def _prepare_worker(self, upload_id: str) -> None:
        with self._lock:
            job = self._jobs[upload_id]
            source = Path(job["sourcePath"])
            candidate = self.target_path.parent / f".{self.target_path.name}.import-{upload_id}.duckdb"
            job["candidatePath"] = str(candidate)
            self._persist(job)
        try:
            candidate.unlink(missing_ok=True)
            required_free = int(job["sizeBytes"]) + 64 * 1024 * 1024
            if shutil.disk_usage(self.target_path.parent).free < required_free:
                raise ImportRequestError(
                    507,
                    "DATABASE_TARGET_SPACE",
                    "database filesystem has insufficient free space for a candidate",
                )
            if job["kind"] == "csv":
                create_database_from_csv(source, candidate)
            else:
                shutil.copyfile(source, candidate)
            os.chmod(candidate, 0o640)
            summary = validate_database(candidate)
            summary["candidateBytes"] = candidate.stat().st_size
            with self._lock:
                job["state"] = "ready"
                job["phase"] = "Validation passed; explicit activation required"
                job["summary"] = summary
                self._persist(job)
        except ImportRequestError as error:
            candidate.unlink(missing_ok=True)
            source.unlink(missing_ok=True)
            with self._lock:
                job["state"] = "failed"
                job["phase"] = "Validation failed"
                job["error"] = {"code": error.code, "message": error.message}
                self._persist(job)
        except Exception:
            candidate.unlink(missing_ok=True)
            source.unlink(missing_ok=True)
            with self._lock:
                job["state"] = "failed"
                job["phase"] = "Validation failed"
                job["error"] = {
                    "code": "DATABASE_PREPARE_FAILED",
                    "message": "candidate database could not be prepared",
                }
                self._persist(job)

    def activate(self, user_id: str, upload_id: str, confirmation: Any) -> dict[str, Any]:
        identity = require_user_id(user_id)
        if confirmation != IMPORT_CONFIRMATION:
            raise ImportRequestError(
                400,
                "DATABASE_CONFIRMATION_REQUIRED",
                f"confirmation must be exactly {IMPORT_CONFIRMATION}",
            )
        with self._lock:
            self._assert_import_allowed()
            job = self._load(upload_id, identity)
            if job.get("state") != "ready":
                raise ImportRequestError(409, "DATABASE_IMPORT_STATE", "candidate is not ready for activation")
            candidate = Path(job["candidatePath"])
            if not candidate.is_file() or candidate.is_symlink():
                raise ImportRequestError(503, "DATABASE_CANDIDATE_MISSING", "candidate database is missing")
            try:
                os.link(candidate, self.target_path)
            except FileExistsError as error:
                raise ImportRequestError(
                    409,
                    "DATABASE_ALREADY_ACTIVE",
                    "a market database appeared before activation; no file was replaced",
                ) from error
            os.chmod(self.target_path, 0o640)
            directory_fd = os.open(self.target_path.parent, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
            self._write_activation_lock(upload_id)
            candidate.unlink()
            Path(job["sourcePath"]).unlink(missing_ok=True)
            job["state"] = "activated"
            job["phase"] = "Database activated"
            self._persist(job)
            return {
                **self._public_job(job),
                "databaseReady": True,
            }
