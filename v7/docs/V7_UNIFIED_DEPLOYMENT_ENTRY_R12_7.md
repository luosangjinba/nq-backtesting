# V7 Unified Deployment Entry — R12.7

Date: 2026-08-06
Status: implemented with automated evidence; local/domain/cloud host review pending

## Trigger

R12.6 made repeat direct-IP deployment idempotent, but exposure remained an
operator-selected implementation detail: cloud commands repeated a public IP,
local installation used a different entry, and domain deployments fell back to
the lower-level installer. A repeat command therefore could drift from the
host's previous endpoint and credentials even though that state is observable
and safe to persist.

## Decision

`deploy/linux/deploy.sh` is the single operator entry. It owns orchestration
only; `install.sh` remains the release, package, systemd, Caddy, rollback, and
host-transaction owner. The exposure choices are explicit product modes:

| Mode | Entry option | Endpoint and TLS |
| --- | --- | --- |
| local/private | `--local` | loopback HTTP; no Caddy |
| direct cloud | `--public` | detected public IPv4; Let's Encrypt short-lived IP certificate |
| direct override | `--public-ip IPV4` | supplied public IPv4; same certificate contract |
| public DNS | `--public-domain HOST` | Caddy automatic public HTTPS |
| LAN/VPN DNS | `--private-domain HOST` | Caddy internal CA; client trust required |

No exposure option on a fresh host selects local/private mode. No exposure
option on a repeat host loads `/etc/replay-lab/deployment.conf`. The profile is
root-only, non-secret, schema-validated, installed inside the host transaction,
and contains only mode, endpoint, data path, service identity, browser username,
password-file path, and Caddy-preservation policy. It never contains a password
or password hash.

`deploy-public-ip.sh` remains as a forwarding compatibility entry. It rewrites
no arguments. Existing explicit `--public-ip` commands therefore continue to
work while new operations use `deploy.sh`.

## Endpoint Discovery And DNS

`--public` uses a focused endpoint resolver in this order:

1. Alibaba ECS metadata with a bounded metadata token and `eipv4`/
   `public-ipv4`;
2. DigitalOcean's public-interface metadata address;
3. bounded HTTPS address observers as a provider-neutral fallback.

Every candidate is parsed as a globally routable IPv4; private, loopback,
link-local, carrier-NAT, benchmark, multicast, malformed, and empty values are
rejected. Detection failure stops before identity, data, release, or Caddy
mutation and tells the operator to use `--public-ip`.

Public-domain mode requires an IPv4 DNS answer. When the public host address is
also detectable, a mismatch is surfaced as a warning rather than an automatic
rewrite because a deliberate CDN or upstream proxy may own the DNS answer.
Private-domain mode makes no ACME request and requires the operator's LAN/VPN
DNS plus installation of Caddy's local root CA on clients.

The metadata paths follow the provider contracts documented by
[Alibaba ECS instance metadata](https://www.alibabacloud.com/help/en/ecs/user-guide/view-instance-metadata/)
and [DigitalOcean metadata network interfaces](https://docs.digitalocean.com/reference/api/metadata/network-interfaces/).

## Migration And Failure Boundary

- endpoint changes between managed public-IP/public-domain/private-domain modes
  replace the managed fragment, remove identified old Replay Lab site blocks,
  and update or clear an owned IPv4 `default_sni`;
- unrelated Caddy sites, domain `default_sni`, unknown listeners, foreign site
  ownership, malformed profiles, and ambiguous import globs still fail closed;
- an explicit public-to-local change stops rather than silently leaving the
  old public proxy active; removing public exposure is a separate reviewed host
  operation;
- the selected profile becomes authoritative only if installation and health
  checks commit; rollback restores the prior profile and host state.

## Operator Contract

Fresh local/private host:

```bash
sudo bash v7/deploy/linux/deploy.sh --local
```

Fresh cloud host with direct public IPv4:

```bash
sudo bash v7/deploy/linux/deploy.sh --public
```

Public domain or private LAN/VPN domain:

```bash
sudo bash v7/deploy/linux/deploy.sh --public-domain replay.example.com
sudo bash v7/deploy/linux/deploy.sh --private-domain replay.home.arpa
```

The first HTTPS run prompts for the browser password only if no reusable
root-only password file exists. After a successful first run, ordinary upgrades
on that same host are:

```bash
sudo bash v7/deploy/linux/deploy.sh
```

Database/bootstrap selection, the 512 MB minimum class, adaptive DuckDB limits,
swap, known-listener migration, and shared-Caddy preservation remain automatic.

## Automated Evidence

H098 binds:

- all four exposure modes and the compatibility forwarding entry;
- strict eight-field profile acceptance plus missing, unknown, duplicate,
  unsupported-version, and unsupported-mode negative controls;
- local/public-IP/public-domain/private-domain inference;
- Alibaba, DigitalOcean, and external fallback discovery plus private-address
  rejection;
- private-domain Caddy rendering and real validation;
- direct-IP-to-domain `default_sni` cleanup and existing R12.6 Caddy negative
  controls;
- Linux install dry runs, profile/argument coherence, syntax, JSON, governance,
  and whitespace checks.

## Human Gate

Run fresh `--local`, fresh `--public`, and one domain deployment. Repeat each
with no exposure option and confirm that the saved profile reproduces the same
URL, user, data path, Caddy policy, and service identity. On a known direct-IP
host, migrate to a domain and verify one managed site, no obsolete IPv4
`default_sni`, unrelated-site continuity, four loopback health checks,
authenticated browser access, unchanged DuckDB fingerprint, and successful
rollback from a deliberately invalid foreign-owner fixture.
