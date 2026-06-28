import json
import os
import re
import threading
from datetime import datetime, timezone


DEFAULT_USER_ID = "default"
DEFAULT_WORKSPACE_ID = "default"
WORKSPACE_DOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
WORKSPACE_INSTRUMENT_RE = re.compile(r"^[A-Z][A-Z0-9._-]{0,15}$")
WORKSPACE_BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "users",
        DEFAULT_USER_ID,
        "workspaces",
        DEFAULT_WORKSPACE_ID,
    )
)
ALLOWED_WORKSPACE_DOMAINS = {
    "chart-notes": {"instrumentScoped": True},
    "daily-time-reviews": {"instrumentScoped": True},
    "date-range-history": {"instrumentScoped": False},
    "display-preferences": {"instrumentScoped": False},
    "economic-event-notes": {"instrumentScoped": True},
    "entry-context-catalog": {"instrumentScoped": False},
    "import-batches": {"instrumentScoped": False},
    "live-records": {"instrumentScoped": True},
    "market-segments": {"instrumentScoped": True},
    "order-reviews": {"instrumentScoped": True},
    "pda-annotations": {"instrumentScoped": True},
    "time-overlays": {"instrumentScoped": True},
}

_WORKSPACE_LOCK = threading.Lock()


def configure_workspace_store(*, base_dir=None):
    global WORKSPACE_BASE_DIR
    if base_dir:
        WORKSPACE_BASE_DIR = os.path.abspath(str(base_dir))


def current_user_id(handler=None):
    return DEFAULT_USER_ID


def current_workspace_id(handler=None):
    return DEFAULT_WORKSPACE_ID


def _utc_now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_workspace_domain(value):
    domain = str(value or "").strip()
    if not WORKSPACE_DOMAIN_RE.match(domain):
        raise ValueError("Invalid workspace domain")
    if domain not in ALLOWED_WORKSPACE_DOMAINS:
        raise ValueError(f"Unsupported workspace domain: {domain}")
    return domain


def _normalize_workspace_instrument(value, domain):
    text = str(value or "").strip().upper()
    domain_config = ALLOWED_WORKSPACE_DOMAINS[domain]
    if not domain_config.get("instrumentScoped"):
        if text:
            raise ValueError(f"Workspace domain is not instrument-scoped: {domain}")
        return None
    if not WORKSPACE_INSTRUMENT_RE.match(text):
        raise ValueError("Invalid workspace instrument")
    return text


def _workspace_document_path(domain, instrument=None):
    if instrument:
        return os.path.join(WORKSPACE_BASE_DIR, "instruments", instrument, f"{domain}.json")
    return os.path.join(WORKSPACE_BASE_DIR, "preferences", f"{domain}.json")


def _workspace_response(domain, instrument, document=None):
    user_id = current_user_id()
    workspace_id = current_workspace_id()
    if not document:
        return {
            "ok": True,
            "found": False,
            "user_id": user_id,
            "workspace_id": workspace_id,
            "domain": domain,
            "instrument": instrument,
            "version": 1,
            "savedAt": None,
            "revision": None,
            "payload": None,
        }
    return {
        "ok": True,
        "found": True,
        "user_id": document.get("user_id", user_id),
        "workspace_id": document.get("workspace_id", workspace_id),
        "domain": document.get("domain", domain),
        "instrument": document.get("instrument", instrument),
        "version": int(document.get("version") or 1),
        "savedAt": document.get("savedAt"),
        "revision": document.get("revision"),
        "payload": document.get("payload"),
    }


def read_workspace_document(domain, instrument=None):
    domain = _normalize_workspace_domain(domain)
    instrument = _normalize_workspace_instrument(instrument, domain)
    path = _workspace_document_path(domain, instrument)
    if not os.path.exists(path):
        return _workspace_response(domain, instrument)
    with _WORKSPACE_LOCK:
        with open(path, "r", encoding="utf-8") as f:
            document = json.load(f)
    return _workspace_response(domain, instrument, document)


def write_workspace_document(payload):
    if not isinstance(payload, dict):
        raise ValueError("Workspace request body must be a JSON object")
    domain = _normalize_workspace_domain(payload.get("domain"))
    instrument = _normalize_workspace_instrument(payload.get("instrument"), domain)
    value = payload.get("payload")
    if not isinstance(value, dict):
        raise ValueError("Workspace payload must be a JSON object")
    version = int(payload.get("version") or 1)
    if version <= 0:
        raise ValueError("Workspace version must be positive")
    saved_at = _utc_now_iso()
    document = {
        "user_id": current_user_id(),
        "workspace_id": current_workspace_id(),
        "domain": domain,
        "instrument": instrument,
        "version": version,
        "savedAt": saved_at,
        "revision": saved_at,
        "payload": value,
    }
    path = _workspace_document_path(domain, instrument)
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)
    temp_path = f"{path}.{os.getpid()}.{threading.get_ident()}.tmp"
    with _WORKSPACE_LOCK:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(document, f, ensure_ascii=False, sort_keys=True, indent=2)
            f.write("\n")
        os.replace(temp_path, path)
    return _workspace_response(domain, instrument, document)
