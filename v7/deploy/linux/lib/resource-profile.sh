#!/usr/bin/env bash

# Deterministic host-capacity policy shared by install.sh and its executable
# Harness. Linux frequently reports about 450-490 MiB of usable MemTotal for a
# provider's advertised 512 MB instance, so 450 MiB is the lower bound of the
# supported 512 MB class.

REPLAY_LAB_MIN_MEMORY_CLASS_MIB=450

replay_lab_read_memory_mib() {
  local meminfo_path="${1:-/proc/meminfo}"
  local memory_kib=""
  memory_kib="$(awk '$1 == "MemTotal:" { print $2; exit }' "$meminfo_path")"
  [[ "$memory_kib" =~ ^[0-9]+$ && "$memory_kib" -gt 0 ]] || {
    printf 'could not read MemTotal from %s\n' "$meminfo_path" >&2
    return 1
  }
  printf '%s\n' "$((memory_kib / 1024))"
}

replay_lab_read_swap_mib() {
  local meminfo_path="${1:-/proc/meminfo}"
  local swap_kib=""
  swap_kib="$(awk '$1 == "SwapTotal:" { print $2; exit }' "$meminfo_path")"
  [[ "$swap_kib" =~ ^[0-9]+$ ]] || {
    printf 'could not read SwapTotal from %s\n' "$meminfo_path" >&2
    return 1
  }
  printf '%s\n' "$((swap_kib / 1024))"
}

replay_lab_require_minimum_memory() {
  local memory_mib="$1"
  [[ "$memory_mib" =~ ^[0-9]+$ ]] || {
    printf 'physical memory must be an integer MiB value\n' >&2
    return 1
  }
  if (( memory_mib < REPLAY_LAB_MIN_MEMORY_CLASS_MIB )); then
    printf 'Replay Lab requires a 512 MB-class host (Linux MemTotal >= %s MiB); detected %s MiB\n' \
      "$REPLAY_LAB_MIN_MEMORY_CLASS_MIB" "$memory_mib" >&2
    return 1
  fi
}

# Prints: profile<TAB>DuckDB memory limit<TAB>DuckDB threads<TAB>swap floor MiB.
replay_lab_select_resource_profile() {
  local memory_mib="$1"
  local cpu_count="${2:-1}"
  local profile=""
  local memory_limit=""
  local threads=1
  local swap_floor_mib=0
  replay_lab_require_minimum_memory "$memory_mib" || return 1
  [[ "$cpu_count" =~ ^[0-9]+$ && "$cpu_count" -gt 0 ]] || cpu_count=1

  if (( memory_mib < 768 )); then
    profile="compact-512m"
    memory_limit="128MB"
    threads=1
    swap_floor_mib=2048
  elif (( memory_mib < 1536 )); then
    profile="small-1g"
    memory_limit="256MB"
    threads=1
    swap_floor_mib=1024
  elif (( memory_mib < 3072 )); then
    profile="balanced-2g"
    memory_limit="512MB"
    threads=2
    swap_floor_mib=512
  else
    profile="standard-4g-plus"
    memory_limit="1024MB"
    threads=4
    swap_floor_mib=0
  fi
  (( threads <= cpu_count )) || threads="$cpu_count"
  printf '%s\t%s\t%s\t%s\n' \
    "$profile" "$memory_limit" "$threads" "$swap_floor_mib"
}

replay_lab_swap_is_active() {
  local swap_path="$1"
  awk -v target="$swap_path" 'NR > 1 && $1 == target { found=1 } END { exit(found ? 0 : 1) }' \
    /proc/swaps
}

replay_lab_persist_managed_swap() {
  local swap_path="$1"
  if awk -v target="$swap_path" '
    /^[[:space:]]*#/ { next }
    $1 == target && $3 == "swap" { found=1 }
    END { exit(found ? 0 : 1) }
  ' /etc/fstab 2>/dev/null; then
    return 0
  fi
  printf '%s none swap sw 0 0\n' "$swap_path" | sudo_cmd tee -a /etc/fstab >/dev/null
}

# Capacity provisioning deliberately persists independently of a code-release
# rollback. It is idempotent and never replaces an unrelated swap device.
replay_lab_ensure_swap_floor() {
  local required_mib="$1"
  local swap_path="$2"
  local current_mib=""
  local missing_mib=0
  local existing_mib=0
  local parent=""
  local available_kib=0
  local required_kib=0

  [[ "$required_mib" =~ ^[0-9]+$ ]] || {
    printf 'swap floor must be an integer MiB value\n' >&2
    return 1
  }
  [[ "$swap_path" = /* && "$swap_path" != "/" && "$swap_path" != *[[:space:]]* ]] || {
    printf 'managed swap path must be a safe absolute path\n' >&2
    return 1
  }
  (( required_mib > 0 )) || return 0
  current_mib="$(replay_lab_read_swap_mib)" || return 1
  if (( current_mib >= required_mib )); then
    if replay_lab_swap_is_active "$swap_path"; then
      replay_lab_persist_managed_swap "$swap_path" || return 1
    fi
    printf 'INFO: swap capacity: %s MiB available; required floor %s MiB\n' \
      "$current_mib" "$required_mib"
    return 0
  fi

  command -v mkswap >/dev/null 2>&1 || {
    printf 'mkswap is required to provision low-memory host capacity\n' >&2
    return 1
  }
  command -v swapon >/dev/null 2>&1 || {
    printf 'swapon is required to provision low-memory host capacity\n' >&2
    return 1
  }
  missing_mib="$((required_mib - current_mib))"
  parent="$(dirname -- "$swap_path")"
  sudo_cmd install -d -m 0700 -o root -g root "$parent" || return 1

  if sudo_cmd test -L "$swap_path"; then
    printf 'managed swap target must not be a symbolic link: %s\n' "$swap_path" >&2
    return 1
  fi
  if sudo_cmd test -e "$swap_path" && ! sudo_cmd test -f "$swap_path"; then
    printf 'managed swap target exists and is not a regular file: %s\n' "$swap_path" >&2
    return 1
  fi
  if replay_lab_swap_is_active "$swap_path"; then
    printf 'managed swap is active but total swap remains below the required floor: %s\n' \
      "$swap_path" >&2
    return 1
  fi
  if sudo_cmd test -f "$swap_path"; then
    existing_mib="$(( $(sudo_cmd stat -c '%s' -- "$swap_path") / 1024 / 1024 ))"
  fi
  if (( existing_mib < missing_mib )); then
    available_kib="$(df -Pk "$parent" | awk 'NR == 2 { print $4 }')"
    required_kib="$(((missing_mib + 512) * 1024))"
    [[ "$available_kib" =~ ^[0-9]+$ && "$available_kib" -ge "$required_kib" ]] || {
      printf 'insufficient free disk for %s MiB managed swap plus 512 MiB reserve\n' \
        "$missing_mib" >&2
      return 1
    }
    sudo_cmd rm -f -- "$swap_path" || return 1
    if command -v fallocate >/dev/null 2>&1; then
      sudo_cmd fallocate -l "${missing_mib}M" "$swap_path" || return 1
    else
      sudo_cmd dd if=/dev/zero of="$swap_path" bs=1M count="$missing_mib" status=none \
        || return 1
    fi
  fi
  sudo_cmd chmod 0600 "$swap_path" || return 1
  sudo_cmd mkswap "$swap_path" >/dev/null || return 1
  sudo_cmd swapon "$swap_path" || return 1
  replay_lab_persist_managed_swap "$swap_path" || return 1
  current_mib="$(replay_lab_read_swap_mib)" || return 1
  (( current_mib >= required_mib )) || {
    printf 'swap provisioning did not reach the required %s MiB floor\n' "$required_mib" >&2
    return 1
  }
  printf 'OK: swap capacity: %s MiB available through %s\n' "$current_mib" "$swap_path"
}
