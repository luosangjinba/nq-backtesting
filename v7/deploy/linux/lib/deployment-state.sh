#!/usr/bin/env bash

# Pure host-state classification for the unified deployment orchestrator.

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

replay_lab_profile_value() {
  local profile_path="$1"
  local key="$2"
  [[ -f "$profile_path" ]] || return 1
  awk -F= -v key="$key" '$1 == key { print substr($0, length(key) + 2); found=1; exit } END { exit(found ? 0 : 1) }' \
    "$profile_path"
}

replay_lab_profile_valid() {
  local profile_path="$1"
  [[ -f "$profile_path" ]] || return 1
  awk -F= '
    NF != 2 { exit 1 }
    $1 !~ /^(schemaVersion|mode|endpoint|databasePath|serviceUser|authUser|passwordFile|preserveCaddy)$/ { exit 1 }
    seen[$1]++ > 0 { exit 1 }
    END {
      if (NR != 8) exit 1
      required[1]="schemaVersion"
      required[2]="mode"
      required[3]="endpoint"
      required[4]="databasePath"
      required[5]="serviceUser"
      required[6]="authUser"
      required[7]="passwordFile"
      required[8]="preserveCaddy"
      for (key_index=1; key_index<=8; key_index++) {
        if (!(required[key_index] in seen)) exit 1
      }
    }
  ' "$profile_path" || return 1
  grep -Eq '^schemaVersion=1$' "$profile_path" || return 1
  grep -Eq '^mode=(local|public-ip|public-domain|private-domain)$' "$profile_path" || return 1
  grep -Eq '^preserveCaddy=[01]$' "$profile_path" || return 1
}

replay_lab_infer_existing_endpoint() {
  local current_release="$1"
  local caddy_fragment="$2"
  local endpoint=""
  if [[ -f "$caddy_fragment" ]]; then
    endpoint="$(awk '
      /^[[:space:]]*$/ || /^[[:space:]]*#/ { next }
      {
        line=$0
        sub(/[[:space:]]*\{[[:space:]]*$/, "", line)
        sub(/^[[:space:]]*/, "", line)
        sub(/[[:space:]]*$/, "", line)
        print line
        exit
      }
    ' "$caddy_fragment")"
    if [[ "$endpoint" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      printf 'public-ip\t%s' "$endpoint"
    elif grep -Eq '^[[:space:]]*tls[[:space:]]+internal[[:space:]]*$' "$caddy_fragment"; then
      printf 'private-domain\t%s' "$endpoint"
    else
      printf 'public-domain\t%s' "$endpoint"
    fi
    return 0
  fi
  printf 'local\t'
}
