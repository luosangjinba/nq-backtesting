#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Replay Lab direct-public-IPv4 quick deployment

Usage:
  sudo bash v7/deploy/linux/deploy-public-ip.sh \
    --public-ip 203.0.113.10 \
    [--db /srv/replay-lab-data/trading_data.duckdb]

Options:
  --public-ip IPV4       Public IPv4 address opened on cloud TCP 80/443.
  --db PATH              DuckDB target. Default: /srv/replay-lab-data/trading_data.duckdb
  --bootstrap            Require a missing target and force first-run upload mode.
  --require-existing-db  Disable automatic bootstrap and require an existing DuckDB.
  --auth-user USER       Browser login user. Default: reviewer
  --service-user USER    Dedicated Linux service user. Default: replay
  --password-file PATH   Persistent root-only password file.
                         Default: /etc/replay-lab/secrets/web-password
                         Existing /root/replay-lab-secrets/web-password is reused.
  --reset-password       Prompt for a new browser password even when the file exists.
  --preserve-caddy       Preserve/reconcile existing sites (default; retained for compatibility).
  --replace-caddy        Replace Caddyfile; only for an intentionally dedicated host.
  --replace-legacy       Auto-migrate identified Replay Lab listeners (default compatibility flag).
  --help                 Show this help.

The command detects first versus repeat deployment, selects bootstrap from the
database target, reconciles current/legacy Replay Lab Caddy layouts, preserves
unrelated sites, migrates identified legacy listeners, auto-selects a resource
profile, rejects hosts below the supported 512 MB class, and provisions swap.
Unknown listeners and Caddy sites that already own the requested IP still fail
closed. Only --public-ip is host-specific.
This wrapper does not open a cloud security group. Allow inbound TCP 80/443 in
the provider console, and do not expose 8007/8766/8767/8768.
USAGE
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

info() {
  printf 'INFO: %s\n' "$*"
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

validate_ipv4() {
  local value="$1"
  local parts=()
  local part=""
  IFS=. read -r -a parts <<< "$value"
  [[ "${#parts[@]}" -eq 4 ]] || return 1
  for part in "${parts[@]}"; do
    [[ "$part" =~ ^[0-9]{1,3}$ ]] || return 1
    (( 10#$part <= 255 )) || return 1
  done
}

listener_pids() {
  local port="$1"
  ss -H -ltnp 2>/dev/null \
    | awk -v suffix=":$port" '$4 ~ suffix "$" { print }' \
    | grep -oE 'pid=[0-9]+' \
    | cut -d= -f2 \
    | sort -u || true
}

stop_identified_listener() {
  local port="$1"
  local unit="$2"
  local legacy_unit="${3:-}"
  local pid=""
  local command_line=""
  local pids=()
  systemctl is-active --quiet "$unit" && return
  if [[ -n "$legacy_unit" ]] && systemctl is-active --quiet "$legacy_unit"; then
    info "legacy managed unit will be migrated transactionally: $legacy_unit"
    return
  fi
  mapfile -t pids < <(listener_pids "$port")
  [[ "${#pids[@]}" -gt 0 ]] || return 0
  [[ "$replace_legacy" -eq 1 ]] \
    || die "port $port has a legacy listener; inspect it or rerun with --replace-legacy"
  for pid in "${pids[@]}"; do
    [[ -r "/proc/$pid/cmdline" ]] || die "cannot inspect listener PID $pid on port $port"
    command_line="$(tr '\0' ' ' < "/proc/$pid/cmdline")"
    if [[ "$port" == "8766"
      && ("$command_line" == *"market_data_api.py"* \
        || "$command_line" == *"v4_api.py"* \
        || "$command_line" == *"read_api.py"*) ]]; then
      :
    elif [[ "$port" == "8007" && "$command_line" == *"serve.mjs"* && "$command_line" == *"8007"* ]]; then
      :
    else
      die "refusing to stop unknown PID $pid on port $port: $command_line"
    fi
    info "stopping identified legacy PID $pid on port $port: $command_line"
    kill "$pid"
    for _ in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    kill -0 "$pid" 2>/dev/null && die "legacy PID $pid did not stop"
  done
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
installer="$script_dir/install.sh"
source "$script_dir/lib/resource-profile.sh"
source "$script_dir/lib/deployment-state.sh"
db_path="/srv/replay-lab-data/trading_data.duckdb"
public_ip=""
auth_user="reviewer"
service_user="replay"
password_file="/etc/replay-lab/secrets/web-password"
password_file_explicit=0
reset_password=0
replace_legacy=1
preserve_caddy=1
bootstrap=0
bootstrap_mode="auto"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public-ip)
      [[ $# -ge 2 ]] || die "--public-ip requires a value"
      public_ip="$2"
      shift 2
      ;;
    --db)
      [[ $# -ge 2 ]] || die "--db requires a value"
      db_path="$2"
      shift 2
      ;;
    --bootstrap)
      [[ "$bootstrap_mode" != "disabled" ]] \
        || die "use only one of --bootstrap or --require-existing-db"
      bootstrap_mode="required"
      shift
      ;;
    --require-existing-db)
      [[ "$bootstrap_mode" != "required" ]] \
        || die "use only one of --bootstrap or --require-existing-db"
      bootstrap_mode="disabled"
      shift
      ;;
    --auth-user)
      [[ $# -ge 2 ]] || die "--auth-user requires a value"
      auth_user="$2"
      shift 2
      ;;
    --service-user)
      [[ $# -ge 2 ]] || die "--service-user requires a value"
      service_user="$2"
      shift 2
      ;;
    --password-file)
      [[ $# -ge 2 ]] || die "--password-file requires a value"
      password_file="$2"
      password_file_explicit=1
      shift 2
      ;;
    --reset-password)
      reset_password=1
      shift
      ;;
    --preserve-caddy)
      preserve_caddy=1
      shift
      ;;
    --replace-caddy)
      preserve_caddy=0
      shift
      ;;
    --replace-legacy)
      replace_legacy=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ "${EUID:-$(id -u)}" -eq 0 ]] || die "run this quick deploy with sudo/root"
[[ -x "$installer" ]] || die "installer is missing: $installer"
detected_memory_mib="$(replay_lab_read_memory_mib)" \
  || die "physical memory detection failed"
replay_lab_require_minimum_memory "$detected_memory_mib" \
  || die "host memory is below the supported minimum"
[[ -n "$public_ip" ]] || die "--public-ip is required"
validate_ipv4 "$public_ip" || die "--public-ip must be a valid IPv4 address"
[[ "$db_path" = /* ]] || die "--db must be absolute"
if ! selected_database_mode="$(replay_lab_select_database_mode "$db_path" "$bootstrap_mode")"; then
  die "$selected_database_mode"
fi
if [[ "$selected_database_mode" == "bootstrap" ]]; then
  bootstrap=1
  info "database state: target absent; selecting first-run browser upload"
else
  bootstrap=0
  info "database state: existing DuckDB; selecting read-only deployment"
fi
if [[ "$bootstrap" -eq 1 ]]; then
  db_parent="$(dirname -- "$db_path")"
  case "$db_parent" in
    /|/srv|/opt|/var|/etc|/usr|/home|/root|/tmp)
      die "--bootstrap database parent is too broad: $db_parent"
      ;;
  esac
fi
[[ "$password_file" = /* ]] || die "--password-file must be absolute"
[[ "$auth_user" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || die "invalid --auth-user"
[[ "$service_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]*[$]?$ ]] || die "invalid --service-user"

legacy_password_file="/root/replay-lab-secrets/web-password"
selected_password_file="$(replay_lab_select_password_file \
  "$password_file" "$password_file_explicit" "$legacy_password_file")"
if [[ "$selected_password_file" != "$password_file" ]]; then
  password_file="$selected_password_file"
  info "credential state: reusing the existing legacy root-only password file"
fi

if [[ "$(replay_lab_classify_release /opt/replay-lab/current)" == "upgrade" ]]; then
  info "host state: existing Replay Lab release; selecting idempotent upgrade"
else
  info "host state: no active Replay Lab release; selecting first deployment"
fi
if [[ "$preserve_caddy" -eq 1 ]]; then
  info "Caddy state: preserve and reconcile managed Replay Lab configuration"
else
  warn "Caddy state: explicit replacement mode will replace /etc/caddy/Caddyfile"
fi

database_metadata_changed=0
database_original_uid=""
database_original_gid=""
database_original_mode=""
restore_database_metadata() {
  [[ "$database_metadata_changed" -eq 1 ]] || return 0
  chown "$database_original_uid:$database_original_gid" "$db_path"
  chmod "$database_original_mode" "$db_path"
  database_metadata_changed=0
}
quick_deploy_exit() {
  local status="$1"
  trap - EXIT
  if [[ "$status" -ne 0 ]] && ! restore_database_metadata; then
    warn "deployment failed and the original database metadata could not be restored"
  fi
  exit "$status"
}
trap 'quick_deploy_exit "$?"' EXIT

if ! id "$service_user" >/dev/null 2>&1; then
  info "creating system service user: $service_user"
  useradd --system --home-dir /var/lib/replay-lab --create-home \
    --shell /sbin/nologin "$service_user"
fi
service_group="$(id -gn "$service_user")"
if [[ "$bootstrap" -eq 1 ]]; then
  install -d -m 0770 -o root -g "$service_group" "$db_parent"
  runuser -u "$service_user" -- test -w "$db_parent" \
    || die "service user cannot write the database bootstrap directory"
else
  database_original_uid="$(stat -c '%u' "$db_path")"
  database_original_gid="$(stat -c '%g' "$db_path")"
  database_original_mode="$(stat -c '%a' "$db_path")"
  chown root:"$service_group" "$db_path"
  chmod 0640 "$db_path"
  database_metadata_changed=1
  runuser -u "$service_user" -- test -r "$db_path" \
    || die "service user cannot read DuckDB after permission preparation"
fi

install -d -m 0700 "$(dirname -- "$password_file")"
if [[ "$reset_password" -eq 1 || ! -s "$password_file" ]]; then
  [[ -t 0 ]] || die "password creation requires an interactive terminal"
  read -rsp "Browser password for $auth_user: " password_one
  printf '\n'
  read -rsp "Repeat browser password: " password_two
  printf '\n'
  [[ -n "$password_one" ]] || die "browser password cannot be empty"
  [[ "$password_one" == "$password_two" ]] || die "browser passwords do not match"
  previous_umask="$(umask)"
  umask 077
  printf '%s' "$password_one" > "$password_file"
  umask "$previous_umask"
  unset password_one password_two
fi
chown root:root "$password_file"
chmod 0600 "$password_file"
[[ -r "$password_file" && -s "$password_file" ]] || die "password file preparation failed"

stop_identified_listener 8766 replay-lab-market-data.service replay-lab-api.service
stop_identified_listener 8007 replay-lab-web.service

info "cloud security group prerequisite: inbound TCP 80/443; keep 8007/8766/8767/8768 closed"
installer_arguments=(
  --apply --yes
  --db "$db_path"
  --service-user "$service_user"
  --public-ip "$public_ip"
  --auth-user "$auth_user"
  --auth-password-file "$password_file"
)
[[ "$preserve_caddy" -eq 0 ]] || installer_arguments+=(--preserve-caddy)
[[ "$bootstrap" -eq 0 ]] || installer_arguments+=(--bootstrap)
bash "$installer" "${installer_arguments[@]}"
database_metadata_changed=0
trap - EXIT

printf '\nDirect browser URL: https://%s/v7/app/\n' "$public_ip"
printf 'Browser user: %s\n' "$auth_user"
if [[ "$bootstrap" -eq 1 ]]; then
  printf 'Database setup: https://%s/v7/app/data-acquisition.html\n' "$public_ip"
fi
