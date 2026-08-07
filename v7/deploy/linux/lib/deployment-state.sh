#!/usr/bin/env bash

# Pure host-state classification for the public-IP deployment orchestrator.

replay_lab_select_database_mode() {
  local db_path="$1"
  local requested_mode="$2"
  case "$requested_mode" in
    auto)
      if [[ -f "$db_path" ]]; then
        printf 'existing'
      elif [[ ! -e "$db_path" && ! -L "$db_path" ]]; then
        printf 'bootstrap'
      else
        printf 'database target exists but is not a regular file: %s' "$db_path"
        return 1
      fi
      ;;
    required)
      if [[ ! -e "$db_path" && ! -L "$db_path" ]]; then
        printf 'bootstrap'
      else
        printf '%s' "--bootstrap requires a missing database target: $db_path"
        return 1
      fi
      ;;
    disabled)
      if [[ -f "$db_path" ]]; then
        printf 'existing'
      else
        printf 'DuckDB file is missing: %s' "$db_path"
        return 1
      fi
      ;;
    *)
      printf 'unknown database deployment mode: %s' "$requested_mode"
      return 1
      ;;
  esac
}

replay_lab_classify_release() {
  local current_release="$1"
  [[ -L "$current_release" ]] && printf 'upgrade' || printf 'first'
}

replay_lab_select_password_file() {
  local requested_path="$1"
  local explicit="$2"
  local legacy_path="$3"
  if [[ "$explicit" -eq 0 && ! -s "$requested_path" && -s "$legacy_path" ]]; then
    printf '%s' "$legacy_path"
  else
    printf '%s' "$requested_path"
  fi
}
