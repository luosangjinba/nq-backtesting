#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash v4/deploy/install_reverse_proxy.sh --dry-run --domain DOMAIN [options]

Options:
  --dry-run              Required for Step 346.4. Print the deployment plan only.
  --domain DOMAIN        Public HTTPS domain that Caddy will serve.
  --repo PATH            Repository root. Default: auto-detected from this script.
  --email EMAIL          Optional ACME account email to report in the plan.
  --help                 Show this help.

This Step 346.4 script is intentionally read-only. It does not install packages,
copy service files, write Caddy config, reload systemd, or restart services.
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

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../.." && pwd)"
domain=""
email=""
dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
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
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ "$dry_run" -eq 1 ]] || die "Step 346.4 only supports --dry-run"
[[ -n "$domain" ]] || die "--domain is required"
[[ "$domain" != *"://"* ]] || die "--domain should be a hostname, not a URL"
[[ "$domain" != *"/"* ]] || die "--domain should not include a path"
[[ -d "$repo_root/.git" ]] || die "repo path does not look like a git checkout: $repo_root"

repo_root="$(cd -- "$repo_root" && pwd)"
v4_dir="$repo_root/v4"
caddy_template="$v4_dir/deploy/caddy/Caddyfile.template"
env_example="$v4_dir/deploy/env/vps.env.example"
api_service="$v4_dir/deploy/systemd/v4-api.service"
web_service="$v4_dir/deploy/systemd/v4-web.service"
api_entry="$v4_dir/v4_api.py"
web_entry="$v4_dir/index.html"

printf 'V4 reverse proxy deploy dry-run\n'
printf '=================================\n\n'

info "repo: $repo_root"
info "domain: $domain"
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
  warn "caddy is not installed yet"
fi

printf '\n'
printf 'Planned local bindings\n'
printf '%s\n' '----------------------'
printf 'API:  127.0.0.1:8766\n'
printf 'Web:  127.0.0.1:8001\n'
printf 'HTTP:  80 -> Caddy\n'
printf 'HTTPS: 443 -> Caddy\n'

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
sed 's|{\$V4_PUBLIC_DOMAIN}|'"$domain"'|g' "$caddy_template"

printf '\n'
printf 'Would run in apply mode later\n'
printf '%s\n' '-----------------------------'
printf 'systemctl daemon-reload\n'
printf 'systemctl enable --now v4-api.service v4-web.service\n'
printf 'systemctl reload caddy\n'
printf 'curl -fsS https://%s/v4/health\n' "$domain"
printf 'curl -fsS https://%s/index.html\n' "$domain"

printf '\n'
ok "dry-run complete; no host files were changed"
