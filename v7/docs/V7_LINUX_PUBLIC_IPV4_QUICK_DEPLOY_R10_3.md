# V7 Linux Public IPv4 Quick Deploy — R10.3

Status: implemented; real-host run pending (2026-08-05)

## Request

Replace error-prone manual password-file and service-user preparation with one
direct public-IPv4 deployment entry.

## Boundary

`deploy/linux/deploy-public-ip.sh` is an operator wrapper around the binding
R10.2 installer. It requires root, a public IPv4, and an existing external
DuckDB; creates the dedicated service identity when absent; prepares group-only
database read permission; securely prompts twice for a persistent root-only
browser password; and invokes `install.sh` with authenticated public IPv4.

The explicit `--replace-legacy` option may stop only a listener whose inspected
command line matches `v4_api.py` on 8766 or `serve.mjs 8007` on 8007. Unknown
processes fail closed. The wrapper cannot edit Alibaba Cloud security groups;
80/443 remain a human prerequisite and 8007/8766 remain private.

Shell syntax, help behavior, safety-source controls, both Caddy validation
paths, the deployment Harness, and architecture/source gates are executable.
The real-host certificate/login/fingerprint/restart/rollback gate remains open.
