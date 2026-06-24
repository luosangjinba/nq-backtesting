# Reverse Proxy Public Access Assets

Date: 2026-06-24

Purpose: define the asset sequence for Scheme 2, where V4 is accessed through a public HTTPS reverse proxy while the app remains a single-user system.

This document reserves the names and boundaries needed by a future multi-user security system. It does not implement login, roles, user management, or public multi-user access.

## Current Deployment Assets

| Asset | Current value | Owner | Notes |
| --- | --- | --- | --- |
| `public_domain` | `V4_PUBLIC_DOMAIN` | operator | Public HTTPS hostname served by Caddy. |
| `reverse_proxy` | Caddy | server admin | Only public entry point; terminates TLS and routes requests. |
| `web_service` | `v4-web.service` | server admin | Static `index.html`/`data-maintenance.html` on `127.0.0.1:8001`. |
| `api_service` | `v4-api.service` | server admin | V4 API on `127.0.0.1:8766`. |
| `workspace_data_dir` | `v4/data/users/default` | default user | Server-backed workspace JSON documents. |
| `market_data_db` | `V4_TRADING_DB` | server admin | Shared OHLC database. |
| `maintenance_admin_surface` | `data-maintenance.html` + `/v4/data_maintenance/run` | trusted operator | Admin-only by policy; not a normal user feature. |

## Reserved Multi-User Security Assets

These names are reserved for later design and should not be reused for unrelated concepts.

| Asset | Future purpose | Current status |
| --- | --- | --- |
| `users` | Authenticated human or service accounts. | Reserved only. |
| `sessions` | Server-side login/session state. | Reserved only. |
| `roles` | User/admin/operator capability boundary. | Reserved only. |
| `workspace_owners` | Ownership mapping between users and workspaces. | Reserved only. |
| `upload_files` | Optional server-stored uploaded files with owner/hash/visibility. | Reserved only. |
| `audit_logs` | Security and data mutation audit trail. | Reserved only. |
| `admin_actions` | Maintenance/runtime actions restricted to admin roles. | Reserved only. |

## Reverse Proxy Boundary

Public traffic should enter through one HTTPS origin:

```text
https://$V4_PUBLIC_DOMAIN/
```

Route contract:

```text
/v4/*  -> api_service
/*     -> web_service
```

The browser should not need to access `:8001` or `:8766` directly from the public internet.

## Current Security Position

This mode is still single-user. It provides:

- public HTTPS entry;
- no direct public API port;
- same-origin browser access;
- current Origin/header guards for workspace and maintenance writes.

It does not provide:

- login;
- per-user authorization;
- public multi-user safety;
- ordinary-user access to Data Maintenance.

## Implementation Sequence

1. Add a Caddy template that routes public HTTPS to local web/API services.
2. Add a VPS environment example that binds web/API services to localhost.
3. Add a deploy script that can render/install those assets.
4. Add health checks for `https://$V4_PUBLIC_DOMAIN/index.html` and `https://$V4_PUBLIC_DOMAIN/v4/health`.
