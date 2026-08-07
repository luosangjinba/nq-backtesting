# Session — R12.3 Adaptive Low-Memory Deployment

Date: 2026-08-06

## Trigger

The 512 MB DigitalOcean acceptance host completed a 901.3 MB DuckDB upload but
repeatedly returned HTTP 502 during Validate. Systemd and kernel evidence proved
that `replay-lab-database-import.service` was killed by the global OOM killer
with no swap. The operator also requested an equally simple redeployment back
to 43.110.32.34 so geographic latency could be compared without maintaining
host-specific commands.

## Decision

- make the advertised 512 MB class the explicit minimum;
- tolerate Linux's reserved-memory accounting through a 450 MiB `MemTotal`
  floor;
- auto-select DuckDB memory, thread, and swap policy without new operator
  inputs;
- persist managed swap as host capacity independent of code rollback;
- give Market Data and Database Import separate writable DuckDB spill roots;
- keep Caddy, database authority, immutable releases, and V7-only runtime
  ownership unchanged.

## Implementation

- `deploy/linux/lib/resource-profile.sh` owns detection, profile selection,
  minimum rejection, idempotent swap-floor provisioning, disk reserve, and
  `/etc/fstab` persistence;
- `server/duckdb_runtime.py` validates the environment contract used by both
  DuckDB owners;
- `install.sh` renders and applies the selected resource profile, creates spill
  roots, and uses the bounded connection even for its database smoke;
- both systemd units receive only their own spill directory;
- `tests/resource-profile-harness.js` and declarative negative fixtures bind
  the threshold and DuckDB configuration contract;
- Linux deployment and deployed-runtime architecture Harnesses bind the
  rendered host boundary and new shared-library owner.

## Automated Evidence

- `node v7/tests/resource-profile-harness.js` — pass;
- `node v7/tests/linux-deployment-script-harness.js` — pass;
- `node v7/tests/database-import-service-harness.js` — pass;
- `node v7/tests/market-data-service-harness.js` — pass;
- `node v7/tests/linux-host-transaction-harness.js` — pass;
- `node v7/tests/deployed-runtime-architecture-harness.js` — pass;
- `node v7/tests/standalone-v7-runtime-harness.js` — pass;
- Bash syntax checks for installer, quick wrapper, and resource policy — pass.

## Open Human Evidence

- commit/push and upgrade 43.110.32.34;
- repeat validation on the 512 MB host after adaptive deployment;
- reboot and verify swap persistence;
- compare same-scenario network and Play-bar latency on the two hosts;
- record database fingerprints and service health before/after upgrade.
