# V7 Host-Adaptive Idempotent Deployment — R12.6

Date: 2026-08-06
Status: implemented with automated evidence; two-host rerun pending

## Trigger

An upgrade on `146.190.100.212` failed after release staging because the
preserved Caddy configuration contained both an older direct Replay Lab site
block and the managed Replay Lab fragment. Both named the same public IP, so
Caddy correctly rejected the combined configuration as an ambiguous site
definition. Rollback restored the previous release, but rerunning the same
one-click command could not repair the persistent layout.

The sequence also showed that operators still had to decide whether a host was
new, whether its database target was absent, whether Caddy should be preserved,
and whether known legacy listeners should be migrated. Those are observable
host states, not product choices.

## Decision

`deploy/linux/deploy-public-ip.sh` is the single public-IP deployment entry.
Only the public IP remains required. Its defaults are conservative and
host-adaptive:

| Observed state | Automatic action |
| --- | --- |
| DuckDB is a regular file | deploy the read-only Market Data runtime |
| DuckDB target is absent | enable strict first-run browser upload |
| active `/opt/replay-lab/current` exists | perform an idempotent immutable upgrade |
| no active release exists | perform first deployment |
| no Caddyfile exists | create a managed global/import layout |
| unrelated Caddy sites exist | preserve them and add one managed Replay Lab import |
| managed fragment already exists | replace it and retain exactly one effective import |
| old direct Replay Lab site exists | remove that owned block and migrate to the fragment |
| Replay Lab owns an old `default_sni` | update it to the requested public IP |
| recognized manual/legacy listener exists | stop and migrate it |
| new password path is absent but known legacy file exists | reuse the root-only legacy file |
| unknown listener or foreign owner of the IP exists | fail closed without taking ownership |

`deploy/linux/lib/deployment-state.sh` keeps database, release, and credential
classification separate from wrapper orchestration. The lower-level
`install.sh` remains the transaction owner. Distribution,
Python/venv, Node/npm, Caddy version, RAM, CPU, swap, DuckDB memory/threads,
release, service, and rollback policies remain in their existing focused
owners. R12.6 adds no cloud-provider branch.

## Caddy Reconciliation Boundary

`deploy/linux/lib/caddy-site-reconciler.py` owns Caddy layout migration. It:

- parses complete top-level blocks and refuses unbalanced input;
- identifies Replay Lab blocks only through the jointly owned Web and Market
  Data proxy signatures;
- removes legacy/current direct Replay Lab site blocks before importing the
  newly rendered managed fragment;
- preserves every unrelated block and global option;
- reduces duplicate exact imports to one managed import and recognizes one
  covering glob import;
- updates a conflicting direct-IP `default_sni` only when existing Replay Lab
  ownership evidence is present;
- refuses an unmanaged site that already names the requested host, an
  unmanaged conflicting `default_sni`, or multiple covering import globs.

The installer still backs up both Caddy files, validates the complete on-disk
configuration, and restores Caddy, systemd state, services, and the previous
release on any later failure. Reconciliation never grants permission to edit
an unknown site merely to make validation pass.

## Operator Contract

Normal first and repeat deployment use the same command:

```bash
sudo bash v7/deploy/linux/deploy-public-ip.sh \
  --public-ip 146.190.100.212
```

The standard database path, `replay` service identity, `reviewer` browser user,
root-only persistent password (including the known legacy root path), shared-Caddy preservation, known-listener
migration, and database mode are defaults. Existing explicit arguments remain
compatible.

`--bootstrap` can force and verify an absent target;
`--require-existing-db` can forbid automatic first-run mode; and
`--replace-caddy` is an explicit dedicated-host override. The script never
opens a provider security group, guesses which public IP should receive a
certificate, or replaces a foreign Caddy owner.

## Automated Evidence

H097 requires:

- fresh, shared-site, repeated, duplicate-import, glob-import, legacy-direct,
  old-IP, and domain-preservation transitions;
- idempotent second reconciliation;
- real Caddy validation of the formerly ambiguous direct-IP layout;
- negative controls for foreign host ownership, foreign `default_sni`,
  multiple covering globs, and unbalanced input;
- wrapper evidence for automatic database/release/Caddy/listener selection;
- Linux deployment, host transaction, architecture, source-quality, JSON, and
  whitespace gates.

## Human Gate

Pull the R12.6 commit on both known hosts. Run the same minimal command once on
`146.190.100.212`, where the legacy direct block exists, and once on
`43.110.32.34`, where another Caddy site is already preserved. Acceptance
requires `deployment complete`, one effective Replay Lab site, unrelated-site
continuity, authenticated HTTPS, all four loopback health checks, unchanged
DuckDB fingerprint, and a successful identical rerun.
