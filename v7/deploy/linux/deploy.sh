#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Replay Lab unified Linux deployment

Usage:
  sudo bash v7/deploy/linux/deploy.sh [exposure mode] [options]

Exposure modes (choose at most one):
  --local                 Loopback-only services; no Caddy or public endpoint.
  --public                Auto-detect this host's public IPv4 and serve HTTPS on it.
  --public-ip IPV4        Serve HTTPS on an explicitly supplied public IPv4.
  --public-domain HOST    Serve a public DNS name with Caddy automatic HTTPS.
  --domain HOST           Alias for --public-domain.
  --private-domain HOST   Serve a LAN/VPN DNS name with Caddy's internal CA.

On a repeat deployment, omitting the exposure mode reuses the saved deployment
profile. On a fresh host it defaults to --local. The legacy
deploy-public-ip.sh command forwards to this entry unchanged.

Data and identity:
  --db PATH               DuckDB target. Default: /srv/replay-lab-data/trading_data.duckdb
  --bootstrap             Require a missing target and force first-run upload mode.
  --require-existing-db   Disable automatic bootstrap and require an existing DuckDB.
  --service-user USER     Linux runtime identity. Default: saved user, invoking user,
                          or dedicated replay user when invoked directly as root.

Authenticated HTTPS:
  --auth-user USER        Browser login user. Default: saved user or reviewer.
  --password-file PATH    Persistent root-only browser password file.
                          Default: /etc/replay-lab/secrets/web-password
                          Existing /root/replay-lab-secrets/web-password is reused.
  --reset-password        Prompt for a new browser password.

Caddy and migration:
  --preserve-caddy        Preserve/reconcile unrelated Caddy sites (HTTPS default).
  --replace-caddy         Replace Caddyfile; only for an intentionally dedicated host.
  --replace-legacy        Migrate identified Replay Lab listeners (default compatibility flag).
  --help                  Show this help.

The command detects first/repeat deployment, chooses bootstrap from the database
target, reconciles known Replay Lab Caddy layouts, selects a host resource
profile, rejects hosts below the supported 512 MB class, and provisions swap.
Public modes require inbound TCP 80/443. Keep 8007/8766/8767/8768 private.
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

select_mode() {
  local requested_mode="$1"
  local requested_endpoint="${2:-}"
  [[ "$mode_explicit" -eq 0 ]] \
    || die "use only one exposure mode"
  mode="$requested_mode"
  endpoint="$requested_endpoint"
  mode_explicit=1
}

validate_hostname() {
  local value="$1"
  [[ ${#value} -le 253 ]] || return 1
  [[ "$value" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]] || return 1
  [[ "$value" != *..* && "$value" == *.* ]] || return 1
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
source "$script_dir/lib/public-endpoint.sh"

profile_path="/etc/replay-lab/deployment.conf"
db_path="/srv/replay-lab-data/trading_data.duckdb"
db_explicit=0
mode=""
endpoint=""
mode_explicit=0
auth_user="reviewer"
auth_user_explicit=0
service_user=""
service_user_explicit=0
password_file="/etc/replay-lab/secrets/web-password"
password_file_explicit=0
reset_password=0
replace_legacy=1
preserve_caddy=1
preserve_caddy_explicit=0
bootstrap=0
bootstrap_mode="auto"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local)
      select_mode local
      shift
      ;;
    --public)
      select_mode public-ip
      shift
      ;;
    --public-ip)
      [[ $# -ge 2 ]] || die "--public-ip requires a value"
      select_mode public-ip "$2"
      shift 2
      ;;
    --public-domain|--domain)
      [[ $# -ge 2 ]] || die "$1 requires a value"
      select_mode public-domain "$2"
      shift 2
      ;;
    --private-domain)
      [[ $# -ge 2 ]] || die "--private-domain requires a value"
      select_mode private-domain "$2"
      shift 2
      ;;
    --db)
      [[ $# -ge 2 ]] || die "--db requires a value"
      db_path="$2"
      db_explicit=1
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
      auth_user_explicit=1
      shift 2
      ;;
    --service-user)
      [[ $# -ge 2 ]] || die "--service-user requires a value"
      service_user="$2"
      service_user_explicit=1
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
      preserve_caddy_explicit=1
      shift
      ;;
    --replace-caddy)
      preserve_caddy=0
      preserve_caddy_explicit=1
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

[[ "${EUID:-$(id -u)}" -eq 0 ]] || die "run this deploy command with sudo/root"
[[ -x "$installer" ]] || die "installer is missing: $installer"

saved_mode=""
saved_endpoint=""
IFS=$'\t' read -r inferred_mode inferred_endpoint \
  <<< "$(replay_lab_infer_existing_endpoint \
    /opt/replay-lab/current /etc/caddy/replay-lab.Caddyfile)"
if [[ -e "$profile_path" ]]; then
  [[ -r "$profile_path" ]] || die "saved deployment profile is not readable: $profile_path"
  replay_lab_profile_valid "$profile_path" \
    || die "saved deployment profile is invalid: $profile_path"
  saved_mode="$(replay_lab_profile_value "$profile_path" mode)"
  saved_endpoint="$(replay_lab_profile_value "$profile_path" endpoint)"
  [[ "$db_explicit" -eq 1 ]] \
    || db_path="$(replay_lab_profile_value "$profile_path" databasePath)"
  [[ "$service_user_explicit" -eq 1 ]] \
    || service_user="$(replay_lab_profile_value "$profile_path" serviceUser)"
  saved_auth_user="$(replay_lab_profile_value "$profile_path" authUser)"
  saved_password_file="$(replay_lab_profile_value "$profile_path" passwordFile)"
  if [[ "$auth_user_explicit" -eq 0 && -n "$saved_auth_user" ]]; then
    auth_user="$saved_auth_user"
  fi
  if [[ "$password_file_explicit" -eq 0 && -n "$saved_password_file" ]]; then
    password_file="$saved_password_file"
  fi
  [[ "$preserve_caddy_explicit" -eq 1 ]] \
    || preserve_caddy="$(replay_lab_profile_value "$profile_path" preserveCaddy)"
  info "deployment profile: loaded $profile_path"
fi

if [[ "$mode_explicit" -eq 0 ]]; then
  if [[ -n "$saved_mode" ]]; then
    mode="$saved_mode"
    endpoint="$saved_endpoint"
    info "exposure state: reusing saved $mode profile"
  else
    mode="$inferred_mode"
    endpoint="$inferred_endpoint"
    if [[ "$mode" == "local" ]]; then
      info "exposure state: no saved public endpoint; selecting local/private mode"
    else
      info "exposure state: inferred existing $mode endpoint $endpoint"
    fi
  fi
elif [[ "$mode" == "local" ]]; then
  previous_exposure="${saved_mode:-$inferred_mode}"
  if [[ "$previous_exposure" != "local" ]]; then
    die "refusing to leave the existing $previous_exposure endpoint active during --local migration; remove it from Caddy explicitly before changing exposure"
  fi
fi

case "$mode" in
  public-ip)
    if [[ -z "$endpoint" ]]; then
      command -v curl >/dev/null 2>&1 \
        || die "automatic public-IP detection requires curl; install it or use --public-ip"
      if ! detected_endpoint="$(replay_lab_detect_public_ipv4)"; then
        die "could not detect a public IPv4; use --public-ip explicitly"
      fi
      IFS=$'\t' read -r endpoint endpoint_source <<< "$detected_endpoint"
      info "public IPv4: detected $endpoint via $endpoint_source"
    fi
    replay_lab_public_ipv4 "$endpoint" \
      || die "public endpoint must be a globally routable IPv4 address"
    ;;
  public-domain|private-domain)
    validate_hostname "$endpoint" \
      || die "domain must be a hostname with at least one dot and without scheme or path"
    ;;
  local)
    endpoint=""
    ;;
  *)
    die "unsupported deployment mode: $mode"
    ;;
esac

if [[ "$mode" == "public-domain" ]]; then
  mapfile -t domain_addresses < <(replay_lab_domain_ipv4s "$endpoint")
  [[ "${#domain_addresses[@]}" -gt 0 ]] \
    || die "public domain has no IPv4 DNS address: $endpoint"
  if command -v curl >/dev/null 2>&1 \
    && detected_endpoint="$(replay_lab_detect_public_ipv4 2>/dev/null)"; then
    IFS=$'\t' read -r detected_public_ip endpoint_source <<< "$detected_endpoint"
    domain_matches_host=0
    for address in "${domain_addresses[@]}"; do
      [[ "$address" == "$detected_public_ip" ]] && domain_matches_host=1
    done
    if [[ "$domain_matches_host" -eq 1 ]]; then
      info "public DNS: $endpoint resolves to detected host address $detected_public_ip"
    else
      warn "public DNS addresses do not include detected host address $detected_public_ip; continue only when a CDN or upstream proxy is intentional"
    fi
  else
    warn "host public IPv4 could not be detected; Caddy certificate issuance will verify DNS reachability"
  fi
elif [[ "$mode" == "private-domain" ]]; then
  info "private DNS prerequisite: $endpoint must resolve to this host for LAN/VPN clients"
fi

detected_memory_mib="$(replay_lab_read_memory_mib)" \
  || die "physical memory detection failed"
replay_lab_require_minimum_memory "$detected_memory_mib" \
  || die "host memory is below the supported minimum"

if [[ -z "$service_user" ]]; then
  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER:-}" != "root" ]]; then
    service_user="$SUDO_USER"
  elif [[ "$(id -un)" != "root" ]]; then
    service_user="$(id -un)"
  else
    service_user="replay"
  fi
fi

[[ "$db_path" = /* && "$db_path" != *[[:space:]]* ]] \
  || die "--db must be an absolute path without whitespace"
db_path="$(readlink -m -- "$db_path")"
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

[[ "$service_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]*[$]?$ ]] || die "invalid --service-user"
if [[ "$mode" == "local" ]]; then
  [[ "$auth_user_explicit" -eq 0 && "$password_file_explicit" -eq 0 && "$reset_password" -eq 0 ]] \
    || die "browser authentication options require a public/private domain or public IP mode"
  auth_user=""
  password_file=""
  preserve_caddy=0
else
  [[ "$auth_user" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || die "invalid --auth-user"
  [[ "$password_file" = /* && "$password_file" != *[[:space:]]* ]] \
    || die "--password-file must be absolute and contain no whitespace"
fi

legacy_password_file="/root/replay-lab-secrets/web-password"
if [[ "$mode" != "local" ]]; then
  selected_password_file="$(replay_lab_select_password_file \
    "$password_file" "$password_file_explicit" "$legacy_password_file")"
  if [[ "$selected_password_file" != "$password_file" ]]; then
    password_file="$selected_password_file"
    info "credential state: reusing the existing legacy root-only password file"
  fi
fi

if [[ "$(replay_lab_classify_release /opt/replay-lab/current)" == "upgrade" ]]; then
  info "host state: existing Replay Lab release; selecting idempotent upgrade"
else
  info "host state: no active Replay Lab release; selecting first deployment"
fi
if [[ "$mode" != "local" && "$preserve_caddy" -eq 1 ]]; then
  info "Caddy state: preserve and reconcile managed Replay Lab configuration"
elif [[ "$mode" != "local" ]]; then
  warn "Caddy state: explicit replacement mode will replace /etc/caddy/Caddyfile"
fi

database_metadata_changed=0
database_original_uid=""
database_original_gid=""
database_original_mode=""
tmp_dir="$(mktemp -d)"
profile_file="$tmp_dir/deployment.conf"
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
  rm -f -- "$profile_file"
  rmdir -- "$tmp_dir"
  exit "$status"
}
trap 'quick_deploy_exit "$?"' EXIT

if ! id "$service_user" >/dev/null 2>&1; then
  info "creating system service user: $service_user"
  useradd --system --home-dir /var/lib/replay-lab --create-home \
    --shell /sbin/nologin "$service_user"
fi
service_group="$(id -gn "$service_user")"
if [[ "$bootstrap" -eq 0 ]] \
  && ! runuser -u "$service_user" -- test -r "$db_path"; then
  database_original_uid="$(stat -c '%u' "$db_path")"
  database_original_gid="$(stat -c '%g' "$db_path")"
  database_original_mode="$(stat -c '%a' "$db_path")"
  chown root:"$service_group" "$db_path"
  chmod 0640 "$db_path"
  database_metadata_changed=1
  runuser -u "$service_user" -- test -r "$db_path" \
    || die "service user cannot read DuckDB after permission preparation; check parent-directory traversal permissions"
fi

if [[ "$mode" != "local" ]]; then
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
fi

{
  printf 'schemaVersion=1\n'
  printf 'mode=%s\n' "$mode"
  printf 'endpoint=%s\n' "$endpoint"
  printf 'databasePath=%s\n' "$db_path"
  printf 'serviceUser=%s\n' "$service_user"
  printf 'authUser=%s\n' "$auth_user"
  printf 'passwordFile=%s\n' "$password_file"
  printf 'preserveCaddy=%s\n' "$preserve_caddy"
} > "$profile_file"
chmod 0600 "$profile_file"
replay_lab_profile_valid "$profile_file" || die "internal deployment profile rendering failed"

stop_identified_listener 8766 replay-lab-market-data.service replay-lab-api.service
stop_identified_listener 8007 replay-lab-web.service

installer_arguments=(
  --apply --yes
  --db "$db_path"
  --service-user "$service_user"
  --deployment-profile-file "$profile_file"
)
case "$mode" in
  public-ip)
    installer_arguments+=(--public-ip "$endpoint")
    ;;
  public-domain)
    installer_arguments+=(--domain "$endpoint")
    ;;
  private-domain)
    installer_arguments+=(--private-domain "$endpoint")
    ;;
esac
if [[ "$mode" != "local" ]]; then
  installer_arguments+=(--auth-user "$auth_user" --auth-password-file "$password_file")
  [[ "$preserve_caddy" -eq 0 ]] || installer_arguments+=(--preserve-caddy)
fi
[[ "$bootstrap" -eq 0 ]] || installer_arguments+=(--bootstrap)

case "$mode" in
  public-ip|public-domain)
    info "network prerequisite: inbound TCP 80/443; keep 8007/8766/8767/8768 closed"
    ;;
  private-domain)
    info "network prerequisite: expose TCP 80/443 only inside the trusted LAN/VPN"
    ;;
  local)
    info "network policy: loopback only; no public IP or Caddy required"
    ;;
esac

bash "$installer" "${installer_arguments[@]}"
database_metadata_changed=0

case "$mode" in
  local)
    browser_url="http://127.0.0.1:8007/v7/app/"
    ;;
  *)
    browser_url="https://$endpoint/v7/app/"
    ;;
esac
printf '\nBrowser URL: %s\n' "$browser_url"
if [[ "$mode" != "local" ]]; then
  printf 'Browser user: %s\n' "$auth_user"
fi
if [[ "$mode" == "private-domain" ]]; then
  printf 'Install the Caddy local root CA on clients: /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt\n'
fi
if [[ "$bootstrap" -eq 1 ]]; then
  printf 'Database setup: %sdata-acquisition.html\n' "${browser_url%/}/"
fi
printf 'Saved deployment profile: %s\n' "$profile_path"

trap - EXIT
rm -f -- "$profile_file"
rmdir -- "$tmp_dir"
