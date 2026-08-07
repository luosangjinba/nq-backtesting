# Session — R12.7 Unified Deployment Entry

Date: 2026-08-06

## Trigger

After R12.6 repaired repeated direct-IP deployment, deployment still required
host-specific commands: cloud operators repeated the public IP, local/private
installation used the lower-level installer, and domain hosts had no shared
one-command path. The requested outcome was one script that adapts to known
first/repeat, low-memory, cloud, local, and domain cases without routine source
or command editing.

## Decision

- make `deploy.sh` the operator entry for local, detected/explicit public IPv4,
  public DNS, and LAN/VPN DNS modes;
- default a fresh host to loopback-only local/private operation;
- persist only non-secret deployment choices after a committed deployment and
  reuse them when a repeat run omits exposure arguments;
- isolate cloud metadata and DNS inspection in a pure deployment helper while
  retaining `install.sh` as the package/release/systemd/Caddy transaction owner;
- preserve the historical public-IP script as an argument-transparent shim;
- fail closed on unsafe public-to-local changes and every existing foreign
  Caddy/listener ownership ambiguity.

## Implementation

- add the unified entry, strict profile parser/inference helpers, Alibaba/
  DigitalOcean/provider-neutral IPv4 discovery, and public DNS inspection;
- persist `/etc/replay-lab/deployment.conf` as a root-only host-transaction
  member and verify every profile field agrees with installer arguments;
- add private-domain `tls internal`, public-domain automatic HTTPS, and owned
  direct-IP `default_sni` cleanup during domain migration;
- replace the stale repository README, add a V7 product README and Chinese user
  guide, and connect user operation to the detailed Linux administrator guide;
- update Linux deployment guidance, documentation index, roadmap, TODO,
  numbering, restart handoff, evidence registries, and the deployed writer
  inventory;
- bind the behavior as R12.7/H098 with a focused harness and declarative
  negative profiles.

## Automated Evidence

- `node v7/tests/unified-deployment-harness.js` — pass, four exposure modes,
  three endpoint backends, and five negative profiles;
- `node v7/tests/linux-deployment-script-harness.js` — pass, including real
  private-domain Caddy validation and profile/argument coherence;
- `node v7/tests/caddy-site-reconciler-harness.js` — pass, eight transitions,
  four negative controls, and real Caddy validation;
- `node v7/tests/linux-host-transaction-harness.js` and
  `node v7/tests/resource-profile-harness.js` — pass;
- Architecture Hardening — pass, 98 rules and 15 negative controls;
- Production Architecture — pass, 51 modules, 127 dependency edges, 115
  construction sites, 19 writer sites, and zero blocking findings;
- Production Source Quality — pass, 319 files, 311 public exports, and 22
  negative controls;
- Deployed Runtime Architecture — pass, 7 components, 4 proxy routes, 4
  service units, and 15 negative controls;
- Standalone V7 Runtime — pass, 393 production files and 7 negative controls;
- shell/Python syntax, JSON validation, and `git diff --check` — pass.

## Human Gate

Run fresh local, direct-public, public-domain, and private-domain deployments,
then rerun each with no exposure option. Record the saved profile, reported URL,
service identity, four loopback health checks, authentication, private-CA
client trust, one effective managed Caddy site, unrelated-site continuity,
unchanged DuckDB fingerprint, and rollback behavior. H098 remains executable
until that multi-mode host evidence is accepted.
