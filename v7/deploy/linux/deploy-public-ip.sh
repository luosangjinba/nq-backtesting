#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Replay Lab direct-public-IPv4 quick deployment

Usage:
  sudo bash v7/deploy/linux/deploy-public-ip.sh \
    --public-ip 203.0.113.10 \
    --db /srv/replay-lab-data/trading_data.duckdb \
    [--preserve-caddy] \
    [--replace-legacy]

Options:
  --public-ip IPV4       Public IPv4 address opened on cloud TCP 80/443.
  --db PATH              Existing DuckDB file. Default: /srv/replay-lab-data/trading_data.duckdb
  --auth-user USER       Browser login user. Default: reviewer
  --service-user USER    Dedicated Linux service user. Default: replay
  --password-file PATH   Persistent root-only password file.
                         Default: /etc/replay-lab/secrets/web-password
  --reset-password       Prompt for a new browser password even when the file exists.
  --preserve-caddy       Keep existing Caddy sites and import a Replay Lab fragment.
  --replace-legacy       Stop only identified legacy v4_api.py/serve.mjs listeners on 8766/8007.
  --help                 Show this help.

This wrapper does not open a cloud security group. Allow inbound TCP 80/443 in
the provider console, and do not expose 8007/8766.
USAGE
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

info() {
  printf 'INFO: %s\n' "$*"
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
  local pid=""
  local command_line=""
  local pids=()
  systemctl is-active --quiet "$unit" && return
  mapfile -t pids < <(listener_pids "$port")
  [[ "${#pids[@]}" -gt 0 ]] || return 0
  [[ "$replace_legacy" -eq 1 ]] \
    || die "port $port has a legacy listener; inspect it or rerun with --replace-legacy"
  for pid in "${pids[@]}"; do
    [[ -r "/proc/$pid/cmdline" ]] || die "cannot inspect listener PID $pid on port $port"
    command_line="$(tr '\0' ' ' < "/proc/$pid/cmdline")"
    if [[ "$port" == "8766" && "$command_line" == *"v4_api.py"* ]]; then
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
db_path="/srv/replay-lab-data/trading_data.duckdb"
public_ip=""
auth_user="reviewer"
service_user="replay"
password_file="/etc/replay-lab/secrets/web-password"
reset_password=0
replace_legacy=0
preserve_caddy=0

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
[[ -n "$public_ip" ]] || die "--public-ip is required"
validate_ipv4 "$public_ip" || die "--public-ip must be a valid IPv4 address"
[[ "$db_path" = /* && -f "$db_path" ]] || die "DuckDB file is missing: $db_path"
[[ "$password_file" = /* ]] || die "--password-file must be absolute"
[[ "$auth_user" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || die "invalid --auth-user"
[[ "$service_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]*[$]?$ ]] || die "invalid --service-user"

if ! id "$service_user" >/dev/null 2>&1; then
  info "creating system service user: $service_user"
  useradd --system --home-dir /var/lib/replay-lab --create-home \
    --shell /sbin/nologin "$service_user"
fi
service_group="$(id -gn "$service_user")"
chown root:"$service_group" "$db_path"
chmod 0640 "$db_path"
runuser -u "$service_user" -- test -r "$db_path" \
  || die "service user cannot read DuckDB after permission preparation"

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

stop_identified_listener 8766 replay-lab-api.service
stop_identified_listener 8007 replay-lab-web.service

info "cloud security group prerequisite: inbound TCP 80/443; keep 8007/8766 closed"
installer_arguments=(
  --apply --yes
  --db "$db_path"
  --service-user "$service_user"
  --public-ip "$public_ip"
  --auth-user "$auth_user"
  --auth-password-file "$password_file"
)
[[ "$preserve_caddy" -eq 0 ]] || installer_arguments+=(--preserve-caddy)
bash "$installer" "${installer_arguments[@]}"

printf '\nDirect browser URL: https://%s/v7/app/\n' "$public_ip"
printf 'Browser user: %s\n' "$auth_user"
