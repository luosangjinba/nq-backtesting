# Replay Lab V7

Replay Lab V7 is the current standalone, local-first market replay workstation
in this repository. It is built for discretionary SMC/ICT validation and replay
practice with ES/NQ historical candles. V7 owns its browser application,
market-data service, cross-device state service, and first-run database importer;
V4/V5/V6 remain only as legacy or design references.

Status: the V7 foundation is implemented and the phase-one overall human
acceptance pass is still in progress. This repository does not provide live
trading or order execution.

## Start Here

- [V7 project README](v7/README.md)
- [V7 中文用户指南](v7/docs/V7_USER_GUIDE.zh-CN.md)
- [Linux deployment guide](v7/deploy/linux/README.md)
- [V7 documentation index](v7/docs/INDEX.md)
- [Current V7 TODO](v7/TODO.md)

## Clone The Current V7 Branch

```bash
git clone --branch v7/rebuild --single-branch \
  https://github.com/luosangjinba/nq-backtesting.git backtesting-v7
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
git pull --ff-only origin v7/rebuild
sudo bash v7/deploy/linux/deploy.sh
```

The minimum supported Linux instance is the provider 512 MB class. The deployer
selects a bounded runtime profile and provisions persistent swap when needed.

## Repository Layout

- `v7/` — current product, services, deployment, tests, and specifications;
- `v6/` — prior design/reference implementation;
- `v5/` and `v4/` — legacy/reference work;
- `v7/tmp/验收1.md` — current human acceptance checklist and findings.

Market databases and server-side user state are runtime data and are not
committed to Git.
