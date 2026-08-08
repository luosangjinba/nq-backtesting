# Replay Lab V7

Replay Lab V7 is a standalone, local-first replay workstation for discretionary
SMC/ICT traders. It combines a multi-pane historical chart, deterministic replay
navigation, persistent sessions, strict first-run market-data import, and
authenticated cross-device state without depending on an older application
runtime.

Status: the V7 foundation milestone is accepted as V7.0.0. The current concrete
product boundary is ES/NQ historical replay. Live trading, order execution,
Journal, Validation Campaigns, second-level/tick replay, and a general multi-
user account system are not part of the current release. Minute-sourced V7 is a
complete product loop without simulated-live execution; seconds are explicitly
deferred, not silently assumed. Remaining host-matrix checks are operational
follow-up evidence and do not block this milestone.

Post-milestone architecture development has accepted ADR-V7-001 and completed
R13.2 Geometry, R13.3 Annotation Runtime, and R13.4 accepted Chart projection.
They add removable market-coordinate Geometry, a Session-scoped generic-
Drawing document writer, and a reversible Chart-owned Primitive port with one
test-only static Segment fixture. They do not yet add drawing controls, durable
annotations, semantic FVG/OB/liquidity plugins, or any new user-visible
workflow.

For operation in Chinese, start with the
[V7 中文用户指南](docs/V7_USER_GUIDE.zh-CN.md).

## What Is Included

- replay sessions with New York date-range semantics and durable checkpoints;
- one to four resizable panes with independent symbol, timeframe, and viewport;
- session-wide ETH/RTH switching;
- drag, wheel zoom, history loading, future time axis, and pane-to-pane candle
  location;
- Previous/Next bar, continuous Play/Pause, selectable speed and Replay step,
  Restart, Quick GoTo, Exact GoTo, and chart truncation;
- workstation-wide chart appearance and time-display settings;
- strict browser upload, validation, and one-time activation of CSV or DuckDB;
- a read-only standalone V7 market-data service;
- local persistence plus authenticated, user-scoped server state for use across
  computers;
- one Linux deployment entry for local, cloud IPv4, public-domain, and private-
  domain hosts.

## Quick Deployment

Clone the default `main` branch:

```bash
git clone https://github.com/luosangjinba/nq-backtesting.git backtesting-v7
cd backtesting-v7
```

Choose an exposure mode on the first run:

| Host | Command | Browser entry |
| --- | --- | --- |
| This machine / SSH tunnel | `sudo bash v7/deploy/linux/deploy.sh --local` | `http://127.0.0.1:8007/v7/app/` |
| Cloud public IPv4 | `sudo bash v7/deploy/linux/deploy.sh --public` | Reported HTTPS IP URL |
| Public DNS | `sudo bash v7/deploy/linux/deploy.sh --public-domain replay.example.com` | `https://replay.example.com/v7/app/` |
| LAN/VPN DNS | `sudo bash v7/deploy/linux/deploy.sh --private-domain replay.home.arpa` | `https://replay.home.arpa/v7/app/` after trusting the private CA |

Use `--public-ip 43.110.32.34` only when automatic public-IP discovery needs an
explicit override. Use `--db /path/to/trading_data.duckdb` to override the
default `/srv/replay-lab-data/trading_data.duckdb` path.

The deployer detects whether this is a fresh or repeated deployment, whether a
database already exists, existing Replay Lab/Caddy ownership, CPU and memory,
and the supported package manager. An absent database selects guarded browser
bootstrap; an existing database is validated and mounted read-only. The minimum
supported host is the provider 512 MB class.

After the first successful install, update an ordinary `main` checkout and
redeploy with the saved host profile:

```bash
cd ~/backtesting-v7
git switch main
git pull --ff-only origin main
sudo bash v7/deploy/linux/deploy.sh
```

An older checkout cloned with `--branch v7/rebuild --single-branch` must add
`main` to its remote tracking configuration once:

```bash
cd ~/backtesting-v7
git remote set-branches --add origin main
git fetch origin
git switch -c main --track origin/main
sudo bash v7/deploy/linux/deploy.sh
```

When a local `main` already exists, use `git switch main` and
`git pull --ff-only origin main` instead of creating it. Preserve or commit any
local source changes; do not force-reset them during an upgrade.

Deployment details, security boundaries, rollback, and host diagnostics are in
the [Linux deployment guide](deploy/linux/README.md).

## Known Limitations

- the supported market-data and product scope is ES/NQ minute replay;
- second-level and tick replay are deferred because they require a separate
  data-cost, cache, and capacity decision;
- live brokerage connectivity, order execution, Journal, and Validation
  Campaigns are outside V7.0.0;
- Basic Auth provides one state namespace per username, not registration,
  roles, tenancy administration, or a general multi-user account system;
- historical maintenance and Contract Roll writes are optional and disabled in
  the standalone read-only deployment; this does not block Session or Replay;
- Linux support starts at the provider 512 MB class and relies on deployer-
  managed swap and bounded DuckDB settings on low-memory hosts.

The accepted scope, evidence, and non-blocking operational follow-ups are frozen
in the [V7.0.0 foundation milestone record](docs/V7_FOUNDATION_MILESTONE_V7_0_0.md).

## First Use

Open `/v7/app/data-acquisition.html` when the database did not exist during
deployment. Upload either:

- a UTF-8 CSV with the exact columns
  `instrument,ts,open,high,low,close,volume`; or
- a DuckDB containing the exact `main.futures_1m` schema described in the user
  guide.

Upload, validate, inspect coverage, type `ACTIVATE DATABASE`, and activate. The
operation is deliberately first-run-only. Do not manually create an empty
DuckDB and do not delete an activated database to try to reopen bootstrap.

Then open `/v7/app/`, create a Replay Session, select its instruments and New
York date range, and enter the workspace. The authenticated browser username is
also the server-state namespace: the same username on another computer restores
the same saved snapshot. This is isolated state synchronization, not a complete
account or authorization system.

## Runtime Boundaries

The deployed application keeps all internal services on loopback:

| Service | Address | Responsibility |
| --- | --- | --- |
| Market Data | `127.0.0.1:8766` | Read-only DuckDB queries under `/v7/market-data/*` |
| State | `127.0.0.1:8767` | User-scoped durable snapshots under `/v7/state/*` |
| Database Import | `127.0.0.1:8768` | Guarded first-run upload/validation/activation |
| Web | `127.0.0.1:8007` | Static workstation and local proxy |

For public/domain installs, only Caddy ports 80/443 should be exposed. Never
open 8007, 8766, 8767, or 8768 in a cloud security group.

Default runtime data:

- market database: `/srv/replay-lab-data/trading_data.duckdb`;
- server state: `/var/lib/replay-lab/state/replay-lab-state.sqlite3`;
- non-secret deployment profile: `/etc/replay-lab/deployment.conf`.

The market database is external runtime data and is not bundled with source or
immutable releases. Server state is stored separately and is not rolled back
with application code.

## Developer Preview

The deployment path is the supported way to exercise all services. For a
read-only local frontend/market-data preview with an existing compatible
DuckDB:

```bash
npm ci --prefix v7
python3 -m venv /tmp/replay-lab-v7-venv
/tmp/replay-lab-v7-venv/bin/pip install \
  -r v7/deploy/linux/requirements-runtime.txt

V7_MARKET_DATA_DB=/absolute/path/trading_data.duckdb \
  /tmp/replay-lab-v7-venv/bin/python v7/server/market_data_api.py
```

In another terminal:

```bash
node v7/scripts/serve.mjs 8007
```

Open `http://127.0.0.1:8007/v7/app/`. This preview intentionally omits the
deployed state and database-bootstrap services; browser state remains local.

## Verification

Focused deployment and architecture gates include:

```bash
node v7/tests/unified-deployment-harness.js
node v7/tests/linux-deployment-script-harness.js
node v7/tests/caddy-site-reconciler-harness.js
node v7/tests/standalone-v7-runtime-harness.js
```

See the [documentation index](docs/INDEX.md), [current TODO](TODO.md), and
[V7.0.0 milestone record](docs/V7_FOUNDATION_MILESTONE_V7_0_0.md) before
changing product or runtime boundaries.
