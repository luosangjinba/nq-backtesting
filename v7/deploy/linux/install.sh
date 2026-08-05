#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Replay Lab V7 Linux deployment

Usage:
  bash v7/deploy/linux/install.sh --dry-run --db /absolute/path/trading_data.duckdb [options]
  sudo bash v7/deploy/linux/install.sh --apply --yes --db /absolute/path/trading_data.duckdb [options]

Default mode is private: V4 and V7 listen on loopback and are reached through
an SSH tunnel. Add --domain for a Caddy-managed HTTPS endpoint.

Required:
  --db PATH                    Existing DuckDB market-data file. It is never copied or modified.

Modes:
  --dry-run                    Render and validate the plan without host changes.
  --apply                      Install dependencies, release, services, and optional proxy.
  --yes                        Required with --apply.

Paths and identity:
  --repo PATH                  Git checkout. Default: auto-detected repository root.
  --install-root PATH          Releases and virtualenv. Default: /opt/replay-lab.
  --state-root PATH            Runtime state/home. Default: /var/lib/replay-lab.
  --service-user USER          Existing service user. Default: SUDO_USER/current user.
  --python-bin COMMAND         Python 3.10+ interpreter with venv. Default: auto-detect.

Optional public HTTPS:
  --domain HOST                HTTPS hostname served by Caddy; DNS must point to this host.
  --public-ip IPV4             HTTPS directly on a public IPv4 address; no DNS required.
  --email EMAIL                Optional ACME account email.
  --auth-user USER             Caddy Basic Auth user.
  --auth-hash HASH             Pre-hashed Caddy password.
  --auth-password-file PATH    Root-readable plaintext password file; deleted only by its owner.
  --allow-public-without-auth  Explicitly expose the read-only acceptance surface without auth.

Package control:
  --skip-package-install       Require git, curl, Python/venv, Node/npm, systemd, and Caddy
                               (when --domain is used) to be installed already.
  --help                       Show this help.

Public deployments are read-only at the proxy: POST, PUT, PATCH, and DELETE
return HTTP 403. Data Acquisition/Contract Roll stays a separate acceptance
gate and this script never grants database-write authority.
USAGE
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

info() {
  printf 'INFO: %s\n' "$*"
}

ok() {
  printf 'OK: %s\n' "$*"
}

run_step() {
  printf '+ %s\n' "$*"
  "$@"
}

sudo_cmd() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

as_service_user() {
  if [[ "$(id -un)" == "$service_user" ]]; then
    "$@"
  elif [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    runuser -u "$service_user" -- "$@"
  else
    sudo -u "$service_user" -- "$@"
  fi
}

repo_git() {
  git -c "safe.directory=$repo_root" -C "$repo_root" "$@"
}

require_absolute_path() {
  local label="$1"
  local value="$2"
  [[ "$value" = /* ]] || die "$label must be an absolute path: $value"
  [[ "$value" != "/" ]] || die "$label cannot be filesystem root"
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* && "$value" != *$'\t'* ]] \
    || die "$label contains unsupported control characters"
}

require_simple_path() {
  local label="$1"
  local value="$2"
  require_absolute_path "$label" "$value"
  [[ "$value" != *' '* && "$value" != *"'"* && "$value" != *'"'* && "$value" != *'\\'* ]] \
    || die "$label must not contain spaces, quotes, or backslashes"
}

render_template() {
  local input="$1"
  local output="$2"
  local line=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line//@@SERVICE_USER@@/$service_user}"
    line="${line//@@SERVICE_GROUP@@/$service_group}"
    line="${line//@@CURRENT_RELEASE@@/$current_release}"
    line="${line//@@PYTHON_BIN@@/$venv_python}"
    line="${line//@@NODE_BIN@@/$node_bin}"
    line="${line//@@DATABASE_PATH@@/$db_path}"
    line="${line//@@SITE_ADDRESS@@/$public_host}"
    line="${line//@@EMAIL_DIRECTIVE@@/$email_directive}"
    line="${line//@@AUTH_BLOCK@@/$auth_block}"
    line="${line//@@TLS_BLOCK@@/$tls_block}"
    printf '%s\n' "$line"
  done < "$input" > "$output"
}

detect_caddy_auth_directive() {
  local raw=""
  local version=""
  local major=""
  local minor=""
  if ! command -v caddy >/dev/null 2>&1; then
    printf 'basic_auth'
    return
  fi
  raw="$(caddy version 2>/dev/null | awk '{print $1}')"
  version="${raw#v}"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"
  if [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] \
    && (( major < 2 || (major == 2 && minor < 8) )); then
    printf 'basicauth'
  else
    printf 'basic_auth'
  fi
}

find_supported_python() {
  local candidate=""
  local resolved=""
  local candidates=()
  if [[ -n "$requested_python_bin" ]]; then
    candidates=("$requested_python_bin")
  else
    candidates=(python3.13 python3.12 python3.11 python3.10 python3)
  fi
  for candidate in "${candidates[@]}"; do
    resolved="$(command -v -- "$candidate" 2>/dev/null || true)"
    [[ -n "$resolved" ]] || continue
    "$resolved" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' \
      >/dev/null 2>&1 || continue
    "$resolved" -m venv --help >/dev/null 2>&1 || continue
    printf '%s' "$resolved"
    return 0
  done
  return 1
}

node_runtime_ready() {
  command -v node >/dev/null 2>&1 \
    && command -v npm >/dev/null 2>&1 \
    && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' \
      >/dev/null 2>&1
}

caddy_version_at_least() {
  local required_major="$1"
  local required_minor="$2"
  local required_patch="$3"
  local raw=""
  local version=""
  local major=0
  local minor=0
  local patch=0
  command -v caddy >/dev/null 2>&1 || return 1
  raw="$(caddy version 2>/dev/null | awk '{print $1}')"
  version="${raw#v}"
  IFS=. read -r major minor patch <<< "$version"
  patch="${patch%%[^0-9]*}"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ && "$patch" =~ ^[0-9]+$ ]] || return 1
  (( major > required_major \
    || (major == required_major && minor > required_minor) \
    || (major == required_major && minor == required_minor && patch >= required_patch) ))
}

plan_base_packages() {
  base_packages=(ca-certificates curl git tar)
  if ! node_runtime_ready; then
    base_packages+=(nodejs npm)
  fi
  if command -v apt-get >/dev/null 2>&1; then
    package_manager="apt"
    [[ -n "$python_bin" ]] || base_packages+=(python3 python3-pip python3-venv)
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    package_manager="dnf"
    [[ -n "$python_bin" ]] || base_packages+=(python3 python3-pip)
    return
  fi
  if command -v pacman >/dev/null 2>&1; then
    package_manager="pacman"
    [[ -n "$python_bin" ]] || base_packages+=(python python-pip)
    return
  fi
  package_manager="unsupported"
}

install_base_packages() {
  if [[ "$package_manager" == "apt" ]]; then
    run_step sudo_cmd apt-get update
    run_step sudo_cmd env DEBIAN_FRONTEND=noninteractive apt-get install -y "${base_packages[@]}"
    return
  fi
  if [[ "$package_manager" == "dnf" ]]; then
    run_step sudo_cmd dnf install -y "${base_packages[@]}"
    return
  fi
  if [[ "$package_manager" == "pacman" ]]; then
    run_step sudo_cmd pacman -S --needed --noconfirm "${base_packages[@]}"
    return
  fi
  die "unsupported package manager; install prerequisites manually and rerun with --skip-package-install"
}

install_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    if [[ -z "$public_ip" ]] || caddy_version_at_least 2 10 2; then
      return
    fi
    info "upgrading Caddy for public IPv4 certificate support"
  fi
  if command -v apt-get >/dev/null 2>&1; then
    run_step sudo_cmd apt-get install -y debian-keyring debian-archive-keyring apt-transport-https gnupg
    local caddy_tmp=""
    caddy_tmp="$(mktemp -d)"
    run_step curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
      -o "$caddy_tmp/caddy.gpg.key"
    run_step gpg --dearmor --yes --output "$caddy_tmp/caddy.gpg" "$caddy_tmp/caddy.gpg.key"
    run_step curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
      -o "$caddy_tmp/caddy-stable.list"
    run_step sudo_cmd install -m 0644 "$caddy_tmp/caddy.gpg" \
      /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    run_step sudo_cmd install -m 0644 "$caddy_tmp/caddy-stable.list" \
      /etc/apt/sources.list.d/caddy-stable.list
    run_step sudo_cmd apt-get update
    run_step sudo_cmd env DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
    rm -rf "$caddy_tmp"
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    run_step sudo_cmd dnf install -y dnf-plugins-core
    run_step sudo_cmd dnf copr enable -y @caddy/caddy
    run_step sudo_cmd dnf install -y caddy
    return
  fi
  if command -v pacman >/dev/null 2>&1; then
    run_step sudo_cmd pacman -S --needed --noconfirm caddy
    return
  fi
  die "Caddy is required for --domain; install it manually and rerun with --skip-package-install"
}

require_runtime_commands() {
  local command_name=""
  for command_name in curl git node npm systemctl tar; do
    command -v "$command_name" >/dev/null 2>&1 || die "required command is missing: $command_name"
  done
  python_bin="$(find_supported_python || true)"
  [[ -n "$python_bin" ]] \
    || die "Python 3.10+ with venv is required; install it or pass --python-bin"
  node_runtime_ready || die "Node.js 18 or newer with npm is required"
  if [[ -n "$public_host" ]]; then
    command -v caddy >/dev/null 2>&1 \
      || die "Caddy is required when --domain or --public-ip is set"
  fi
  if [[ -n "$public_ip" ]] && ! caddy_version_at_least 2 10 2; then
    die "Caddy 2.10.2 or newer is required for public IPv4 HTTPS certificates"
  fi
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

port_is_listening() {
  local port="$1"
  command -v ss >/dev/null 2>&1 || return 1
  ss -H -ltn 2>/dev/null \
    | awk -v suffix=":$port" '$4 ~ suffix "$" { found=1 } END { exit(found ? 0 : 1) }'
}

require_managed_or_free_port() {
  local port="$1"
  local unit="$2"
  if port_is_listening "$port" && ! systemctl is-active --quiet "$unit"; then
    die "127.0.0.1:$port is already used outside $unit; stop the legacy listener before apply"
  fi
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-20}"
  local count=0
  for ((count = 1; count <= attempts; count += 1)); do
    if curl -fsS --max-time 3 "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback_release() {
  if [[ -n "$previous_release" ]]; then
    info "restoring previous release: $previous_release"
    sudo_cmd ln -sfn "$previous_release" "$install_root/current.rollback"
    sudo_cmd mv -Tf "$install_root/current.rollback" "$current_release"
  else
    warn "no previous release exists; removing failed current link"
    sudo_cmd unlink "$current_release" 2>/dev/null || true
  fi
  sudo_cmd systemctl restart replay-lab-api.service replay-lab-web.service 2>/dev/null || true
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../../.." && pwd)"
db_path=""
install_root="/opt/replay-lab"
state_root="/var/lib/replay-lab"
service_user="${SUDO_USER:-$(id -un)}"
service_group=""
requested_python_bin=""
python_bin=""
domain=""
public_ip=""
public_host=""
package_manager=""
base_packages=()
email=""
auth_user=""
auth_hash=""
auth_password_file=""
allow_public_without_auth=0
dry_run=0
apply=0
yes=0
skip_package_install=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      shift
      ;;
    --apply)
      apply=1
      shift
      ;;
    --yes)
      yes=1
      shift
      ;;
    --db)
      [[ $# -ge 2 ]] || die "--db requires a value"
      db_path="$2"
      shift 2
      ;;
    --repo)
      [[ $# -ge 2 ]] || die "--repo requires a value"
      repo_root="$2"
      shift 2
      ;;
    --install-root)
      [[ $# -ge 2 ]] || die "--install-root requires a value"
      install_root="$2"
      shift 2
      ;;
    --state-root)
      [[ $# -ge 2 ]] || die "--state-root requires a value"
      state_root="$2"
      shift 2
      ;;
    --service-user)
      [[ $# -ge 2 ]] || die "--service-user requires a value"
      service_user="$2"
      shift 2
      ;;
    --python-bin)
      [[ $# -ge 2 ]] || die "--python-bin requires a value"
      requested_python_bin="$2"
      shift 2
      ;;
    --domain)
      [[ $# -ge 2 ]] || die "--domain requires a value"
      domain="$2"
      shift 2
      ;;
    --public-ip)
      [[ $# -ge 2 ]] || die "--public-ip requires a value"
      public_ip="$2"
      shift 2
      ;;
    --email)
      [[ $# -ge 2 ]] || die "--email requires a value"
      email="$2"
      shift 2
      ;;
    --auth-user)
      [[ $# -ge 2 ]] || die "--auth-user requires a value"
      auth_user="$2"
      shift 2
      ;;
    --auth-hash)
      [[ $# -ge 2 ]] || die "--auth-hash requires a value"
      auth_hash="$2"
      shift 2
      ;;
    --auth-password-file)
      [[ $# -ge 2 ]] || die "--auth-password-file requires a value"
      auth_password_file="$2"
      shift 2
      ;;
    --allow-public-without-auth)
      allow_public_without_auth=1
      shift
      ;;
    --skip-package-install)
      skip_package_install=1
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

[[ "$dry_run" -eq 1 || "$apply" -eq 1 ]] || die "choose exactly one mode: --dry-run or --apply"
[[ ! ( "$dry_run" -eq 1 && "$apply" -eq 1 ) ]] || die "choose exactly one mode: --dry-run or --apply"
[[ "$apply" -eq 0 || "$yes" -eq 1 ]] || die "--apply requires --yes"
[[ -n "$db_path" ]] || die "--db is required"

require_simple_path "--repo" "$repo_root"
require_simple_path "--db" "$db_path"
require_simple_path "--install-root" "$install_root"
require_simple_path "--state-root" "$state_root"
git -c "safe.directory=$repo_root" -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || die "--repo must be a Git checkout: $repo_root"
[[ -f "$db_path" ]] || die "DuckDB file does not exist: $db_path"
[[ -r "$db_path" ]] || die "DuckDB file is not readable: $db_path"
[[ "$service_user" =~ ^[A-Za-z_][A-Za-z0-9_.-]*[$]?$ ]] || die "invalid --service-user"
id "$service_user" >/dev/null 2>&1 || die "service user does not exist: $service_user"
service_group="$(id -gn "$service_user")"

[[ -z "$domain" || -z "$public_ip" ]] || die "use only one of --domain or --public-ip"
if [[ -n "$public_ip" ]]; then
  validate_ipv4 "$public_ip" || die "--public-ip must be a valid IPv4 address"
fi
public_host="${domain:-$public_ip}"

if [[ -n "$public_host" ]]; then
  if [[ -n "$domain" ]]; then
    [[ "$domain" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]] \
      || die "--domain must be a hostname without scheme or path"
  fi
  [[ -z "$email" || "$email" =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]] || die "invalid --email"
  [[ -z "$auth_user" || "$auth_user" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || die "invalid --auth-user"
  [[ -z "$auth_hash" || "$auth_hash" =~ ^[^[:space:]{}]+$ ]] || die "invalid --auth-hash"
  [[ -z "$auth_hash" || -z "$auth_password_file" ]] || die "use only one of --auth-hash or --auth-password-file"
  if [[ -n "$auth_password_file" ]]; then
    require_simple_path "--auth-password-file" "$auth_password_file"
    [[ -r "$auth_password_file" ]] || die "auth password file is not readable"
  fi
  if [[ "$allow_public_without_auth" -eq 0 ]]; then
    [[ -n "$auth_user" ]] || die "public HTTPS requires --auth-user or --allow-public-without-auth"
    [[ -n "$auth_hash" || -n "$auth_password_file" ]] \
      || die "public HTTPS requires --auth-hash/--auth-password-file or --allow-public-without-auth"
  fi
else
  [[ -z "$email" && -z "$auth_user" && -z "$auth_hash" && -z "$auth_password_file" ]] \
    || die "public/auth options require --domain or --public-ip"
  [[ "$allow_public_without_auth" -eq 0 ]] \
    || die "--allow-public-without-auth requires --domain or --public-ip"
fi

python_bin="$(find_supported_python || true)"
if [[ -n "$requested_python_bin" && -z "$python_bin" ]]; then
  die "--python-bin must resolve to Python 3.10+ with venv support"
fi
plan_base_packages

repo_root="$(cd -- "$repo_root" && pwd)"
db_path="$(cd -- "$(dirname -- "$db_path")" && pwd)/$(basename -- "$db_path")"
repository_commit="$(repo_git rev-parse HEAD)"
short_commit="$(repo_git rev-parse --short=12 HEAD)"
release_id="$(date -u +%Y%m%dT%H%M%SZ)-$short_commit"
release_dir="$install_root/releases/$release_id"
current_release="$install_root/current"
venv_dir="$install_root/shared/venv"
venv_python="$venv_dir/bin/python"
node_bin="$(command -v node || printf '/usr/bin/node')"
template_root="$repo_root/v7/deploy/linux"
api_template="$template_root/systemd/replay-lab-api.service.template"
web_template="$template_root/systemd/replay-lab-web.service.template"
caddy_template="$template_root/caddy/Caddyfile.template"
runtime_requirements="$template_root/requirements-runtime.txt"
previous_release=""
email_directive=""
auth_block=""
auth_directive="basic_auth"
tls_block=""

for required_file in "$api_template" "$web_template" "$caddy_template" "$runtime_requirements" \
  "$repo_root/v4/v4_api.py" "$repo_root/v7/scripts/serve.mjs" "$repo_root/v7/package-lock.json"; do
  [[ -f "$required_file" ]] || die "required deployment file is missing: $required_file"
done

if [[ "$apply" -eq 1 ]]; then
  repo_git diff-index --quiet HEAD -- \
    || die "tracked source changes are present; commit them before deploying an immutable release"
fi

tmp_dir="$(mktemp -d)"
trap '[[ -n "${tmp_dir:-}" ]] && rm -rf "$tmp_dir"' EXIT
rendered_api="$tmp_dir/replay-lab-api.service"
rendered_web="$tmp_dir/replay-lab-web.service"
rendered_caddy="$tmp_dir/Caddyfile"

if [[ -n "$public_host" ]]; then
  [[ -z "$email" ]] || email_directive=$'{\n  email '"$email"$'\n}\n\n'
  if [[ -n "$public_ip" ]]; then
    tls_block=$'\n  tls {\n    issuer acme https://acme-v02.api.letsencrypt.org/directory {\n      profile shortlived\n      disable_tlsalpn_challenge\n    }\n  }'
  fi
  if [[ -n "$auth_user" ]]; then
    auth_directive="$(detect_caddy_auth_directive)"
    if [[ -n "$auth_hash" ]]; then
      auth_block=$'\n  '"$auth_directive"$' {\n    '"$auth_user $auth_hash"$'\n  }'
    else
      auth_block=$'\n  '"$auth_directive"$' {\n    '"$auth_user __HASH_FROM_PASSWORD_FILE__"$'\n  }'
    fi
  fi
fi

render_template "$api_template" "$rendered_api"
render_template "$web_template" "$rendered_web"
render_template "$caddy_template" "$rendered_caddy"

printf 'Replay Lab V7 Linux deployment %s\n' "$([[ "$dry_run" -eq 1 ]] && printf 'dry-run' || printf 'apply')"
printf '%s\n\n' '========================================'
info "repository: $repo_root"
info "commit: $repository_commit"
info "database: $db_path (external, read-only deployment contract)"
info "install root: $install_root"
info "state root: $state_root"
info "service identity: $service_user:$service_group"
info "Python candidate: ${python_bin:-install/selection required during apply}"
info "Node candidate: $(command -v node 2>/dev/null || printf 'installation required during apply')"
info "release: $release_dir"
if [[ -n "$public_host" ]]; then
  info "public URL: https://$public_host/v7/app/"
  info "proxy policy: authenticated=$([[ -n "$auth_user" ]] && printf yes || printf no), mutations=blocked"
  if [[ -n "$public_ip" ]]; then
    info "certificate: Let's Encrypt short-lived IPv4 certificate; inbound 80/443 required"
  fi
else
  info "public proxy: disabled"
  info "access: ssh -L 8007:127.0.0.1:8007 -L 8766:127.0.0.1:8766 USER@HOST"
fi

printf '\nRendered systemd service summary\n'
printf '%s\n' '--------------------------------'
grep -E '^(User|Group|WorkingDirectory|EnvironmentFile|ExecStart|ReadOnlyPaths)=' "$rendered_api"
grep -E '^(User|Group|WorkingDirectory|ExecStart)=' "$rendered_web"
if [[ -n "$public_host" ]]; then
  printf '\nRendered Caddy preview\n'
  printf '%s\n' '----------------------'
  sed -e 's|__HASH_FROM_PASSWORD_FILE__|<generated-hash>|' "$rendered_caddy"
fi

printf '\nPlanned host changes\n'
printf '%s\n' '--------------------'
printf 'Install runtime packages: %s\n' "$([[ "$skip_package_install" -eq 1 ]] && printf no || printf yes)"
printf 'Runtime package request: %s (%s)\n' "${base_packages[*]}" "$package_manager"
printf 'Create immutable release: %s\n' "$release_dir"
printf 'Create shared virtualenv: %s\n' "$venv_dir"
printf 'Write: /etc/replay-lab/replay-lab.env\n'
printf 'Write: /etc/systemd/system/replay-lab-api.service\n'
printf 'Write: /etc/systemd/system/replay-lab-web.service\n'
if [[ -n "$public_host" ]]; then
  printf 'Back up then replace: /etc/caddy/Caddyfile\n'
fi
printf 'Database copy/write: never\n'
printf 'Database service mount: read-only\n'

if [[ "$dry_run" -eq 1 ]]; then
  ok "dry-run complete; no host files were changed"
  exit 0
fi

if [[ "${EUID:-$(id -u)}" -ne 0 ]] && ! command -v sudo >/dev/null 2>&1; then
  die "sudo is required for --apply when not running as root"
fi
command -v systemctl >/dev/null 2>&1 || die "systemd is required for --apply"
require_managed_or_free_port 8766 replay-lab-api.service
require_managed_or_free_port 8007 replay-lab-web.service

if [[ "$skip_package_install" -eq 0 ]]; then
  install_base_packages
  [[ -z "$public_host" ]] || install_caddy
fi
require_runtime_commands
node_bin="$(command -v node)"
auth_directive="$(detect_caddy_auth_directive)"

if [[ -n "$auth_password_file" ]]; then
  auth_password="$(<"$auth_password_file")"
  [[ -n "$auth_password" ]] || die "auth password file is empty"
  auth_hash="$(caddy hash-password --plaintext "$auth_password")"
  unset auth_password
  [[ -n "$auth_hash" ]] || die "Caddy did not produce a password hash"
  auth_block=$'\n  '"$auth_directive"$' {\n    '"$auth_user $auth_hash"$'\n  }'
fi
if [[ -n "$auth_user" && -n "$auth_hash" ]]; then
  auth_block=$'\n  '"$auth_directive"$' {\n    '"$auth_user $auth_hash"$'\n  }'
fi
render_template "$api_template" "$rendered_api"
render_template "$web_template" "$rendered_web"
render_template "$caddy_template" "$rendered_caddy"

if [[ -n "$public_host" ]]; then
  run_step caddy validate --config "$rendered_caddy"
fi

run_step sudo_cmd install -d -m 0755 "$install_root" "$install_root/releases" "$install_root/shared"
run_step sudo_cmd install -d -m 0750 -o "$service_user" -g "$service_group" "$state_root"

if [[ ! -x "$venv_python" ]]; then
  run_step sudo_cmd "$python_bin" -m venv "$venv_dir"
fi
run_step sudo_cmd "$venv_python" -m pip install --disable-pip-version-check --upgrade pip wheel
run_step sudo_cmd "$venv_python" -m pip install --disable-pip-version-check -r "$runtime_requirements"

archive_path="$tmp_dir/release.tar"
run_step repo_git archive --format=tar --output="$archive_path" "$repository_commit"
run_step sudo_cmd install -d -m 0755 "$release_dir"
run_step sudo_cmd tar -xf "$archive_path" -C "$release_dir"
run_step sudo_cmd npm ci --omit=dev --no-audit --no-fund --prefix "$release_dir/v7"

run_step as_service_user test -r "$db_path"
db_summary="$(as_service_user "$venv_python" -c \
  "import duckdb; p='$db_path'; c=duckdb.connect(p, read_only=True); print(c.execute(\"select string_agg(instrument || ':' || row_count::varchar, ', ' order by instrument) from (select instrument, count(*) as row_count from futures_1m group by instrument)\").fetchone()[0]); c.close()")"
ok "database read smoke: $db_summary"

env_file="$tmp_dir/replay-lab.env"
{
  printf 'HOME=%s\n' "$state_root"
  printf 'PYTHONUNBUFFERED=1\n'
  printf 'V4_API_HOST=127.0.0.1\n'
  printf 'V4_API_PORT=8766\n'
  printf 'V4_TRADING_DB=%s\n' "$db_path"
  printf 'V4_MARKET_DATA_BACKUP_DIR=%s/backups/market-data\n' "$state_root"
  if [[ -n "$public_host" ]]; then
    printf 'V4_ALLOWED_WEB_ORIGINS=https://%s\n' "$public_host"
  else
    printf 'V4_ALLOWED_WEB_ORIGINS=http://127.0.0.1:8007,http://localhost:8007\n'
  fi
} > "$env_file"

run_step sudo_cmd install -d -m 0755 /etc/replay-lab /etc/systemd/system
run_step sudo_cmd install -m 0600 "$env_file" /etc/replay-lab/replay-lab.env
run_step sudo_cmd install -m 0644 "$rendered_api" /etc/systemd/system/replay-lab-api.service
run_step sudo_cmd install -m 0644 "$rendered_web" /etc/systemd/system/replay-lab-web.service

if [[ -L "$current_release" ]]; then
  previous_release="$(readlink -f "$current_release")"
fi
run_step sudo_cmd ln -sfn "$release_dir" "$install_root/current.next"
run_step sudo_cmd mv -Tf "$install_root/current.next" "$current_release"

caddy_backup=""
if [[ -n "$public_host" ]]; then
  run_step sudo_cmd install -d -m 0755 /etc/caddy
  if sudo_cmd test -f /etc/caddy/Caddyfile; then
    caddy_backup="/etc/caddy/Caddyfile.replay-lab-backup-$(date -u +%Y%m%dT%H%M%SZ)"
    run_step sudo_cmd cp /etc/caddy/Caddyfile "$caddy_backup"
  fi
  run_step sudo_cmd install -m 0644 "$rendered_caddy" /etc/caddy/Caddyfile
fi

run_step sudo_cmd systemctl daemon-reload
run_step sudo_cmd systemctl enable replay-lab-api.service replay-lab-web.service
if ! sudo_cmd systemctl restart replay-lab-api.service replay-lab-web.service; then
  rollback_release
  die "Replay Lab services failed to restart"
fi
if ! wait_for_url http://127.0.0.1:8766/v4/health \
  || ! wait_for_url http://127.0.0.1:8007/v7/app/; then
  sudo_cmd journalctl -u replay-lab-api.service -u replay-lab-web.service -n 80 --no-pager || true
  rollback_release
  die "local health checks failed; previous release was restored when available"
fi

if [[ -n "$public_host" ]]; then
  run_step sudo_cmd systemctl enable --now caddy
  if ! sudo_cmd systemctl reload caddy; then
    if [[ -n "$caddy_backup" ]]; then
      warn "Caddy reload failed; restoring $caddy_backup"
      sudo_cmd cp "$caddy_backup" /etc/caddy/Caddyfile
      sudo_cmd systemctl reload caddy || true
    fi
    rollback_release
    die "Caddy reload failed"
  fi
fi

printf '\nHealth result\n'
printf '%s\n' '-------------'
ok "http://127.0.0.1:8766/v4/health"
ok "http://127.0.0.1:8007/v7/app/"
if [[ -n "$public_host" ]]; then
  if [[ -n "$auth_user" ]]; then
    public_status="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "https://$public_host/v7/app/" || true)"
    [[ "$public_status" == "401" ]] \
      && ok "https://$public_host/v7/app/ requires authentication" \
      || warn "public endpoint expected HTTP 401 without credentials, got ${public_status:-curl-failed}"
  elif wait_for_url "https://$public_host/v7/app/" 10; then
    ok "https://$public_host/v7/app/"
  else
    warn "public HTTPS health is not ready; verify DNS and ports 80/443"
  fi
else
  printf 'SSH tunnel:\n'
  printf '  ssh -L 8007:127.0.0.1:8007 -L 8766:127.0.0.1:8766 %s@HOST\n' "$service_user"
  printf 'Then open: http://127.0.0.1:8007/v7/app/\n'
fi

printf '\nOperations\n'
printf '%s\n' '----------'
printf 'sudo systemctl status replay-lab-api replay-lab-web%s\n' "$([[ -n "$public_host" ]] && printf ' caddy' || true)"
printf 'sudo journalctl -u replay-lab-api -u replay-lab-web -f\n'
printf 'Active release: %s\n' "$release_dir"
printf 'Previous release: %s\n' "${previous_release:-none}"
printf 'Database was not copied or modified. Public mutation methods remain blocked.\n'
ok "deployment complete"
