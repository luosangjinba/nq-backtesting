# SaaS Readiness Strategy

Status: historical, superseded by Step 490.

Step 490 changes V5's product direction to open-source/local-first deployment.
Keep the useful boundary lessons from this document, such as repository/runtime
storage boundaries and stable ownership paths, but do not use this spec to
prioritize public auth, billing, hosted entitlement, or production
multi-tenancy. See `open-source-local-deployment.md`.

Phase: cross-phase product architecture.

Phase gate: V5 remains compatible with a future SaaS product without slowing the
current replay workstation MVP with premature auth, billing, or server
infrastructure.

## Product Thesis

V5 should not become a SaaS merely because it can be hosted. The SaaS-worthy
value is the durable trading training loop:

- replay historical markets;
- place simulated orders against replay time;
- capture journal notes, reasoning, emotion, and mistakes;
- review statistics and repeated failure patterns;
- resume the same workspace across devices.

K-line replay alone is not enough differentiation. Replay plus journal, orders,
analytics, and persistent training history is the SaaS candidate.

## Strategy

V5 follows a SaaS-ready, not SaaS-heavy, strategy.

SaaS-ready means:

- every durable user-owned record has a user/workspace ownership path;
- commands/events keep feature modules decoupled from storage details;
- replay, order, journal, annotation, and setting records use canonical replay
  time so they can move from local storage to server storage;
- data loading remains bounded and cache-aware so hosted costs can be
  controlled later;
- specs and harnesses protect runtime ownership boundaries before server
  persistence exists.

SaaS-heavy means:

- public auth/login;
- subscription and billing;
- production multi-tenant authorization;
- server-backed workspace persistence;
- market data entitlement and usage metering;
- audit logs, support tooling, and operational dashboards.

SaaS-heavy work is out of scope until the replay, chart interaction, order, and
journal MVP proves that users would repeatedly use the training loop.

## Current Implementation Rule

Before Phase 6, V5 may use local storage or local APIs for speed, but new durable
models must still be designed as if they will move to a server:

- include `userId` directly or inherit it through a parent workspace/session;
- include stable ids, timestamps, and canonical replay timestamps where needed;
- avoid browser-only identity assumptions in domain models;
- avoid feature modules directly reading or writing persistence;
- keep storage behind repositories/runtimes that can be replaced later.

## Phase Implications

Phase 3 should focus on chart interaction contracts. It should not add auth,
billing, or server persistence.

Phase 4 should add orders and journal as local/server-ready domain models, not
as SaaS billing features. This is the product-value validation phase for the
training loop.

Phase 5 can add review and annotation tools if Phase 4 proves the replay
training workflow is useful.

Phase 6 is the earliest phase for real SaaS infrastructure: server-backed
workspace persistence, chart setting templates, imports/exports, auth,
subscription, entitlement, and collaboration-ready hardening.

## Forbidden

- Introducing public login/register before the product training loop is usable.
- Adding subscription/billing before there is validated replay + order + journal
  value.
- Writing new user-owned records as global singletons.
- Letting feature modules couple directly to `localStorage`, fetch market data,
  or bypass repositories/runtimes.
- Designing order, journal, or annotation records without canonical replay time.

## Verification

Until server persistence exists, SaaS readiness is verified through:

- model smoke tests that prove user/workspace ownership;
- boundary smoke tests that prevent feature modules from bypassing runtimes;
- persistence smoke tests that prove repositories can save/restore snapshots;
- replay/order/journal tests, when those phases exist, that prove records remain
  stable under timezone, timeframe, and viewport changes.
