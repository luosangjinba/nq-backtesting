# Replay Lab V7 Linux One-Click Deployment

Status: R12.3 standalone V7 runtime with adaptive 512 MB-class deployment

`install.sh` deploys only the current committed V7 tree as an immutable release,
installs the V7 read-only market-data runtime and browser dependencies, and creates
four loopback-only systemd services:

- `replay-lab-market-data.service` on `127.0.0.1:8766`;
- `replay-lab-state.service` on `127.0.0.1:8767`;
- `replay-lab-database-import.service` on `127.0.0.1:8768`;
- `replay-lab-web.service` on `127.0.0.1:8007`.

By default an external DuckDB file is required and is never copied, replaced,
repaired, or made writable by the installer. With explicit `--bootstrap`, the
target must be absent and the Data Acquisition page can upload a strict CSV or
DuckDB to create it once. Market Data, Web, and State receive a systemd read-only mount
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
same command automatically detects physical memory and CPUs, rejects hosts
below the supported 512 MB class, provisions persistent swap when required,
and applies a bounded DuckDB memory/thread/disk-spill profile. No resource flags
are required. The
`--preserve-caddy` option retains existing Caddy sites and installs Replay Lab
as an imported `/etc/caddy/replay-lab.Caddyfile` fragment. Omit it only on a
dedicated host where replacing the whole Caddyfile is intentional. The
`--replace-legacy` option stops only command lines positively identified as a
Replay Lab `market_data_api.py`, legacy `v4_api.py`/`read_api.py`, or
`serve.mjs 8007` process; an unknown listener still fails closed. A managed
`replay-lab-api.service` is not killed by the wrapper: the installer retires it
inside the rollback-protected host transaction. Omit the option when no manual
legacy process exists.

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

On Debian/Ubuntu, interpreter discovery also verifies that `ensurepip` is
actually importable. `python -m venv --help` alone is insufficient there: it
can succeed while the matching `python3-venv` package is absent. Apply mode now
installs the distribution venv package. Each immutable release owns its own
virtualenv; an apply failure quarantines that release and removes the partial
runtime before a later run creates a fresh release.

If an older installer already stopped with an error naming
`python3.12-venv`, install the matching package and rerun the current installer;
do not repair or reuse the old shared virtualenv:

```bash
sudo apt-get update
sudo apt-get install -y python3.12-venv
```

The new attempt creates a fresh release-owned runtime and safely isolates any
new failed release.

The minimum supported instance is the provider 512 MB class. Linux must report
at least 450 MiB `MemTotal`; smaller hosts fail before release mutation. The
automatic profiles are:

| Reported RAM | DuckDB limit | Threads | Total swap floor |
| --- | ---: | ---: | ---: |
| 450–767 MiB | 128 MB | 1 | 2 GiB |
| 768–1535 MiB | 256 MB | 1 | 1 GiB |
| 1536–3071 MiB | 512 MB | up to 2 | 512 MiB |
| 3072 MiB+ | 1 GiB | up to 4 | unmanaged |

When current swap is insufficient, the installer creates only the missing
capacity at `/var/lib/replay-lab/swap/replay-lab.swap`, keeps 512 MiB of disk
reserve, enables it immediately, and adds one persistent `/etc/fstab` entry.
The current verified ES/NQ DuckDB is about 902 MB, so the host still needs room
for the database, immutable release, optional upload staging, DuckDB spill, and
swap. Resource adaptation prevents known OOM behavior; actual latency remains a
host acceptance measurement rather than an installer promise. Binding policy:
`../../docs/V7_ADAPTIVE_LOW_MEMORY_DEPLOYMENT_R12_3.md`.

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
controls and service lock. Before activation, use `Upload another file` and its
button confirmation to discard a retained upload or validated candidate; do
not remove staging files or invoke the importer from the shell. Validation in
progress must first finish or recover to a stable state. Re-run ordinary
deployment without `--bootstrap` for later code releases.

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
the local browser resolves the V7 market-data service on port `8766`. The
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
`/v7/market-data/*`, and user state with the same credentials. The authenticated username
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

Each run archives only the committed `v7/` tree from `HEAD` into
`/opt/replay-lab/releases/<UTC>-<commit>`, installs exact `package-lock.json`
dependencies, validates the database as the service user, and atomically moves
the `/opt/replay-lab/current` symlink. Tracked source changes block apply mode.

On the first decoupled deployment, the host transaction stops, disables, and
removes the legacy `replay-lab-api.service` only after the new release and proxy
configuration have been staged and validated. If migration fails, the previous
release, legacy unit file and enablement, environment, Caddy configuration, and
active service state are restored before `/v4/health` is checked.

If local market-data/state/import/Web health fails after activation, the script restores the
prior release symlink, restores the exact previous active/inactive unit set, and
checks the loopback health endpoint of every previously active application
service. Old completed releases are intentionally not deleted automatically.
The failed new release is moved to root-only
`/opt/replay-lab/failed-releases/`; its partial `.venv` is removed after
isolation. The user-state SQLite file is durable host state and is neither
deleted nor reverted with a code release.

If any file, metadata, unit-state, endpoint, or quarantine restoration cannot
be proven, rollback is incomplete. The installer preserves root-only recovery
evidence under `/var/lib/replay-lab/recovery/rollback-*` and prints the exact
path. Do not treat the previous deployment as healthy until that manifest and
the referenced service logs have been reviewed. If snapshot creation itself
fails, the root-only installer temporary directory is retained instead of
being deleted.

Manual rollback remains explicit:

```bash
sudo ln -sfn /opt/replay-lab/releases/PREVIOUS /opt/replay-lab/current.next
sudo mv -Tf /opt/replay-lab/current.next /opt/replay-lab/current
sudo systemctl restart replay-lab-market-data replay-lab-state replay-lab-database-import replay-lab-web
```

That manual command applies only between releases which both use the V7
market-data unit. Do not manually cross the retired V4-unit boundary; use the
installer's automatic transaction rollback or restore its root-only recovery
snapshot so unit, environment, Caddy, and release state stay consistent.

## Operations

```bash
sudo systemctl status replay-lab-market-data replay-lab-state replay-lab-database-import replay-lab-web caddy
sudo journalctl -u replay-lab-market-data -u replay-lab-state -u replay-lab-database-import -u replay-lab-web -f
curl -fsS http://127.0.0.1:8766/v7/market-data/health
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
