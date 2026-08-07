# V7 Foundation Milestone — V7.0.0

Status: accepted on 2026-08-07

Release identity: `main` at annotated tag `v7.0.0`

## Decision

Replay Lab V7 is accepted as a stable foundation milestone. The current system
is useful as a complete product even if no later feature is implemented: an
operator can deploy or run it locally, establish market data, create durable
Sessions, replay ES/NQ minute history across panes and timeframes, and restore
state on the same or another authenticated device.

This is also the supported fork point. Future contributors may add product
modules or adapters, but must retain the explicit Chart, Bar Data, Replay,
Workspace State, persistence, UI, and deployment ownership boundaries frozen by
the V7 architecture and executable harnesses.

## Accepted Scope

- standalone V7 browser, Market Data, state-sync, database-import, and Linux
  deployment runtimes with no deployed V4/V5/V6 code dependency;
- strict CSV or DuckDB first-run import and read-only active market data;
- persistent Sessions with New York date-range semantics;
- one-to-four-pane ES/NQ minute charts, supported timeframe switching,
  navigation, GoTo, truncation, and deterministic manual/continuous Replay;
- workstation settings, local persistence, and conflict-aware authenticated
  cross-device state synchronization;
- one adaptive Linux entry for local, public IPv4, public-domain, and private-
  domain hosts, with a provider 512 MB-class minimum;
- modular, decoupled ownership enforced by architecture, source-quality,
  deployed-runtime, standalone-runtime, and focused browser harnesses.

## Acceptance Basis

The two human acceptance rounds accepted the product workflow and presentation;
the final existing-database Data Acquisition capability mismatch was corrected
by R12.8. Its unit, real-browser, deployment, Replay UI, architecture, source-
quality, deployed-runtime, and standalone-runtime regression evidence passed
before milestone closure. The repository was clean and `origin/main` was a
strict ancestor of the accepted delivery branch, allowing a history-preserving
fast-forward release.

The milestone decision does not claim that every Linux distribution, cloud
provider, Caddy topology, database size, or physical client combination has
been exercised. Those checks improve operational confidence without changing
the accepted product boundary.

## Known Limitations

- market-data and product scope is ES/NQ minute replay;
- second-level/tick replay is deferred pending a separate data-cost, caching,
  performance, and capacity decision;
- there is no live brokerage connection, order execution, simulated matching,
  Journal, or Validation Campaign module;
- Basic Auth plus user-scoped state is not registration, roles, tenant
  administration, or a general multi-user account system;
- the standalone read-only profile does not include optional historical
  Maintenance or Contract Roll writers;
- low-memory deployment supports the provider 512 MB class through bounded
  DuckDB settings and managed swap; lower reported memory is unsupported;
- market databases and server state remain external runtime data and are not
  stored in Git or in an immutable application release.

## Non-Blocking Follow-Up

- repeat existing-database Data Acquisition verification after cloud redeploy;
- expand clean/repeat local, public-IP, public-domain, and private-domain host
  matrix evidence;
- repeat large-file bootstrap, swap/reboot, rollback, Caddy coexistence, and
  physical two-computer state backup/restore checks;
- continue latency measurements and historical visual fixtures where useful;
- evaluate deferred product directions only through a new documented decision.

These items are deliberately visible, but they are not V7.0.0 release blockers.
Any future release may promote a specific item to a gate through an explicit
product or architecture decision.
