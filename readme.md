# Replay Lab V7

Replay Lab V7 is the current standalone, local-first market replay workstation
in this repository. It is built for discretionary SMC/ICT validation and replay
practice with ES/NQ historical candles. V7 owns its browser application,
market-data service, cross-device state service, and first-run database importer;
V4/V5/V6 remain only as legacy or design references.

Status: the V7 foundation milestone is accepted as V7.0.0. It is a complete
minute-data replay loop that can be used and extended independently; the
remaining host-matrix checks and deferred product ideas are non-blocking
follow-up work. This repository does not provide live trading or order
execution.

## Start Here

- [V7 project README](v7/README.md)
- [V7 中文用户指南](v7/docs/V7_USER_GUIDE.zh-CN.md)
- [Linux deployment guide](v7/deploy/linux/README.md)
- [V7 documentation index](v7/docs/INDEX.md)
- [Current V7 TODO](v7/TODO.md)

## Clone V7

```bash
git clone https://github.com/luosangjinba/nq-backtesting.git backtesting-v7
cd backtesting-v7
```

## One-Command Deployment

Use one entry for local machines, cloud IPs, and domain hosts:

```bash
# Local or SSH-tunnel-only installation
sudo bash v7/deploy/linux/deploy.sh --local

# Cloud host; discover its public IPv4 automatically
sudo bash v7/deploy/linux/deploy.sh --public

# Public DNS or private LAN/VPN DNS
sudo bash v7/deploy/linux/deploy.sh --public-domain replay.example.com
sudo bash v7/deploy/linux/deploy.sh --private-domain replay.home.arpa
```

An existing DuckDB is deployed read-only. When the configured database path is
absent, deployment enables the guarded browser bootstrap so an operator can
upload and validate a CSV or DuckDB before activating it once. Do not create an
empty placeholder database.

After a successful first deployment, the non-secret host profile is retained.
Upgrade with:

```bash
git pull --ff-only origin main
sudo bash v7/deploy/linux/deploy.sh
```

The minimum supported Linux instance is the provider 512 MB class. The deployer
selects a bounded runtime profile and provisions persistent swap when needed.

## Repository Layout

- `v7/` — current product, services, deployment, tests, and specifications;
- `v6/` — prior design/reference implementation;
- `v5/` and `v4/` — legacy/reference work;
- `v7/docs/V7_FOUNDATION_MILESTONE_V7_0_0.md` — accepted scope, evidence,
  known limitations, and non-blocking follow-up work.

Market databases and server-side user state are runtime data and are not
committed to Git.
