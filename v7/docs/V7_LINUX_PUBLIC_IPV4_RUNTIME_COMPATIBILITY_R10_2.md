# V7 Linux Public IPv4 And Runtime Compatibility — R10.2

Status: implemented; real Alibaba Linux acceptance pending (2026-08-05)

## Trigger

The first Alibaba Linux apply stopped before host mutation because an existing
NodeSource Node.js 24/npm pair conflicted with the distribution's independent
npm package. The same host also had a manually started V4 API on loopback 8766,
which could have made a later URL-only health check observe the wrong process.
The reviewer additionally selected direct public-IP browser access instead of
an SSH tunnel.

## Binding Correction

- package planning reuses a supported existing Node.js 18+/npm pair and does
  not request conflicting distribution Node packages;
- Python 3.13–3.10 with venv is selected before generic `python3`, with an
  explicit `--python-bin` override for unusual distributions;
- apply fails closed when 8007 or 8766 is occupied outside the corresponding
  Replay Lab systemd unit; it never kills an unknown process;
- `--public-ip` publishes only authenticated Caddy HTTPS on 80/443 while V4
  and V7 remain loopback-only;
- public IPv4 TLS requires Caddy 2.10.2+, Let's Encrypt's `shortlived` ACME
  profile, and HTTP-01. The short-lived certificate remains automatically
  managed by Caddy;
- the exact DuckDB stays systemd-mounted read-only and public POST/PUT/PATCH/
  DELETE remain blocked.

## Executable Evidence

The deployment Harness proves existing Node/npm omission from the package
request, Python override rejection, IPv4 validation, mutually exclusive
domain/IP selection, authentication, short-lived ACME rendering, and the
legacy-listener guard. Both the domain Caddyfile and public-IPv4 Caddyfile were
validated with the official Caddy 2.11.3 binary. A real Alibaba Linux apply,
certificate issuance, browser login, database fingerprint, restart, and
rollback remain human gates.

R10.2 does not close phase-one overall acceptance or authorize Data Acquisition
and Contract Roll writes.
