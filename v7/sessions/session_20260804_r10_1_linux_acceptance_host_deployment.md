# Session — R10.1 Linux Acceptance-Host Deployment

Date: 2026-08-04
Status: implemented; real lightweight-host validation pending

## Request

Add a generic one-command Linux deployment path while the phase-one overall
acceptance checklist remains in progress.

## Delivered

- one private-by-default `apt`/`dnf`/`pacman` deployment entry;
- immutable Git releases, pinned minimal Python dependencies, exact npm lock
  installation, two hardened systemd services, and local health checks;
- optional Caddy automatic HTTPS with required Basic Auth or explicit public
  override;
- proxy-enforced read-only acceptance mode, a systemd read-only database mount,
  and an external untouched DuckDB;
- prior-release restoration after local service health failure;
- private/public dry-run, negative, template, and real Caddy validation
  evidence plus an operator guide.

## Verification

- `bash -n v7/deploy/linux/install.sh`: pass;
- `node v7/tests/linux-deployment-script-harness.js`: pass, including real
  installed-Caddy validation and five fail-closed input cases;
- architecture hardening: 83 rules and 15 negative controls pass;
- architecture boundary: pass;
- production architecture: 48 modules, 125 dependency edges, 115 construction
  sites, eight writer sites, zero findings, and nine negative controls pass;
- source quality: 309 production files, 306 exports, and 17 negative controls
  pass;
- all 82 top-level V7 Harnesses were invoked.

The aggregate sweep exposed three items outside the deployment files. The
four-Pane `4h` latency gate had one loaded warm p95 of `185ms` against `175ms`
and then passed isolated at `124.6ms` warm p95, `119.4ms` active p95, and
`91.4ms` Chart-apply p95. The Pane Workspace visual gate remains a reproducible
13-pixel/max-delta-14 mismatch. The Replay Workspace visual gate also remains a
reproducible substantive mismatch: its isolated actual render shows candle
wicks without the filled bodies in the accepted fixture. No production
UI/chart source or visual fixture was changed or re-recorded in R10.1. The two
visual findings continue to block a clean overall-acceptance sweep and require
separate diagnosis.

## Boundary And Gate

This step does not close overall phase-one acceptance, R9 interaction gates,
Data Acquisition, or Contract Roll. It adds no production runtime owner and
performs no market-data mutation. A real lightweight cloud-host install,
latency/interaction pass, redeploy/rollback check, and unchanged database
fingerprint remain the human/operational gate.
