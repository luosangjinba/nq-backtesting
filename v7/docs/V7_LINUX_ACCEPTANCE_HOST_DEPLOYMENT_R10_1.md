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
    -> bootstrap-only /v7/database/* -> 127.0.0.1:8768 -> first database importer
    -> all other paths -> 127.0.0.1:8007 -> V7 static server
```

All four application services bind loopback only and run under an explicitly
selected existing Linux user. Without `--domain`, no public proxy is installed;
the reviewer uses SSH forwards for both `8007` and `8766`. With `--domain`,
Caddy obtains HTTPS and authentication is required unless the operator supplies
the deliberately named unauthenticated-public override.

The V7 static service no longer maps arbitrary repository paths. Its default
allowlist is `/v7/app/*`, `/v7/src/*`, the two reviewed browser dependencies,
and the exact architecture manifest consumed by ModuleHost. Documentation,
tests, Python services, V4 source, Git metadata, and other repository files
return `404`. Browser Harness fixtures are exposed only through an explicit
test-process-only prefix injection and are absent from production `serve.mjs`.

The deployed 8766 unit starts `v4/read_api.py`, not the mutable local
`v4_api.py` entry. Its handler has an explicit market-data GET allowlist,
returns `405` for POST/PUT/PATCH/DELETE, exposes no legacy Workspace route, and
still runs inside the read-only database/systemd filesystem boundary. The
legacy V4 package remains source-visible for compatibility and architecture
inventory, but it is not the deployed HTTP entry.

## Data And Mutation Boundary

- the database path is mandatory, absolute, external to release deployment,
  opened read-only by query paths, and mounted read-only into the API service's
  systemd filesystem namespace;
- the installer never copies, replaces, repairs, changes permissions on, or
  writes an existing database;
- R10.9 adds an explicit `--bootstrap` exception only while the configured
  target is absent: an isolated service may validate and create the first
  database, after which the import route locks and cannot replace it;
- authenticated Caddy acceptance mode allows only bounded, revision-checked
  `/v7/state/*` requests and returns `403` for every other public `POST`, `PUT`,
  `PATCH`, and `DELETE`; unauthenticated public mode exposes no state route;
- Data Acquisition and Contract Roll therefore remain separate and cannot gain
  remote write authority from this deployment step;
- no Databento credential or historical repair manifest is installed or run.

## Release And Failure Contract

Apply mode rejects tracked working-tree changes, archives exact committed
`HEAD`, installs locked browser packages and a minimal pinned Python runtime
inside that exact immutable release, then moves `/opt/replay-lab/current`
atomically. No shared virtualenv is mutated underneath the previous release.
systemd owns all four application service lifecycles.

R11.1 begins a host transaction before release/runtime mutation. It records the
prior current link, env and unit files, Caddy main/fragment, systemd enablement
links, exact active-unit set, and metadata of existing runtime directories. Any
unexpected command, validation, restart, or health failure restores those
files and permissions, daemon-reloads, and returns each service (including
Caddy) to its prior active/inactive state. A previously active API, State,
Database Import, or Web service must also recover its documented loopback
health endpoint; service restart success alone is not rollback evidence. The
quick public-IP wrapper also restores the original DuckDB uid/gid/mode on every
non-zero shell exit. Newly created state directories are retained rather than
recursively deleted because they may contain user data; the separate user-state
SQLite and any successfully activated market database are never destroyed by
code rollback.

The exact release path is proven absent before mutation. If that deployment
fails, the newly created release is moved out of the immutable release namespace
to root-only `/opt/replay-lab/failed-releases/`, then its partial release-owned
`.venv` is removed. The helper refuses to quarantine a symlink, a path outside
`releases/`, or the target still selected by `current`; such a refusal makes
rollback incomplete rather than risking removal of an accepted release. If
virtualenv cleanup itself fails, the complete failed release remains isolated
behind the root-only quarantine instead of being exposed as a rollback target.

An incomplete rollback preserves the exact host-file backup, directory
metadata ledger, prior active-unit set, failure context, and quarantine result
under root-only `/var/lib/replay-lab/recovery/rollback-*`. Only a complete
rollback deletes the transient copy. If recovery-snapshot creation also fails,
the installer retains its root-only temporary directory and prints that path;
it never silently deletes the last recovery evidence.

Old completed releases are retained. Failed, quarantined releases are never
listed as completed rollback targets. A successful deployment retains its
managed Caddy and systemd files; failure removes only files/enablement links
which were absent before the transaction. An existing Caddyfile is additionally
timestamp-backed up before replacement.

## Platform Boundary

Automatic package installation supports `apt`, `dnf`, and `pacman`; other
systemd distributions can use preinstalled dependencies with
`--skip-package-install`. Python 3.10+ and Node.js 18+ are required. The public
proxy uses the official Caddy package route, loopback reverse proxy, automatic
HTTPS, and version-compatible `basicauth`/`basic_auth` rendering.

The script deliberately does not manage DNS, cloud firewalls, database backups,
or market-data maintenance. R10.9 adds bounded authenticated first-database
upload without changing those provider- and host-specific boundaries.

## Executable Evidence

`tests/linux-deployment-script-harness.js` executes private and authenticated
public dry runs, extracts and validates the real rendered Caddyfile when Caddy
is installed, inspects all four hardened systemd units, and proves failures
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
