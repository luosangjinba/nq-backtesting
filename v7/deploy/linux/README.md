# Replay Lab V7 Linux One-Click Deployment

Status: R10.9 authenticated first-run database bootstrap boundary

`install.sh` deploys the current committed V7 tree as an immutable release,
installs the minimal V4 read runtime and V7 browser dependencies, and creates
four loopback-only systemd services:

- `replay-lab-api.service` on `127.0.0.1:8766`;
- `replay-lab-state.service` on `127.0.0.1:8767`;
- `replay-lab-database-import.service` on `127.0.0.1:8768`;
- `replay-lab-web.service` on `127.0.0.1:8007`.

By default an external DuckDB file is required and is never copied, replaced,
repaired, or made writable by the installer. With explicit `--bootstrap`, the
target must be absent and the Data Acquisition page can upload a strict CSV or
DuckDB to create it once. API, Web, and State receive a systemd read-only mount
of the complete database parent; only the importer receives that parent as
writable. Authenticated Caddy mode permits only revision-checked V7 user-state
requests under `/v7/state/*`; it rejects every other mutation unless bootstrap
also enables `/v7/database/*`. User state is stored separately in
`/var/lib/replay-lab/state/replay-lab-state.sqlite3`. This remains suitable for
the current main-program acceptance pass. Database bootstrap does not authorize
Databento refresh, Contract Roll, merge, append, or database replacement.

## Fastest Direct-IP Path

After pulling the current `v7/rebuild` branch and opening cloud TCP 80/443, one
interactive command prepares the dedicated service identity, database read
permission, root-only password file, recognized legacy listeners, and the
reviewed installer:

```bash
sudo bash v7/deploy/linux/deploy-public-ip.sh \
  --public-ip 43.110.32.34 \
  --db /srv/replay-lab-data/trading_data.duckdb \
  --preserve-caddy \
  --replace-legacy
```

It prompts twice for the browser password when no saved password exists. The
`--preserve-caddy` option retains existing Caddy sites and installs Replay Lab
as an imported `/etc/caddy/replay-lab.Caddyfile` fragment. Omit it only on a
dedicated host where replacing the whole Caddyfile is intentional. The
`--replace-legacy` option stops only command lines positively identified as the
old `v4_api.py` on 8766 or `serve.mjs 8007`; an unknown listener still fails
closed. Omit that option when no legacy process exists.

## Supported Hosts

- current Debian/Ubuntu releases with `apt`;
- current Fedora/RHEL/Rocky/Alma releases with `dnf`;
- current Arch Linux with `pacman`;
- another systemd Linux when dependencies are installed first and
  `--skip-package-install` is used.

Python 3.10+ and Node.js 18+ are enforced after package installation. On an
older long-term-support image whose distribution repository still supplies an
older Node.js, install a supported Node.js package first and rerun with
`--skip-package-install`.

The installer reuses an already-supported Node/npm pair instead of requesting
distribution `nodejs`/`npm` packages again. This avoids the package conflict
between a NodeSource Node.js installation and Alibaba Linux's separate npm
package. Python 3.13 through 3.10 are auto-detected before generic `python3`;
use `--python-bin python3.11` only when an unusual host needs an explicit
selection.

A practical small-host starting point is 2 vCPU, 2 GB RAM plus swap, and at
least 3 GB free space in addition to the market database. The current verified
ES/NQ DuckDB is about 902 MB. Actual memory and latency remain part of the host
acceptance test rather than an installer promise.

## Prepare Source And Data

Ordinary non-bootstrap deployment needs a clean Git checkout and an existing
database file. Transfer the database separately so a code deployment can never
overwrite market data:

```bash
rsync --partial --progress \
  trading_data.duckdb user@host:/srv/replay-lab-data/trading_data.duckdb
```

Make the file readable by the selected service user. Keep the source and data
paths free of spaces and quotes; this makes the generated systemd environment
unambiguous.

## Fresh Host Without A Database

Do not create an empty DuckDB file. Leave the target absent and run the direct-
IP wrapper with `--bootstrap`:

```bash
sudo bash v7/deploy/linux/deploy-public-ip.sh \
  --public-ip 43.110.32.34 \
  --db /srv/replay-lab-data/trading_data.duckdb \
  --bootstrap \
  --preserve-caddy
```

Then sign in and open
`https://43.110.32.34/v7/app/data-acquisition.html`. Choose one `.csv` or
`.duckdb`, upload, validate, inspect coverage, type the exact confirmation
`ACTIVATE DATABASE`, and activate. CSV must be UTF-8 with the exact header
`instrument,ts,open,high,low,close,volume`; no field, timezone, instrument,
type, or duplicate is automatically repaired. After activation the upload
controls and service lock. Re-run ordinary deployment without `--bootstrap`
for later code releases.

## Private Deployment (Recommended First Test)

Run a read-only plan first:

```bash
bash v7/deploy/linux/install.sh \
  --dry-run \
  --db /srv/replay-lab-data/trading_data.duckdb
```

Then install from the exact committed checkout:

```bash
sudo bash v7/deploy/linux/install.sh \
  --apply --yes \
  --db /srv/replay-lab-data/trading_data.duckdb \
  --service-user "$USER"
```

No public port is opened in this mode. Connect from the review machine with
both loopback ports forwarded:

```bash
ssh \
  -L 8007:127.0.0.1:8007 \
  -L 8766:127.0.0.1:8766 \
  user@host
```

Then open `http://127.0.0.1:8007/v7/app/`. Both forwards are necessary because
the local-browser compatibility path resolves the V4 API on port `8766`. The
web service proxies `/v7/state/*` to the loopback state service as identity
`local`; bootstrap mode similarly proxies `/v7/database/*`. Ports `8767` and
`8768` are never forwarded or exposed.

## Public HTTPS Deployment

Point the domain's DNS A/AAAA record at the host and allow inbound TCP 80/443.
Use this mode on a dedicated acceptance host: the installer backs up and then
replaces `/etc/caddy/Caddyfile` rather than merging with unrelated sites.
On a shared host, add `--preserve-caddy` and omit `--email`; the installer
backs up the main file, writes a managed Replay Lab fragment, adds one absolute
import when absent, validates the combined configuration, and restores both
files if validation or reload fails.
Put a strong password in a root-readable file; passing plaintext on the command
line would leak it into shell history:

```bash
sudo install -d -m 0700 /root/replay-lab-secrets
sudo bash -c 'umask 077; read -rsp "Replay password: " password; printf "%s" "$password" > /root/replay-lab-secrets/web-password; unset password; echo'

sudo bash v7/deploy/linux/install.sh \
  --apply --yes \
  --db /srv/replay-lab-data/trading_data.duckdb \
  --service-user replay \
  --domain replay.example.com \
  --email admin@example.com \
  --auth-user reviewer \
  --auth-password-file /root/replay-lab-secrets/web-password
```

Caddy obtains and renews HTTPS certificates and protects the V7 surface,
`/v4/*`, and user state with the same credentials. The authenticated username
is the state namespace, so separate configured Basic Auth users do not share a
snapshot. The installer does not remove the password file. Public access
without authentication requires the deliberately named
`--allow-public-without-auth` override and deliberately disables remote state
sync.

## Direct Public IPv4 HTTPS

Direct IP access keeps both application processes on loopback and publishes
only Caddy on ports 80/443. It requires Caddy 2.10.2 or newer and a publicly
reachable IPv4 address. The installer configures Let's Encrypt's `shortlived`
profile, forces the HTTP challenge, and selects the managed IP certificate as
Caddy's `default_sni` because IP-literal clients may omit SNI. Preserve mode
merges that option into an existing leading global block. Certificate renewal
remains owned by Caddy. Open TCP 80 and 443 in both the cloud security group
and host firewall before apply.

Create a dedicated service identity and a root-readable web password:

```bash
sudo useradd --system --home-dir /var/lib/replay-lab --create-home \
  --shell /sbin/nologin replay 2>/dev/null || true
sudo chown root:replay /srv/replay-lab-data/trading_data.duckdb
sudo chmod 0640 /srv/replay-lab-data/trading_data.duckdb
sudo install -d -m 0700 /root/replay-lab-secrets
sudo bash -c 'umask 077; read -rsp "Replay password: " password; printf "%s" "$password" > /root/replay-lab-secrets/web-password; unset password; echo'
```

Then deploy:

```bash
sudo bash v7/deploy/linux/install.sh \
  --apply --yes \
  --db /srv/replay-lab-data/trading_data.duckdb \
  --service-user replay \
  --public-ip 43.110.32.34 \
  --auth-user reviewer \
  --auth-password-file /root/replay-lab-secrets/web-password \
  --preserve-caddy
```

Open `https://43.110.32.34/v7/app/` and enter the configured credentials.
Do not expose 8007, 8766, 8767, or 8768 in the cloud security group.

Apply mode fails before host mutation when either loopback port is owned by a
legacy process rather than the Replay Lab systemd units. Inspect and stop the
reported old process deliberately, then rerun apply; the installer never kills
an unknown listener automatically.

## Repeat Deployment And Rollback

Each run archives committed `HEAD` into
`/opt/replay-lab/releases/<UTC>-<commit>`, installs exact `package-lock.json`
dependencies, validates the database as the service user, and atomically moves
the `/opt/replay-lab/current` symlink. Tracked source changes block apply mode.

If local API/state/import/Web health fails after activation, the script restores the
prior release symlink and restarts all four services. Old releases are
intentionally not deleted automatically. The user-state SQLite file is durable
host state and is neither deleted nor reverted with a code release.

Manual rollback remains explicit:

```bash
sudo ln -sfn /opt/replay-lab/releases/PREVIOUS /opt/replay-lab/current.next
sudo mv -Tf /opt/replay-lab/current.next /opt/replay-lab/current
sudo systemctl restart replay-lab-api replay-lab-state replay-lab-database-import replay-lab-web
```

## Operations

```bash
sudo systemctl status replay-lab-api replay-lab-state replay-lab-database-import replay-lab-web caddy
sudo journalctl -u replay-lab-api -u replay-lab-state -u replay-lab-database-import -u replay-lab-web -f
curl -fsS http://127.0.0.1:8766/v4/health
curl -fsS http://127.0.0.1:8767/v7/state/health
curl -fsS http://127.0.0.1:8768/v7/database/health
curl -I http://127.0.0.1:8007/v7/app/
```

Back up the server-side Session memory before a host migration or destructive
storage change. Stop only the state service, copy the SQLite file plus its
ownership/mode, then restart it; ordinary immutable code deployments do not
require this step. Restore follows the same stop/copy/start sequence and must
be tested before the source host is retired.

The installer does not configure a cloud firewall, upload source, install
Databento credentials, run historical repair manifests, or enable remote data
maintenance. R10.9 permits only the explicitly authenticated first database
upload; those other operations remain separate administrative decisions.
