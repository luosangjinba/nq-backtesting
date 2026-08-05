# Session — R10.3 Linux Public IPv4 Quick Deploy

Date: 2026-08-05
Status: implemented; Alibaba Linux run pending

The reviewer requested one command after repeated manual password-file setup
failed. R10.3 adds an interactive wrapper that owns only host preparation and
delegates the actual immutable release, dependencies, systemd, Caddy, database
smoke, health, and rollback behavior to the R10.2 installer.

The wrapper creates/reuses one dedicated service user, prepares a root-only
password file without exposing its value in argv/history, and permits legacy
listener replacement only through an explicit flag plus exact command-line
matching. It performs no cloud-provider API operation and does not weaken the
read-only acceptance or open overall-acceptance boundaries.
