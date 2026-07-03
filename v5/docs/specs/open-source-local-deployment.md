# Open Source Local Deployment

Phase: cross-phase product architecture.

Phase gate: V5 should become a credible open-source replay workstation that can
be deployed on a local machine or terminal server without SaaS account,
billing, or hosted multi-tenant infrastructure.

## Product Direction

Step 490 changes the V5 product target from SaaS-ready-first to
open-source/local-first.

The target project is:

- an open-source FX Replay / TradingView-like replay workstation;
- deployable on a local desktop, LAN machine, NAS, VPS, or terminal server;
- usable without public login, subscription, billing, entitlement, or hosted
  account services;
- professional enough that code quality, installation docs, deployment scripts,
  modularity, tests, and plugin boundaries matter as product features.

This does not weaken V5's runtime architecture. Local-first is not permission to
collapse feature code into global stores or direct DOM/runtime mutations.

## What Changes

The priority changes from hosted SaaS optionality to open-source operator
quality:

- local deployment and terminal-server deployment become first-class targets;
- Docker and reverse-proxy friendly operation matter;
- simple local configuration matters more than account provisioning;
- deterministic data import/cache behavior matters more than hosted market-data
  entitlement;
- README, install, upgrade, backup, restore, and contribution docs become
  product work;
- plugin/overlay boundaries matter because open-source users may extend the
  chart locally.

## What Stays

V5 keeps these rules:

- UI dispatches commands and subscribes to events.
- Chart runtime remains the only chart series writer.
- Bar data runtime remains the only K-line requester/cache owner.
- Replay runtime remains the only replay cursor/reveal owner.
- Layout runtime owns panes, active pane, variants, split ratios, and sync
  flags.
- Durable records should still have stable ids, timestamps, workspace/profile
  ownership, and canonical chart/replay time where relevant.
- Feature modules should use repositories/runtimes instead of direct storage.

The old `user/workspace` shape may become a simpler local `profile/workspace`
shape, but the ownership path remains useful for backups, imports, multiple
local workspaces, and future optional remote collaboration.

## SaaS Scope Change

Public auth, subscription, billing, hosted market-data entitlement, hosted
multi-tenancy, and collaboration-ready server hardening are no longer V5
roadmap priorities.

They may remain theoretical future forks or optional deployment modes, but they
must not drive current architecture or step selection.

The old SaaS readiness strategy is superseded by this local-first strategy.
Where it protected good boundaries, keep those boundaries. Where it motivated
auth, billing, entitlement, or hosted multi-tenancy, stop treating that as a
near-roadmap goal.

## Deployment Targets

V5 should plan for:

- local developer/static server usage;
- local workstation usage against local V4-compatible data APIs;
- terminal server or VPS deployment behind a reverse proxy;
- Docker or Compose packaging once the replay workstation loop stabilizes;
- local database/file storage with backup/restore documentation;
- import/export for replay sessions, layouts, settings, orders, journal, and
  annotations when those records exist.

## Open Source Quality Bar

Future steps should consider:

- clear README and docs index for non-author users;
- setup and smoke-test commands that work from a clean checkout;
- explicit configuration files and environment variable docs;
- license/dependency clarity;
- contribution guidelines once plugin or extension points exist;
- deterministic fixtures for replay, chart, layout, and import behavior;
- module boundaries that make code review approachable.

## Forbidden

- Do not add public login/register as a default requirement.
- Do not add subscription, billing, or entitlement work to the active roadmap.
- Do not justify global singleton state because the app is local-first.
- Do not let local file/localStorage convenience bypass repositories/runtimes.
- Do not design deployment around one developer's machine paths.
- Do not add opaque generated UI/code that cannot be maintained by open-source
  contributors.

## Verification

For now this direction is verified through documentation and step selection:

- roadmap states local/open-source deployment as the product direction;
- SaaS-heavy items are removed or demoted from near-roadmap phases;
- future persistence/deployment steps specify local backup/restore and terminal
  server deployment acceptance criteria;
- boundary smokes continue to prove the frontend/runtime ownership rules.
