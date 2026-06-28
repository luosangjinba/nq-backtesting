import os
import shlex


LOCAL_ENV_VARIABLES = {
    "DATABENTO_API_KEY": {
        "label": "Databento API key",
        "secret": True,
        "requiresRestart": False,
        "description": "Used by Refresh Range dry-run/write and roll volume scans.",
    },
    "V4_TRADING_DB": {
        "label": "Trading DB path",
        "secret": False,
        "requiresRestart": True,
        "description": "Optional override for data/trading_data.duckdb.",
    },
    "V4_WEB_PORT": {
        "label": "Web port",
        "secret": False,
        "requiresRestart": True,
        "description": "Optional web port override for start.sh.",
    },
    "V4_API_HOST": {
        "label": "API bind host",
        "secret": False,
        "requiresRestart": True,
        "description": "Optional API bind host. Use 0.0.0.0 on a trusted server/VPN network.",
    },
    "V4_ALLOWED_WEB_ORIGINS": {
        "label": "Allowed web origins",
        "secret": False,
        "requiresRestart": True,
        "description": "Comma-separated origins allowed to run data-maintenance POST actions.",
    },
}


def _clean_text(value, max_length=500):
    text = str(value or "").strip()
    if "\n" in text or "\r" in text:
        raise ValueError("Values must be single-line text")
    if len(text) > max_length:
        raise ValueError(f"Value is too long; max {max_length} characters")
    return text


def _choice(value, allowed, field):
    text = _clean_text(value)
    if text not in allowed:
        raise ValueError(f"Invalid {field}: {text}")
    return text


def _parse_local_env_lines(path):
    entries = []
    if not os.path.exists(path):
        return entries
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f.read().splitlines():
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#") or "=" not in raw_line:
                entries.append({"kind": "raw", "line": raw_line})
                continue
            key, value = raw_line.split("=", 1)
            key = key.strip()
            if not key.replace("_", "A").isalnum() or key[:1].isdigit():
                entries.append({"kind": "raw", "line": raw_line})
                continue
            value = value.strip()
            try:
                parts = shlex.split(value, posix=True)
                value = parts[0] if parts else ""
            except ValueError:
                if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
            entries.append({"kind": "entry", "key": key, "value": value, "line": raw_line})
    return entries


def _format_env_line(key, value):
    clean_value = _clean_text(value, 1000)
    return f"{key}={shlex.quote(clean_value)}"


def _write_local_env_entries(entries, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lines = []
    for entry in entries:
        if entry.get("kind") == "entry":
            lines.append(_format_env_line(entry["key"], entry.get("value", "")))
        else:
            lines.append(entry.get("line", ""))
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines).rstrip() + "\n")


def _mask_env_value(value, secret=False):
    if value is None or value == "":
        return "unset"
    text = str(value)
    if not secret:
        return "set"
    suffix = text[-4:] if len(text) >= 4 else "****"
    return f"set ****{suffix} length={len(text)}"


def _get_local_env_status(path):
    entries = _parse_local_env_lines(path)
    file_values = {
        entry["key"]: entry.get("value", "")
        for entry in entries
        if entry.get("kind") == "entry" and entry.get("key") in LOCAL_ENV_VARIABLES
    }
    rows = []
    for key, definition in LOCAL_ENV_VARIABLES.items():
        file_value = file_values.get(key, "")
        process_value = os.environ.get(key, "")
        rows.append({
            "key": key,
            "label": definition["label"],
            "secret": definition["secret"],
            "requiresRestart": definition["requiresRestart"],
            "description": definition["description"],
            "fileSet": bool(file_value),
            "processSet": bool(process_value),
            "fileMasked": _mask_env_value(file_value, definition["secret"]),
            "processMasked": _mask_env_value(process_value, definition["secret"]),
        })
    return rows


def _format_local_env_status(rows, path):
    lines = [
        "local_environment_status: ok",
        f"file: {path}",
        f"file_exists: {str(os.path.exists(path)).lower()}",
        "",
        "variables",
    ]
    for row in rows:
        restart = " restart_required" if row["requiresRestart"] else ""
        lines.append(
            f"- {row['key']}: file={row['fileMasked']} process={row['processMasked']}{restart}"
        )
    return "\n".join(lines) + "\n"


def _set_local_env_value(key, value, path):
    if key not in LOCAL_ENV_VARIABLES:
        raise ValueError(f"Unsupported local environment key: {key}")
    clean_value = _clean_text(value, 1000)
    entries = _parse_local_env_lines(path)
    updated = False
    next_entries = []
    for entry in entries:
        if entry.get("kind") == "entry" and entry.get("key") == key:
            if not updated:
                next_entries.append({"kind": "entry", "key": key, "value": clean_value})
                updated = True
            continue
        next_entries.append(entry)
    if not updated:
        if next_entries and next_entries[-1].get("line", "") != "":
            next_entries.append({"kind": "raw", "line": ""})
        next_entries.append({"kind": "entry", "key": key, "value": clean_value})
    _write_local_env_entries(next_entries, path)
    os.environ[key] = clean_value
    return _get_local_env_status(path)


def _delete_local_env_value(key, path):
    if key not in LOCAL_ENV_VARIABLES:
        raise ValueError(f"Unsupported local environment key: {key}")
    entries = _parse_local_env_lines(path)
    next_entries = [
        entry for entry in entries
        if not (entry.get("kind") == "entry" and entry.get("key") == key)
    ]
    _write_local_env_entries(next_entries, path)
    os.environ.pop(key, None)
    return _get_local_env_status(path)


def run_local_env_action(payload, *, path):
    action = _choice(payload.get("action"), {"environment_status", "environment_write", "environment_delete"}, "action")
    if action == "environment_status":
        rows = _get_local_env_status(path)
        return {
            "ok": True,
            "returncode": 0,
            "command": "local environment status",
            "output": _format_local_env_status(rows, path),
            "environment": rows,
        }
    key = _choice(payload.get("key"), set(LOCAL_ENV_VARIABLES), "key")
    if action == "environment_write":
        value = _clean_text(payload.get("value"), 1000)
        if not value:
            raise ValueError("Environment value cannot be empty; use Delete to remove a value")
        rows = _set_local_env_value(key, value, path)
        return {
            "ok": True,
            "returncode": 0,
            "command": "local environment write",
            "output": _format_local_env_status(rows, path) + f"write_status: saved\nupdated_key: {key}\n",
            "environment": rows,
        }
    rows = _delete_local_env_value(key, path)
    return {
        "ok": True,
        "returncode": 0,
        "command": "local environment delete",
        "output": _format_local_env_status(rows, path) + f"delete_status: deleted\nupdated_key: {key}\n",
        "environment": rows,
    }
