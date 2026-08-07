# Session — R12.6 Host-Adaptive Idempotent Deployment

Date: 2026-08-06

## Trigger

The `146.190.100.212` upgrade rolled back with Caddy's `ambiguous site
definition` for that same IP. The existing main Caddyfile retained an older
direct Replay Lab block while preserve mode also imported the current managed
fragment. The wrapper also still exposed database/bootstrap and Caddy/listener
state as manual flags.

## Decision

- keep one public-IP wrapper and make observable host state automatic;
- select strict bootstrap only when the database target is absent;
- preserve Caddy and migrate recognized Replay Lab listeners by default;
- reconcile old direct, managed-fragment, shared-site, fresh, and repeat Caddy
  layouts into one idempotent managed fragment;
- preserve foreign sites and fail closed when foreign ownership cannot be
  distinguished safely;
- keep public IP and provider firewall changes explicit.

## Implementation

- add focused deployment-state and Caddy-reconciliation helpers plus four
  declarative negative cases;
- migrate owned direct Replay Lab blocks, deduplicate imports, recognize one
  covering glob, and safely update an owned `default_sni`;
- default the wrapper to automatic database mode, shared-Caddy preservation,
  and identified-listener migration while retaining explicit overrides;
- document one identical command for first install, bootstrap continuation,
  ordinary upgrade, and repeat deployment;
- bind the invariant as R12.6/H097.

## Automated Evidence

- `node v7/tests/caddy-site-reconciler-harness.js` — pass, 7 transitions, 4
  negative controls, and real Caddy validation;
- `node v7/tests/linux-deployment-script-harness.js` — pass;
- `node v7/tests/linux-host-transaction-harness.js` — pass;
- `node v7/tests/resource-profile-harness.js` — pass;
- Architecture Hardening — pass, 97 rules and 15 negative controls;
- Production Architecture — pass, 51 modules, 127 dependency edges, 115
  construction sites, 19 writer sites, and zero blocking findings;
- Production Source Quality — pass, 319 files, 311 public exports, and 22
  negative controls;
- Deployed Runtime Architecture — pass, 7 components, 4 proxy routes, 4
  service units, and 15 negative controls;
- shell/Python syntax, JSON validation, and `git diff --check` — pass.

## Human Gate

Rerun the same minimal command on `146.190.100.212` and `43.110.32.34`, then
repeat it once per host. Record Caddy validation, unrelated-site continuity,
four service health checks, authenticated browser access, active release, and
the unchanged database fingerprint. H097 remains executable until accepted.
