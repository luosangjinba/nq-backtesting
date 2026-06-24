#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash v4/deploy/install_reverse_proxy.sh --dry-run --domain DOMAIN [options]
  bash v4/deploy/install_reverse_proxy.sh --apply --yes --domain DOMAIN [options]

Options:
  --dry-run              Print the deployment plan only.
  --apply                Install/render files, restart services, and run health checks.
  --yes                  Required with --apply.
  --domain DOMAIN        Public HTTPS domain that Caddy will serve.
  --repo PATH            Repository root. Default: auto-detected from this script.
  --email EMAIL          Optional ACME account email to report in the plan.
  --service-user USER    systemd service user. Default: current user or SUDO_USER.
  --skip-caddy-install   Do not install Caddy when it is missing.
  --http-only            Temporary diagnostic mode: serve HTTP only and skip ACME.
  --help                 Show this help.

Dry-run is read-only. Apply mode requires sudo access and may install Caddy with
apt-get on Debian/Ubuntu hosts or dnf/COPR on RHEL-like hosts.
USAGE
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

ok() {
  printf 'OK: %s\n' "$*"
}

info() {
  printf 'INFO: %s\n' "$*"
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

detect_caddy_copr_chroot() {
  local platform_id=""
  local arch=""

  arch="$(uname -m)"
  [[ "$arch" == "x86_64" || "$arch" == "aarch64" ]] || return 0

  if [[ -f /etc/os-release ]]; then
    platform_id="$(. /etc/os-release && printf '%s' "${PLATFORM_ID:-}")"
  fi

  case "$platform_id" in
    platform:al8|platform:el8)
      printf 'epel-8-%s' "$arch"
      ;;
    platform:al9|platform:el9)
      printf 'epel-9-%s' "$arch"
      ;;
    platform:el10)
      printf 'epel-10-%s' "$arch"
      ;;
  esac
}

install_caddy() {
  if command -v apt-get >/dev/null 2>&1; then
    run_step sudo_cmd apt-get update
    run_step sudo_cmd apt-get install -y caddy
    return
  fi

  if command -v dnf >/dev/null 2>&1; then
    local caddy_copr_chroot=""
    caddy_copr_chroot="$(detect_caddy_copr_chroot)"
    run_step sudo_cmd dnf install -y dnf-plugins-core
    if [[ -n "$caddy_copr_chroot" ]]; then
      run_step sudo_cmd dnf copr enable -y @caddy/caddy "$caddy_copr_chroot"
    else
      run_step sudo_cmd dnf copr enable -y @caddy/caddy
    fi
    run_step sudo_cmd dnf install -y caddy
    return
  fi

  if command -v yum >/dev/null 2>&1; then
    die "caddy is missing and only yum was found; install Caddy manually or install dnf first"
  fi

  die "caddy is missing and no supported package manager was found; install Caddy manually first"
}

render_caddyfile() {
  local output="$1"
  local site_address="$domain"
  if [[ "$http_only" -eq 1 ]]; then
    site_address="http://$domain"
  fi
  if [[ -n "$email" ]]; then
    {
      printf '{\n'
      printf '  email %s\n' "$email"
      printf '}\n\n'
      sed 's|{\$V4_PUBLIC_DOMAIN}|'"$site_address"'|g' "$caddy_template"
    } > "$output"
  else
    sed 's|{\$V4_PUBLIC_DOMAIN}|'"$site_address"'|g' "$caddy_template" > "$output"
  fi
}

render_service_file() {
  local input="$1"
  local output="$2"
  sed \
    -e "s|/home/leo/myworkspace/trading/backtesting|$repo_root|g" \
    -e "s|^User=.*|User=$service_user|g" \
    -e "s|^Group=.*|Group=$service_group|g" \
    "$input" > "$output"
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../.." && pwd)"
domain=""
email=""
dry_run=0
apply=0
yes=0
skip_caddy_install=0
http_only=0
service_user="${SUDO_USER:-$(id -un)}"
service_group=""

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
    --domain)
      [[ $# -ge 2 ]] || die "--domain requires a value"
      domain="$2"
      shift 2
      ;;
    --repo)
      [[ $# -ge 2 ]] || die "--repo requires a value"
      repo_root="$2"
      shift 2
      ;;
    --email)
      [[ $# -ge 2 ]] || die "--email requires a value"
      email="$2"
      shift 2
      ;;
    --service-user)
      [[ $# -ge 2 ]] || die "--service-user requires a value"
      service_user="$2"
      shift 2
      ;;
    --skip-caddy-install)
      skip_caddy_install=1
      shift
      ;;
    --http-only)
      http_only=1
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
if [[ "$apply" -eq 1 && "$yes" -ne 1 ]]; then
  die "--apply requires --yes"
fi
[[ -n "$domain" ]] || die "--domain is required"
[[ "$domain" != *"://"* ]] || die "--domain should be a hostname, not a URL"
[[ "$domain" != *"/"* ]] || die "--domain should not include a path"
[[ -d "$repo_root/.git" ]] || die "repo path does not look like a git checkout: $repo_root"
service_group="$(id -gn "$service_user" 2>/dev/null || true)"
[[ -n "$service_group" ]] || die "cannot determine primary group for service user: $service_user"

repo_root="$(cd -- "$repo_root" && pwd)"
v4_dir="$repo_root/v4"
caddy_template="$v4_dir/deploy/caddy/Caddyfile.template"
env_example="$v4_dir/deploy/env/vps.env.example"
api_service="$v4_dir/deploy/systemd/v4-api.service"
web_service="$v4_dir/deploy/systemd/v4-web.service"
api_entry="$v4_dir/v4_api.py"
web_entry="$v4_dir/index.html"
tmp_dir=""

if [[ "$dry_run" -eq 1 ]]; then
  printf 'V4 reverse proxy deploy dry-run\n'
else
  printf 'V4 reverse proxy deploy apply\n'
fi
printf '=================================\n\n'

info "repo: $repo_root"
info "domain: $domain"
info "service user: $service_user:$service_group"
if [[ "$http_only" -eq 1 ]]; then
  info "mode: temporary HTTP-only diagnostic"
else
  info "mode: HTTPS reverse proxy"
fi
if [[ -n "$email" ]]; then
  info "ACME email: $email"
else
  info "ACME email: not set"
fi
printf '\n'

[[ -d "$v4_dir" ]] || die "missing v4 directory: $v4_dir"
[[ -f "$caddy_template" ]] || die "missing Caddy template: $caddy_template"
[[ -f "$env_example" ]] || die "missing VPS env example: $env_example"
[[ -f "$api_service" ]] || die "missing API service file: $api_service"
[[ -f "$web_service" ]] || die "missing web service file: $web_service"
[[ -f "$api_entry" ]] || die "missing API entry point: $api_entry"
[[ -f "$web_entry" ]] || die "missing web entry point: $web_entry"

ok "required repo files are present"

if command -v systemctl >/dev/null 2>&1; then
  ok "systemctl is available"
else
  warn "systemctl is not available; systemd install would not work on this host"
fi

if command -v sudo >/dev/null 2>&1; then
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    ok "running as root; sudo is not required"
  elif sudo -n true >/dev/null 2>&1; then
    ok "sudo is available without an interactive prompt"
  else
    warn "sudo exists, but passwordless/non-interactive sudo is not available"
  fi
else
  warn "sudo is not available"
fi

if command -v caddy >/dev/null 2>&1; then
  ok "caddy is installed: $(command -v caddy)"
else
  if [[ "$apply" -eq 1 && "$skip_caddy_install" -eq 1 ]]; then
    die "caddy is not installed and --skip-caddy-install was set"
  fi
  warn "caddy is not installed yet"
  if command -v apt-get >/dev/null 2>&1; then
    info "caddy install method: apt-get"
  elif command -v dnf >/dev/null 2>&1; then
    info "caddy install method: dnf + COPR @caddy/caddy"
  elif command -v yum >/dev/null 2>&1; then
    warn "caddy automatic install is not supported with yum-only hosts"
  else
    warn "no supported Caddy package manager was detected"
  fi
fi

printf '\n'
printf 'Planned local bindings\n'
printf '%s\n' '----------------------'
printf 'API:  127.0.0.1:8766\n'
printf 'Web:  127.0.0.1:8001\n'
printf 'HTTP:  80 -> Caddy\n'
if [[ "$http_only" -eq 1 ]]; then
  printf 'HTTPS: disabled in --http-only mode\n'
else
  printf 'HTTPS: 443 -> Caddy\n'
fi

printf '\n'
printf 'Planned files\n'
printf '%s\n' '-------------'
printf 'Read:    %s\n' "$env_example"
printf 'Read:    %s\n' "$api_service"
printf 'Read:    %s\n' "$web_service"
printf 'Render:  %s\n' "$caddy_template"
printf 'Would write: /etc/caddy/Caddyfile\n'
printf 'Would copy:  /etc/systemd/system/v4-api.service\n'
printf 'Would copy:  /etc/systemd/system/v4-web.service\n'

printf '\n'
printf 'Rendered Caddy preview\n'
printf '%s\n' '----------------------'
tmp_dir="$(mktemp -d)"
trap '[[ -n "${tmp_dir:-}" ]] && rm -rf "$tmp_dir"' EXIT
rendered_caddy="$tmp_dir/Caddyfile"
rendered_api_service="$tmp_dir/v4-api.service"
rendered_web_service="$tmp_dir/v4-web.service"
caddy_backup_path=""
render_caddyfile "$rendered_caddy"
render_service_file "$api_service" "$rendered_api_service"
render_service_file "$web_service" "$rendered_web_service"
cat "$rendered_caddy"

printf '\n'
if [[ "$dry_run" -eq 1 ]]; then
  printf 'Would run in apply mode later\n'
else
  printf 'Apply actions\n'
fi
printf '%s\n' '-----------------------------'
printf 'systemctl daemon-reload\n'
printf 'systemctl enable --now v4-api.service v4-web.service\n'
printf 'systemctl reload caddy\n'
if [[ "$http_only" -eq 1 ]]; then
  printf 'curl -fsS http://%s/v4/health\n' "$domain"
  printf 'curl -fsS http://%s/index.html\n' "$domain"
else
  printf 'curl -fsS https://%s/v4/health\n' "$domain"
  printf 'curl -fsS https://%s/index.html\n' "$domain"
fi

printf '\n'
if [[ "$dry_run" -eq 1 ]]; then
  ok "dry-run complete; no host files were changed"
  exit 0
fi

if ! command -v sudo >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  die "sudo is required for --apply when not running as root"
fi

if ! command -v caddy >/dev/null 2>&1; then
  install_caddy
fi

if command -v caddy >/dev/null 2>&1; then
  run_step caddy validate --config "$rendered_caddy"
fi

run_step sudo_cmd install -d -m 0755 /etc/caddy /etc/systemd/system
if sudo_cmd test -f /etc/caddy/Caddyfile; then
  caddy_backup_path="/etc/caddy/Caddyfile.v4-backup-$(date +%Y%m%d%H%M%S)"
  run_step sudo_cmd cp /etc/caddy/Caddyfile "$caddy_backup_path"
fi
run_step sudo_cmd install -m 0644 "$rendered_caddy" /etc/caddy/Caddyfile
run_step sudo_cmd install -m 0644 "$rendered_api_service" /etc/systemd/system/v4-api.service
run_step sudo_cmd install -m 0644 "$rendered_web_service" /etc/systemd/system/v4-web.service
run_step sudo_cmd systemctl daemon-reload
run_step sudo_cmd systemctl enable --now v4-api.service v4-web.service
run_step sudo_cmd systemctl restart v4-api.service v4-web.service
run_step sudo_cmd systemctl enable --now caddy
run_step sudo_cmd systemctl reload caddy

printf '\n'
printf 'Health checks\n'
printf '%s\n' '-------------'
if [[ "$http_only" -eq 1 ]]; then
  api_health="http://$domain/v4/health"
  web_health="http://$domain/index.html"
else
  api_health="https://$domain/v4/health"
  web_health="https://$domain/index.html"
fi
if curl -fsS "$api_health" >/dev/null; then
  ok "$api_health"
else
  warn "$api_health failed"
fi
if curl -fsS "$web_health" >/dev/null; then
  ok "$web_health"
else
  warn "$web_health failed"
fi

printf '\n'
printf 'Rollback hints\n'
printf '%s\n' '--------------'
printf 'sudo systemctl status v4-api.service v4-web.service caddy\n'
printf 'sudo journalctl -u v4-api.service -n 80 --no-pager\n'
printf 'sudo journalctl -u v4-web.service -n 80 --no-pager\n'
printf 'sudo journalctl -u caddy -n 80 --no-pager\n'
printf 'sudo systemctl disable --now v4-api.service v4-web.service\n'
printf 'sudo rm -f /etc/systemd/system/v4-api.service /etc/systemd/system/v4-web.service\n'
printf 'sudo systemctl daemon-reload\n'
if [[ -n "$caddy_backup_path" ]]; then
  printf 'sudo cp %s /etc/caddy/Caddyfile\n' "$caddy_backup_path"
else
  printf '# No previous /etc/caddy/Caddyfile backup was created by this run.\n'
fi

printf '\n'
ok "apply complete"
