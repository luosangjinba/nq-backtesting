# V4 Security Hardening Gate

Date: 2026-06-24

Purpose: define the required gate before V4 exposes local service ports directly or moves beyond a trusted single-user/private reverse-proxy deployment.

## Current Allowed Deployment

Allowed:

- Single trusted user.
- Trusted LAN or VPN/Tailscale/WireGuard network.
- Single-user public HTTPS reverse proxy when operated as a private system.
- Server owns DuckDB and `v4/data/users/default`.
- Client browsers access the server web/API endpoints.

Not allowed:

- Direct public exposure of local service ports such as `8001` or `8766`.
- Unauthenticated multi-user or public-product exposure.
- Multiple unrelated users.
- Shared accounts for different people.
- Browser uploads that write arbitrary server files.

Public reverse-proxy mode is documented as a single-user deployment asset, not a multi-user security system:

```text
v4/docs/deploy/REVERSE_PROXY_PUBLIC_ACCESS_ASSETS.md
```

## Current Protections

Already present:

- Data Maintenance POST requires `X-V4-Maintenance-Request: data-maintenance`.
- Data Maintenance POST checks an allowed Origin list.
- Workspace PUT requires `X-V4-Workspace-Request: workspace`.
- Workspace PUT checks the same allowed Origin list.
- Data Maintenance actions are allowlisted server commands.
- Data Maintenance actions are guarded by a single active maintenance lock.
- Workspace persistence domains are allowlisted.
- Workspace persistence writes to `v4/data/users/default/workspaces/default`.

These protections are enough for trusted single-user LAN/VPN operation and private single-user HTTPS reverse-proxy operation, not for multi-user operation.

## Required Before Multi-User Or Public-Product Access

Do not cross this gate until every item is done:

1. HTTPS behind a reverse proxy or equivalent trusted TLS termination.
2. Authenticated user identity for every state-changing endpoint.
3. Session cookie policy: `HttpOnly`, `Secure`, `SameSite=Lax` or stronger.
4. CSRF protection for every state-changing endpoint, including `/v4/workspace`.
5. Admin-only protection for `/v4/data_maintenance/run`.
6. Upload size limits and content-type validation for any future server upload endpoint.
7. Per-user data path isolation: `v4/data/users/<user_id>/workspaces/<workspace_id>`.
8. Per-user backup and restore procedures.
9. Audit log for admin maintenance actions.
10. No wildcard CORS on authenticated endpoints.
11. Rate limits or basic abuse controls on login and write endpoints.
12. Explicit policy for user-uploaded market data: private, shared, or admin-promoted.

## Endpoint Classification

| Endpoint | Current mode | Future requirement |
| --- | --- | --- |
| `GET /v4/bars` | shared market data | Can remain shared/read-only. |
| `GET /v4/price` | shared market data | Can remain shared/read-only. |
| `GET /v4/economic_events` | shared calendar data | Can remain shared/read-only. |
| `GET /v4/workspace` | default-user workspace | Must require authenticated user in multi-user mode. |
| `PUT /v4/workspace` | default-user workspace | Must require authenticated user and CSRF protection. |
| `POST /v4/data_maintenance/run` | trusted-admin operation | Must require admin identity and CSRF protection. |

## Backup Gate

Before any server write-heavy maintenance:

- know the latest usable backup;
- verify `v4/data/trading_data.duckdb`;
- include `v4/data/users/default` in backups;
- run restore smoke after backup when changing data paths or workspace storage.

## Operator Rule

Do not expose local service ports directly outside a trusted LAN/VPN. If the deployment serves more than one trusted operator, stop and add authenticated identity, CSRF, and per-user data isolation first.
