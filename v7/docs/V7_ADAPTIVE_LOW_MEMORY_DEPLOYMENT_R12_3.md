# V7 Adaptive Low-Memory Deployment — R12.3

Status: binding implementation; two-host acceptance pending

## Decision

Replay Lab supports provider instances advertised as 512 MB as its minimum
Linux host class. Because Linux reserves part of that capacity before exposing
`MemTotal`, the executable lower bound is 450 MiB. A host below that value is
rejected before release mutation instead of being allowed to fail later during
package installation or DuckDB validation.

The public-IP wrapper remains the one-command operator surface. It does not ask
the operator to calculate a memory limit, thread count, or swap size. The
installer selects one profile from physical memory and online CPUs:

| Linux `MemTotal` | Profile | DuckDB memory | Threads | Required total swap |
| --- | --- | ---: | ---: | ---: |
| 450–767 MiB | `compact-512m` | 128 MB | 1 | 2048 MiB |
| 768–1535 MiB | `small-1g` | 256 MB | 1 | 1024 MiB |
| 1536–3071 MiB | `balanced-2g` | 512 MB | up to 2 | 512 MiB |
| 3072 MiB or more | `standard-4g-plus` | 1024 MB | up to 4 | no managed floor |

The selected thread count never exceeds the host's online CPU count. The
limits are capacity guards, not performance promises.

## Swap Ownership

When existing system swap already meets the selected floor, the installer does
nothing. Otherwise it creates only the missing capacity at
`/var/lib/replay-lab/swap/replay-lab.swap`, reserves 512 MiB of filesystem
headroom, enables the file, and adds exactly one `/etc/fstab` entry. It never
replaces an unrelated swap device or resizes an active managed file.

Swap is host-capacity configuration and deliberately survives application
release rollback. Code, environment, unit, proxy, and active-release rollback
remain owned by the existing host transaction.

## DuckDB Runtime Boundary

`v7/server/duckdb_runtime.py` is the shared resource-policy library for the
read-only market-data service and isolated database importer. Deployment writes
the validated `V7_DUCKDB_MEMORY_LIMIT`, `V7_DUCKDB_THREADS`, and
`V7_RESOURCE_PROFILE` values. Each service receives a separate writable spill
directory:

- `/var/lib/replay-lab/duckdb-tmp/market-data`;
- `/var/lib/replay-lab/duckdb-tmp/database-import`.

Every database connection remains read-only unless it is the already-governed
CSV candidate builder. Disk spill does not grant either service authority over
the other service's state or over an existing authoritative DuckDB.

## One-Command Upgrade On The 43.110.32.34 Host

For the existing host and database:

```bash
cd /root/backtesting-v7
git pull --ff-only origin v7/rebuild

bash v7/deploy/linux/deploy-public-ip.sh \
  --public-ip 43.110.32.34 \
  --db /srv/replay-lab-data/trading_data.duckdb \
  --service-user replay \
  --auth-user reviewer \
  --password-file /root/replay-lab-secrets/web-password \
  --preserve-caddy \
  --replace-legacy
```

`--preserve-caddy` is appropriate on that host because its reviewed Caddy
configuration also owns another site. A dedicated Replay Lab-only host should
omit the flag.

## Evidence And Remaining Human Gate

H094 binds the deterministic threshold/profile negative controls, a real
DuckDB connection configured with the compact limits and spill directory, the
rendered environment/systemd boundary, persistent-swap policy, and the existing
market-data/import/deployment regressions.

Human acceptance remains open until both lightweight hosts prove:

1. the 512 MB-class host validates the representative 901 MB DuckDB without an
   OOM kill;
2. swap remains active after reboot and no duplicate `/etc/fstab` entry exists;
3. the existing 43.110.32.34 database fingerprint is unchanged across upgrade;
4. replay-bar latency is compared from the same client, Session, symbol,
   timeframe, and browser build on both hosts. A lower network RTT may improve
   API fetches, but any remaining delay after bars are local must be diagnosed
   in the Replay/UI path rather than attributed to deployment memory.
