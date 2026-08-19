# Session — P1c.3/H120 Core SMA Focused Human Acceptance

Date: 2026-08-18

Status: H120 accepted; P1c.3 closed

## Product-Owner Acceptance

After completing the focused production-route review, including the corrected
server state-sync, timeframe replacement, multi-Pane layout return, Session
restore, and New Session paths, the product owner stated:

> H120验收通过，下一步该做什么？

This is the explicit product-owner acceptance required by
`docs/V7_CORE_SMA_P1C3_HUMAN_REVIEW.md`. All ten focused review items are
accepted. H120 advances from `executable` to `accepted`, remains
`humanReviewRequired: true`, and uses this session as its durable
`acceptanceEvidence`.

## Accepted Product Boundary

The accepted product is exactly `first-party.moving-averages@1.0.0` with its
single `SMA(close)@1.0.0` Definition and complete Add, settings, Main/new Region
placement, Replay, persistence/state-sync, unresolved disable/re-enable,
hard-reload, multi-Pane, and Remove loop. The acceptance includes the bounded
post-deployment corrections already recorded in
`session_20260818_p1c_3_core_sma_single_plugin_implementation.md`; it does not
expand the package or admit another algorithm.

H117 remains `executable`, human-review-required, unaccepted, and has
`acceptanceEvidence: null`. P1b.4 remains paused. This acceptance does not
authorize another plugin, a second Moving Average, generic layout code,
Community/Worker execution, the business layer, or the future Line/Circle/Arc
primitive family.

## Evidence And Closure

The accepted H120 evidence includes deterministic SMA length 2/20/500 and
warmup semantics, exact no-future calculation, transactional rollback and CAS,
durable local/server state restoration, disabled-package unresolved survival,
real production-route pixel and interaction checks, one/four-Pane isolation,
timeframe and layout replacement, optional-module removal, and the existing
architecture/writer/source-quality/regression gates. The implementation record
contains the detailed evidence and the post-deployment root-cause corrections.

Recording this acceptance closes only P1c.3. The binding ADR-V7-005 sequence
places a separately specified **generic multi-Plot and layout slice** next:
synthetic oscillator and multi-region references, compatible region sharing,
move-to-existing-region, reorder/resize/collapse, diagnostics, rollback,
restoration, and measured one/four/eight-Pane behavior. It should remain
synthetic and package-neutral so no second real Indicator is smuggled into the
host substrate. A candidate specification, proposed P1c.4/H121 labels, and any
later implementation each require separate product-owner authorization.

## Acceptance-State Verification

Changing H120 in the global Harness registry legitimately advanced the
content-addressed Developer Kit conformance identity. The existing canonical
generator refreshed only the browser release identity and local-lifecycle
example digest to
`sha256:50255ddf0038e61f57dca07576363481df3cc98fc7f85b5725bcc65027c3f0ca`;
the source-quality generator then refreshed only that generated source hash.
No compiler, SDK, schema, catalog, operation, simulator, H117 field, or package
behavior changed.

Post-registration full H120 formula and real-production-route Chromium
evidence, H118, H119, H116, all 54 H117 negative controls and browser/storage/
product evidence, architecture hardening/boundary, production module assembly/
writer closure, source quality, JSON validation, and `git diff --check` pass.
The implementation's passing nine-scenario production matrix remains the
accepted broader regression evidence; this governance-only transition changes
no product runtime code.
