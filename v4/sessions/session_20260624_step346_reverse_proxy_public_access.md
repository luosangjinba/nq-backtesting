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

## Next Step

Step 346.5 should add apply mode to the deploy script:

```text
v4/deploy/install_reverse_proxy.sh
```

Apply mode should install or render the Caddyfile, install systemd service files, reload systemd, enable/restart services, and reload Caddy.
