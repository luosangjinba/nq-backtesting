#!/usr/bin/env bash

# Host-file transaction used by install.sh. The caller supplies sudo_cmd so the
# same behavior is independently testable without mutating a real host.

REPLAY_LAB_HOST_TRANSACTION_ACTIVE=0
REPLAY_LAB_HOST_TRANSACTION_BACKUP_ROOT=""
REPLAY_LAB_HOST_METADATA_ACTIVE=0
REPLAY_LAB_HOST_METADATA_PATH=""
REPLAY_LAB_HOST_RECOVERY_SNAPSHOT_PATH=""
REPLAY_LAB_FAILED_RELEASE_QUARANTINE_PATH=""
REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED=0

replay_lab_host_transaction_begin() {
  local backup_root="$1"
  shift
  [[ "$REPLAY_LAB_HOST_TRANSACTION_ACTIVE" -eq 0 ]] \
    || { printf 'host transaction is already active\n' >&2; return 1; }
  [[ "$backup_root" = /* && "$backup_root" != "/" ]] \
    || { printf 'host transaction backup root must be a safe absolute path\n' >&2; return 1; }

  install -d -m 0700 "$backup_root/files"
  : > "$backup_root/present"
  : > "$backup_root/absent"
  local index=0
  local target=""
  for target in "$@"; do
    [[ "$target" = /* && "$target" != "/" ]] \
      || { printf 'host transaction target must be a safe absolute path: %s\n' "$target" >&2; return 1; }
    index=$((index + 1))
    if sudo_cmd test -e "$target" || sudo_cmd test -L "$target"; then
      sudo_cmd cp -a -- "$target" "$backup_root/files/$index"
      printf '%s\t%s\n' "$target" "$backup_root/files/$index" >> "$backup_root/present"
    else
      printf '%s\n' "$target" >> "$backup_root/absent"
    fi
  done
  REPLAY_LAB_HOST_TRANSACTION_BACKUP_ROOT="$backup_root"
  REPLAY_LAB_HOST_TRANSACTION_ACTIVE=1
}

replay_lab_host_transaction_restore() {
  [[ "$REPLAY_LAB_HOST_TRANSACTION_ACTIVE" -eq 1 ]] || return 0
  local failed=0
  local target=""
  local backup=""
  local candidate=""
  while IFS=$'\t' read -r target backup; do
    [[ -n "$target" && -n "$backup" ]] || continue
    candidate="${target}.replay-lab-restore-$$"
    if sudo_cmd cp -a -- "$backup" "$candidate"; then
      sudo_cmd mv -Tf -- "$candidate" "$target" || failed=1
    else
      failed=1
    fi
    sudo_cmd test ! -e "$candidate" && sudo_cmd test ! -L "$candidate" \
      || sudo_cmd unlink -- "$candidate" 2>/dev/null \
      || failed=1
  done < "$REPLAY_LAB_HOST_TRANSACTION_BACKUP_ROOT/present"
  while IFS= read -r target; do
    [[ -n "$target" ]] || continue
    if sudo_cmd test -e "$target" || sudo_cmd test -L "$target"; then
      sudo_cmd unlink -- "$target" || failed=1
    fi
  done < "$REPLAY_LAB_HOST_TRANSACTION_BACKUP_ROOT/absent"
  if [[ "$failed" -eq 0 ]]; then
    REPLAY_LAB_HOST_TRANSACTION_ACTIVE=0
  fi
  return "$failed"
}

replay_lab_host_transaction_commit() {
  [[ "$REPLAY_LAB_HOST_TRANSACTION_ACTIVE" -eq 1 ]] \
    || { printf 'no active host transaction to commit\n' >&2; return 1; }
  REPLAY_LAB_HOST_TRANSACTION_ACTIVE=0
}

replay_lab_host_metadata_begin() {
  local metadata_path="$1"
  shift
  [[ "$REPLAY_LAB_HOST_METADATA_ACTIVE" -eq 0 ]] \
    || { printf 'host metadata transaction is already active\n' >&2; return 1; }
  [[ "$metadata_path" = /* && "$metadata_path" != "/" ]] \
    || { printf 'host metadata path must be a safe absolute path\n' >&2; return 1; }
  : > "$metadata_path"
  local target=""
  local metadata=""
  for target in "$@"; do
    [[ "$target" = /* && "$target" != "/" ]] \
      || { printf 'host metadata target must be a safe absolute path: %s\n' "$target" >&2; return 1; }
    if sudo_cmd test -e "$target" || sudo_cmd test -L "$target"; then
      metadata="$(sudo_cmd stat -c $'%u\t%g\t%a' -- "$target")"
      printf 'present\t%s\t%s\n' "$target" "$metadata" >> "$metadata_path"
    else
      printf 'absent\t%s\n' "$target" >> "$metadata_path"
    fi
  done
  REPLAY_LAB_HOST_METADATA_PATH="$metadata_path"
  REPLAY_LAB_HOST_METADATA_ACTIVE=1
}

replay_lab_host_metadata_restore() {
  [[ "$REPLAY_LAB_HOST_METADATA_ACTIVE" -eq 1 ]] || return 0
  local failed=0
  local status=""
  local target=""
  local uid=""
  local gid=""
  local mode=""
  while IFS=$'\t' read -r status target uid gid mode; do
    [[ "$status" == "present" ]] || continue
    if sudo_cmd test -e "$target" || sudo_cmd test -L "$target"; then
      sudo_cmd chown "$uid:$gid" -- "$target" || failed=1
      sudo_cmd chmod "$mode" -- "$target" || failed=1
    else
      printf 'host metadata target disappeared during deployment: %s\n' "$target" >&2
      failed=1
    fi
  done < "$REPLAY_LAB_HOST_METADATA_PATH"
  if [[ "$failed" -eq 0 ]]; then
    REPLAY_LAB_HOST_METADATA_ACTIVE=0
  fi
  return "$failed"
}

replay_lab_host_metadata_commit() {
  [[ "$REPLAY_LAB_HOST_METADATA_ACTIVE" -eq 1 ]] \
    || { printf 'no active host metadata transaction to commit\n' >&2; return 1; }
  REPLAY_LAB_HOST_METADATA_ACTIVE=0
}

replay_lab_host_preserve_recovery_snapshot() {
  local recovery_root="$1"
  local snapshot_name="$2"
  local snapshot_owner="$3"
  local snapshot_group="$4"
  shift 4
  [[ "$recovery_root" = /* && "$recovery_root" != "/" ]] \
    || { printf 'recovery root must be a safe absolute path\n' >&2; return 1; }
  [[ "$snapshot_name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] \
    || { printf 'recovery snapshot name is unsafe: %s\n' "$snapshot_name" >&2; return 1; }
  [[ -n "$snapshot_owner" && -n "$snapshot_group" ]] \
    || { printf 'recovery snapshot owner and group are required\n' >&2; return 1; }

  local final_path="$recovery_root/$snapshot_name"
  local staging_path="$recovery_root/.${snapshot_name}.staging"
  REPLAY_LAB_HOST_RECOVERY_SNAPSHOT_PATH="$staging_path"
  sudo_cmd install -d -m 0700 -o "$snapshot_owner" -g "$snapshot_group" \
    "$recovery_root" || return 1
  if sudo_cmd test -e "$final_path" || sudo_cmd test -L "$final_path" \
    || sudo_cmd test -e "$staging_path" || sudo_cmd test -L "$staging_path"; then
    printf 'recovery snapshot target already exists: %s\n' "$final_path" >&2
    return 1
  fi
  sudo_cmd install -d -m 0700 -o "$snapshot_owner" -g "$snapshot_group" \
    "$staging_path" || return 1

  local source=""
  local label=""
  local destination=""
  for source in "$@"; do
    [[ "$source" = /* && "$source" != "/" ]] \
      || { printf 'recovery source must be a safe absolute path: %s\n' "$source" >&2; return 1; }
    if ! sudo_cmd test -e "$source" && ! sudo_cmd test -L "$source"; then
      printf 'recovery source is missing: %s\n' "$source" >&2
      return 1
    fi
    label="$(basename -- "$source")"
    [[ "$label" != "." && "$label" != ".." && "$label" != */* ]] \
      || { printf 'recovery source label is unsafe: %s\n' "$label" >&2; return 1; }
    destination="$staging_path/$label"
    if sudo_cmd test -e "$destination" || sudo_cmd test -L "$destination"; then
      printf 'duplicate recovery source label: %s\n' "$label" >&2
      return 1
    fi
    sudo_cmd cp -a -- "$source" "$destination" || return 1
  done

  sudo_cmd chmod 0700 -- "$staging_path" || return 1
  sudo_cmd chown "$snapshot_owner:$snapshot_group" -- "$staging_path" || return 1
  sudo_cmd mv -T -- "$staging_path" "$final_path" || return 1
  REPLAY_LAB_HOST_RECOVERY_SNAPSHOT_PATH="$final_path"
}

replay_lab_quarantine_failed_release() {
  local install_root="$1"
  local release_dir="$2"
  local current_release="$3"
  local quarantine_tag="$4"
  local quarantine_owner="$5"
  local quarantine_group="$6"
  [[ "$install_root" = /* && "$install_root" != "/" \
    && "$release_dir" = /* && "$release_dir" != "/" \
    && "$current_release" = /* && "$current_release" != "/" ]] \
    || { printf 'failed-release quarantine paths must be safe and absolute\n' >&2; return 1; }
  [[ "$(dirname -- "$release_dir")" == "$install_root/releases" ]] \
    || { printf 'refusing to quarantine a path outside the release root: %s\n' "$release_dir" >&2; return 1; }
  [[ "$quarantine_tag" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] \
    || { printf 'failed-release quarantine tag is unsafe: %s\n' "$quarantine_tag" >&2; return 1; }
  [[ -n "$quarantine_owner" && -n "$quarantine_group" ]] \
    || { printf 'failed-release quarantine owner and group are required\n' >&2; return 1; }
  if ! sudo_cmd test -e "$release_dir" && ! sudo_cmd test -L "$release_dir"; then
    return 0
  fi
  if sudo_cmd test -L "$release_dir" || ! sudo_cmd test -d "$release_dir"; then
    printf 'refusing to quarantine a non-directory release: %s\n' "$release_dir" >&2
    return 1
  fi

  local release_target=""
  local current_target=""
  release_target="$(sudo_cmd readlink -f -- "$release_dir")" || return 1
  if sudo_cmd test -e "$current_release" || sudo_cmd test -L "$current_release"; then
    current_target="$(sudo_cmd readlink -f -- "$current_release" 2>/dev/null || true)"
  fi
  [[ -z "$current_target" || "$current_target" != "$release_target" ]] \
    || { printf 'refusing to quarantine the active release: %s\n' "$release_dir" >&2; return 1; }

  local quarantine_root="$install_root/failed-releases"
  local quarantine_path="$quarantine_root/$(basename -- "$release_dir")-$quarantine_tag"
  REPLAY_LAB_FAILED_RELEASE_QUARANTINE_PATH=""
  REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED=0
  sudo_cmd install -d -m 0700 -o "$quarantine_owner" -g "$quarantine_group" \
    "$quarantine_root" || return 1
  if sudo_cmd test -e "$quarantine_path" || sudo_cmd test -L "$quarantine_path"; then
    printf 'failed-release quarantine target already exists: %s\n' "$quarantine_path" >&2
    return 1
  fi
  sudo_cmd mv -T -- "$release_dir" "$quarantine_path" || return 1
  REPLAY_LAB_FAILED_RELEASE_QUARANTINE_PATH="$quarantine_path"
  sudo_cmd chmod 0700 -- "$quarantine_path" || return 1
  sudo_cmd chown "$quarantine_owner:$quarantine_group" -- "$quarantine_path" || return 1

  local quarantined_venv="$quarantine_path/.venv"
  if sudo_cmd test -L "$quarantined_venv"; then
    if ! sudo_cmd unlink -- "$quarantined_venv"; then
      REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED=1
    fi
  elif sudo_cmd test -d "$quarantined_venv"; then
    if ! sudo_cmd rm -rf -- "$quarantined_venv"; then
      REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED=1
    fi
  elif sudo_cmd test -e "$quarantined_venv"; then
    if ! sudo_cmd unlink -- "$quarantined_venv"; then
      REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED=1
    fi
  fi
  if sudo_cmd test -e "$quarantined_venv" || sudo_cmd test -L "$quarantined_venv"; then
    REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED=1
  fi
  if [[ "$REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED" -eq 1 ]]; then
    printf 'failed release is quarantined but its virtualenv could not be removed: %s\n' \
      "$quarantined_venv" >&2
  fi
}
