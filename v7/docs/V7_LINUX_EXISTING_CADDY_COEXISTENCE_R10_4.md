# V7 Linux Existing-Caddy Coexistence — R10.4

Status: implemented; real Alibaba Linux rerun pending (2026-08-05)

## Trigger

External probing reached Caddy on TCP 80/443, but HTTPS returned a TLS internal
error. Host inspection then showed that neither `replay-lab-api.service` nor
`replay-lab-web.service` existed and neither loopback application port was
listening. The long-running Caddy process and renewal logs belonged to the
unrelated `recap.buddhiststudy.xyz` site. The earlier apply had therefore never
completed, and the host was not the dedicated Caddy host assumed by the
replacement-mode installer.

## Binding Correction

`install.sh --preserve-caddy` now keeps `/etc/caddy/Caddyfile`, installs the
generated authenticated Replay Lab site as
`/etc/caddy/replay-lab.Caddyfile`, and adds one absolute import only when it is
absent. The direct-IP wrapper exposes the same flag. Replacement mode remains
available for deliberately dedicated hosts.

The installer validates the complete on-disk configuration before service
activation. A validation failure, application-service failure, local health
failure, or Caddy reload failure restores the prior main file and prior managed
fragment (or removes newly created files) alongside the existing release
rollback. `--preserve-caddy` cannot be combined with the global `--email`
directive; direct IPv4 deployment does not need that directive.

## Evidence And Remaining Gate

Shell syntax, the focused Linux deployment Harness, source safety assertions,
dry-run planning, negative option controls, and a real Caddy 2.11.3 combined
configuration containing an existing domain plus the imported direct-IP site
pass. The Alibaba host must still pull this commit and prove application health,
existing-domain continuity, certificate issuance, authenticated browser access,
database immutability, service restart, and rollback. Overall acceptance and
the separate Data Acquisition/Contract Roll gate remain open.
