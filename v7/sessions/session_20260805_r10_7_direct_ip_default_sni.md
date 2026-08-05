# Session — R10.7 Direct-IP TLS Default SNI

## Trigger

Alibaba host evidence proved both application services healthy, both loopback
ports responsive, Caddy listening on 80/443, combined configuration valid, and
Let's Encrypt authorization plus public IPv4 certificate issuance successful.
External curl and browser-compatible probing nevertheless received a TLS
internal alert before HTTP because IP-literal clients can omit SNI and Caddy
had no default certificate-selection name.

The official Caddy global-options reference defines `default_sni` as the
ServerName supplied when ClientHello contains none:
<https://caddyserver.com/docs/caddyfile/options#default-sni>.

## Correction And Evidence

Public IPv4 configuration now declares the managed IP as Caddy `default_sni`.
Dedicated-host output renders the global option directly. Preserve mode inserts
it into an existing leading global block (retaining the host's ACME email), or
creates a global block when absent; an incompatible existing default fails
closed and repeat runs do not duplicate it.

H083 independently executes the global-block merger, preserves an existing
email/site fixture, requires the IP default, and validates replacement plus
coexistence configurations with Caddy 2.11.3. Shell, architecture/source, and
`git diff --check` gates remain binding. External authenticated HTTP remains a
real-host rerun gate.
