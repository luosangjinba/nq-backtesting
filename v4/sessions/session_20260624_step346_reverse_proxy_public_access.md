# Step 346 - Reverse Proxy Public Access Deployment

## Goal

Prepare Scheme 2 for future VPS/public access: a public HTTPS reverse proxy routes the static V4 web page and V4 API through one origin, while V4 remains a single-user system.

This step reserves future multi-user security asset names but does not implement login, roles, permissions, or per-user access control.

## Step 346.1 - Asset Sequence And Boundary Definition

Status: complete.

Document:

```text
v4/docs/deploy/REVERSE_PROXY_PUBLIC_ACCESS_ASSETS.md
```

Current deployment assets:

```text
public_domain
reverse_proxy
web_service
api_service
workspace_data_dir
market_data_db
maintenance_admin_surface
```

Reserved future security assets:

```text
users
sessions
roles
workspace_owners
upload_files
audit_logs
admin_actions
```

Boundary:

- Current mode is single-user public HTTPS reverse proxy.
- It is not a multi-user security system.
- Browser traffic should not directly access public `:8001` or `:8766`.

## Step 346.2 - Caddy Reverse Proxy Template

Status: complete.

Template:

```text
v4/deploy/caddy/Caddyfile.template
```

Route contract:

```text
/v4/* -> 127.0.0.1:8766
/*    -> 127.0.0.1:8001
```

Caddy owns TLS for `V4_PUBLIC_DOMAIN`.

## Step 346.3 - VPS Environment Example

Status: complete.

Example:

```text
v4/deploy/env/vps.env.example
```

Key values:

```bash
V4_API_HOST=127.0.0.1
V4_WEB_PORT=8001
V4_ALLOWED_WEB_ORIGINS=https://your-domain.example
V4_PUBLIC_DOMAIN=your-domain.example
```

Docs updated:

- `v4/docs/deploy/SERVER_RUNTIME_HARDENING.md`
- `v4/docs/deploy/SECURITY_HARDENING_GATE.md`

## Step 346.4 - One-Command Deploy Script Dry-Run

Status: complete.

Script:

```text
v4/deploy/install_reverse_proxy.sh
```

Dry-run command:

```bash
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain your-domain.example
```

Behavior:

- validates the domain shape and repo path;
- checks required Caddy/env/systemd/web/API files;
- reports `systemctl`, `sudo`, and `caddy` availability;
- prints the local port binding plan;
- previews the rendered Caddy route contract;
- prints the future apply-mode commands;
- does not install packages, copy files, write `/etc/caddy`, reload systemd, or restart services.

Validation:

```text
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain example.com
git diff --check
```

## Step 346.5 - One-Command Deploy Apply Mode

Status: complete.

Command:

```bash
bash v4/deploy/install_reverse_proxy.sh --apply --yes --domain your-domain.example
```

Behavior:

- apply requires both `--apply` and `--yes`;
- renders Caddyfile with the selected domain and optional ACME email;
- renders systemd services with the current repo path and selected service user;
- installs Caddy through `apt-get` when Caddy is missing, unless `--skip-caddy-install` is set;
- installs `/etc/caddy/Caddyfile`;
- installs `/etc/systemd/system/v4-api.service` and `/etc/systemd/system/v4-web.service`;
- runs `systemctl daemon-reload`;
- enables and restarts V4 API/web services and Caddy.
- backs up an existing `/etc/caddy/Caddyfile` to `/etc/caddy/Caddyfile.v4-backup-YYYYMMDDHHMMSS` before replacing it.

## Step 346.6 - Health Checks And Rollback Hints

Status: complete.

Apply mode now checks:

```text
https://domain/v4/health
https://domain/index.html
```

It also prints operator commands for:

- service status;
- API/web/Caddy logs;
- disabling V4 services;
- removing V4 systemd units;
- daemon-reload after rollback;
- restoring the Caddyfile backup created by the script, when one existed before apply.

Validation:

```text
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain example.com
bash v4/deploy/install_reverse_proxy.sh --help
bash v4/deploy/install_reverse_proxy.sh --apply --domain example.com  # expected refusal without --yes
bash v4/deploy/install_reverse_proxy.sh --apply --yes --skip-caddy-install --domain example.com  # expected pre-write refusal when Caddy is missing
git diff --check
```

The real `--apply` path was implemented but not run in this workstation session because it writes `/etc/caddy`, `/etc/systemd/system`, may install packages, and needs the real public domain.

## Step 346.7 - Reverse Proxy Docs Closeout

Status: complete.

Updated:

```text
v4/docs/deploy/SERVER_RUNTIME_HARDENING.md
```

Added:

- public HTTPS reverse-proxy operation model;
- dry-run and apply command examples;
- optional email/service-user usage;
- firewall/port-forwarding expectation: public `80/443`, private `8001/8766`;
- public health checks;
- service status and journal commands;
- rollback outline;
- explicit single-user boundary and Data Maintenance operator-only status.

## Step 346.8 - Deployment Verification Checklist

Status: complete.

Added:

```text
v4/docs/deploy/REVERSE_PROXY_DEPLOYMENT_VERIFICATION.md
```

Checklist covers:

- before-apply validation;
- DNS/firewall/env checks;
- apply expectations;
- public and local health checks;
- browser checks;
- failure triage;
- rollback steps;
- single-user security boundary.

Validation run in this session:

```text
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain example.com
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain example.com --email ops@example.com
bash -n v4/deploy/install_reverse_proxy.sh
git diff --check
```

Real `--apply` verification remains server-only because it writes `/etc/caddy`, `/etc/systemd/system`, may install Caddy, and requires the real public domain.

## Next Step

Step 346 is ready for review or for a real server apply using the actual domain.
