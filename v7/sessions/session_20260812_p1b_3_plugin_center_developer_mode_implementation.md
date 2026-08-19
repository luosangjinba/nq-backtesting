# Session — P1b.3 Plugin Center And Developer Mode Implementation

Date: 2026-08-12

Status: implementation and automated evidence complete; focused human review
pending; H117 executable and unaccepted

## Authorization And Boundary

The product owner instructed `授权 P1b.3 Plugin Center 与 Developer Mode。`
This authorized only the third decomposition in the accepted P1b specification.
No P1b.4 MCP adapter, external execution, activation, Worker, registry,
Marketplace, or H117 acceptance was inferred.

## Delivered

- Extended the existing host-rendered Plugin Center with distinct Included,
  Installed, and Developer Mode surfaces. Core profile control, local installed
  inventory, and session development generations remain separate owners.
- Added Install from file inspection and pre-write review with explicit local
  source, self-asserted publisher, signature-not-applicable, verified-integrity,
  inactive-status, retention, settings, compatibility, cancellation,
  confirmation, commit-failure retry, and Restricted Mode recovery copy.
- Added browser-compatible canonical hashing, strict deterministic ustar
  parsing/packing, current receipt/compatibility checks, and exact prepared-
  candidate inspection without importing or evaluating package payloads.
- Added an off-by-default, device-local, unsynchronized and visibly marked
  Developer Mode. It owns only selected browser handles, a local preference,
  strict double snapshots, and session-scoped `developer-inactive` generations.
  Load, Reload, Validate/Pack, Unload, and disabling are all explicit; there is
  no watcher, HMR, automatic install, activation, or lifecycle contribution.
- Composed the package store/storage and browser adapter in the production
  session application without moving Core profile or ModuleHost ownership.
  Closing the application disposes the store, storage, browser handles, and UI
  subscriptions.

## H117 Evidence Added Without Acceptance

- Preserved the 18 P1b.1 contract/archive and 18 P1b.2 transaction/recovery
  negative groups, then added 18 P1b.3 controls for suffix/size/mode/root/source
  workspace/symlink/special/path/resource/snapshot/receipt/concurrency/reload/
  validate-pack/cancellation/disposal failures. H117 now freezes 54 groups.
- Proved a real current P1a package can be inspected equivalently from its
  deterministic archive and exact prepared entries, reloaded atomically,
  packed byte-identically, unloaded, and disabled without install or execution.
- Added a real-Chromium product flow over the actual contract inspector,
  package store, IndexedDB adapter, browser adapter, and Plugin Center controls.
  It covers install review/cancel, injected commit failure and retry, inactive
  detail, picker cancellation, sanitized Restricted Mode recovery, Developer
  load/reload/pack/unload/disable, keyboard focus, accessibility, reduced motion,
  painted pixels, and 620 px no-overflow behavior.
- Added a fresh-profile headed review fixture and exact checklist in
  `docs/V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md`. That artifact is prepared,
  not acceptance evidence.

## Ownership And Security Result

The package store remains the sole local installed-inventory writer, the
IndexedDB adapter remains the sole persistence writer, the Core profile remains
independent, and `adapter.plugin-center-ui` remains the sole Plugin Center DOM
owner. Browser package inspection accepts only regular file/directory handles,
bounded canonical entries, and exact current receipts. It never receives a
filesystem path, follows a declared link, loads source workspaces, evaluates
package HTML/CSS/ESM/TypeScript, or creates a ModuleHost descriptor.

## Verification

- `node v7/tests/local-plugin-package-harness.js` passes H117 with 54 negative
  groups plus real Chromium storage and product evidence.
- P1a/H116, P0b/H115, ModuleHost, production application composition,
  architecture, writer closure, source quality, and the standing production
  regression gates pass with their accepted behavior preserved.
- The 118 top-level Harness inventory has 116 passes. The only two non-zero
  exits are the exact pre-existing H091 Replay Workspace and mixed-Pane visual
  fixtures; the nine-scenario production matrix itself passes and reproduces
  its two inventoried visual findings without a new failure. A transient Chrome
  profile cleanup race was rerun independently and passed after its cleanup
  adopted the repository's bounded async retry pattern.
- The exact production graph contains 68 modules, 150 dependency edges, 133
  construction sites, 27 observed writer sites, and zero blocking findings.
  Source evidence contains 582 files, 52,613 effective lines, 5,473 functions, and 558 public exports with no size/function exception or finding.
- `git diff --check` passes. No accepted visual baseline was re-recorded.

## Open Human And Product Gates

Run `node v7/scripts/review-local-plugin-package-p1b3.mjs` and use the focused
checklist. A product-owner pass or exact rejection must be recorded before the
P1b.3 visible review is treated as closed. H117 still has no acceptance
evidence. P1b.4 authoring MCP and complete H117 closure require a new explicit
authorization even after this human review passes.
