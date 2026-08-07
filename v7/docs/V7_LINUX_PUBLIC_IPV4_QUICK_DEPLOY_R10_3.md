# V7 Linux Public IPv4 Quick Deploy — R10.3

Status: implemented; defaults generalized by R12.6 (2026-08-06)

## Request

Replace error-prone manual password-file and service-user preparation with one
direct public-IPv4 deployment entry.

## Boundary

`deploy/linux/deploy-public-ip.sh` is an operator wrapper around the binding
R10.2 installer. It requires root, a public IPv4, and an existing external
DuckDB; creates the dedicated service identity when absent; prepares group-only
database read permission; securely prompts twice for a persistent root-only
browser password; and invokes `install.sh` with authenticated public IPv4.

R10.9 added strict first-run bootstrap. R12.6 now selects it automatically when
the target is absent and selects read-only deployment when the DuckDB exists.
`--bootstrap` and `--require-existing-db` remain explicit assertions.

R12.6 also makes preservation/reconciliation of shared Caddy and migration of
positively identified Replay Lab listeners the defaults. Compatibility flags
remain accepted; destructive Caddy replacement requires `--replace-caddy`.
Unknown processes and foreign Caddy owners fail closed. The wrapper cannot edit
cloud security groups;
80/443 remain a human prerequisite and 8007/8766/8767/8768 remain private. R10.8
adds authenticated state sync behind the same public login without expanding
that firewall boundary.

Shell syntax, help behavior, safety-source controls, both Caddy validation
paths, the deployment Harness, and architecture/source gates are executable.
The real-host certificate/login/fingerprint/restart/rollback gate remains open.
