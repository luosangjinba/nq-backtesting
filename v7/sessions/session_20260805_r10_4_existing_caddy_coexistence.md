# Session — R10.4 Existing-Caddy Coexistence

## Scope

Correct the public IPv4 quick deployment after real Alibaba host diagnostics
showed an existing unrelated Caddy site and no installed Replay Lab units.

## Delivered

- added explicit `--preserve-caddy` support to the installer and quick wrapper;
- retained the existing main Caddyfile and imported one managed Replay Lab
  fragment with repeat-safe detection;
- added combined-configuration validation and main/fragment restoration across
  validation, service, health, and reload failures;
- retained replacement mode for dedicated hosts and rejected the incompatible
  global `--email` combination;
- extended H083 with help, planning, negative, source-safety, and real Caddy
  coexistence validation.

## Verification

- `bash -n v7/deploy/linux/install.sh` — pass;
- `bash -n v7/deploy/linux/deploy-public-ip.sh` — pass;
- `node v7/tests/linux-deployment-script-harness.js` — pass;
- `PATH=/tmp/caddy-v2.11.3:$PATH node v7/tests/linux-deployment-script-harness.js`
  — pass, including existing-domain plus imported IPv4 configuration;
- `git diff --check` — pass.

The real-host rerun and all human acceptance gates remain open.
