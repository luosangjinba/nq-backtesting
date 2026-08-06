# V7 Linux Acceptance-Host Deployment — R10.1

Status: implemented; real lightweight-host validation pending (2026-08-04)

## Request And Scope

The phase-one main-program acceptance pass remains open. R10.1 adds a parallel,
repeatable Linux deployment path so that the same acceptance checklist can also
be exercised on a small cloud host. It does not close, replace, or infer any
item in the local acceptance checklist.

The entry point is `v7/deploy/linux/install.sh`. It deploys one exact committed
Git revision and the existing external DuckDB file through V4/V7's current
runtime boundaries. It adds no second Bar Data, Replay, Workspace State, Chart,
or persistence owner.

## Deployment Topology

```text
browser
  -> optional Caddy HTTPS + Basic Auth
    -> /v4/* -> 127.0.0.1:8766 -> V4 read API -> external DuckDB
    -> /v7/state/* -> 127.0.0.1:8767 -> user-scoped SQLite state
    -> all other paths -> 127.0.0.1:8007 -> V7 static server
```

All three application services bind loopback only and run under an explicitly
selected existing Linux user. Without `--domain`, no public proxy is installed;
the reviewer uses SSH forwards for both `8007` and `8766`. With `--domain`,
Caddy obtains HTTPS and authentication is required unless the operator supplies
the deliberately named unauthenticated-public override.

## Data And Mutation Boundary

- the database path is mandatory, absolute, external to release deployment,
  opened read-only by query paths, and mounted read-only into the API service's
  systemd filesystem namespace;
- the installer never copies, replaces, repairs, changes permissions on, or
  writes the database;
- authenticated Caddy acceptance mode allows only bounded, revision-checked
  `/v7/state/*` requests and returns `403` for every other public `POST`, `PUT`,
  `PATCH`, and `DELETE`; unauthenticated public mode exposes no state route;
- Data Acquisition and Contract Roll therefore remain separate and cannot gain
  remote write authority from this deployment step;
- no Databento credential or historical repair manifest is installed or run.

## Release And Failure Contract

Apply mode rejects tracked working-tree changes, archives exact committed
`HEAD`, installs locked browser packages and a minimal pinned Python runtime,
then moves `/opt/replay-lab/current` atomically to the new immutable release.
systemd owns all three service lifecycles. If any local health endpoint fails,
the prior release symlink is restored and all three services restart against
it. The separate user-state SQLite file is retained across code rollback.

Old releases are retained. Caddy and systemd files are not deleted by the
installer. An existing Caddyfile is timestamp-backed up before replacement.

## Platform Boundary

Automatic package installation supports `apt`, `dnf`, and `pacman`; other
systemd distributions can use preinstalled dependencies with
`--skip-package-install`. Python 3.10+ and Node.js 18+ are required. The public
proxy uses the official Caddy package route, loopback reverse proxy, automatic
HTTPS, and version-compatible `basicauth`/`basic_auth` rendering.

The script deliberately does not manage DNS, cloud firewalls, source/database
upload, database backups, or market-data maintenance. Those operations have
provider- and host-specific authority outside a generic installer.

## Executable Evidence

`tests/linux-deployment-script-harness.js` executes private and authenticated
public dry runs, extracts and validates the real rendered Caddyfile when Caddy
is installed, inspects all three hardened systemd units, and proves failures
for:

- relative or missing database paths;
- a public domain without authentication/explicit override;
- apply without `--yes`;
- a hostname containing a scheme/path.

H083 is executable. Its real-host human-review requirement remains open.

`bash -n`, the deployment Harness, the production architecture/source gates,
the full V7 Harness sweep, and `git diff --check` are the repository gate.

The 2026-08-04 full sweep invoked all 82 top-level Harnesses. The new deployment
Harness and all architecture/source gates passed. The four-Pane latency Harness
exceeded its warm p95 budget once under aggregate-suite load and passed in an
immediate isolated run. Two pre-existing visual gates failed reproducibly in
isolation: `replay-pane-workspace-browser-harness.js` differed from
`multi-mixed-1440x900.png` by 13 pixels (maximum channel delta 14), and
`replay-workspace-browser-harness.js` rendered candle wicks without the expected
filled bodies against `ready-default-1440x900.png`. R10.1 changes no production
UI/chart file, and neither fixture was re-recorded. These findings remain open
overall-acceptance evidence; they do not invalidate the deployment dry-run
boundary or grant overall acceptance.

## Real-Host Acceptance Gate

On a clean lightweight systemd host:

1. transfer one verified database and clean Git checkout separately;
2. run private `--dry-run`, then private apply and both-port SSH access;
3. verify Sessions and representative 1m/4h, ETH/RTH, Replay, restore, and
   browser-console behavior against the open overall checklist;
4. optionally repeat with a DNS hostname, HTTPS, and Basic Auth;
5. prove only authenticated state CAS is writable, other public mutations
   return `403`, and the market database fingerprint is unchanged;
6. redeploy the same/new committed revision and prove service restart plus
   retained rollback target;
7. prove state SQLite backup/restore and the same Session/Workspace checkpoint
   from two physical computers using the same authenticated identity.

Automated dry-run evidence does not grant real-host acceptance.
