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

## Next Step

Step 346.4 should add a dry-run deploy script:

```text
v4/deploy/install_reverse_proxy.sh
```

The dry-run should check domain input, sudo/systemd/Caddy availability, repo path, and the files it would render/install without mutating the host.
