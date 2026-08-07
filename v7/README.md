# Replay Lab V7

Replay Lab V7 is a standalone, local-first replay workstation for discretionary
SMC/ICT traders. It combines a multi-pane historical chart, deterministic replay
navigation, persistent sessions, strict first-run market-data import, and
authenticated cross-device state without depending on an older application
runtime.

Status: implementation and automated gates are active; phase-one overall human
acceptance is still in progress. The current concrete product boundary is ES/NQ
historical replay. Live trading, order execution, Journal, Validation Campaigns,
second-level/tick replay, and a general multi-user account system are not part
of the current release. Minute-sourced V7 remains a valid product without
simulated-live execution; seconds are explicitly deferred, not silently assumed.

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

Clone the active branch:

```bash
git clone --branch v7/rebuild --single-branch \
  https://github.com/luosangjinba/nq-backtesting.git backtesting-v7
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

After the first successful install, update with the same no-argument command:

```bash
git pull --ff-only origin v7/rebuild
sudo bash v7/deploy/linux/deploy.sh
```

Deployment details, security boundaries, rollback, and host diagnostics are in
the [Linux deployment guide](deploy/linux/README.md).

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
[overall acceptance checklist](tmp/验收1.md) before changing product or runtime
boundaries.
