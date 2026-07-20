# V7 R4.4 Viewport Runtime Intent — 2026-07-20

## Boundary Decision

Activate the pure intent/projection foundation of `core.viewport-runtime`
before wiring a real chart. The canonical product value stores a pane-local
replay wall as offset/span semantics under an explicit Session activation; it
does not store a chart adapter's logical `from`/`to` range.

## V6 Disposition

Retain default/manual wall behavior, native logical-range measurement, stable
wall across Next/Play, and explicit Reset/Follow. Reject chart-data-driven
intent changes, time-range reconstruction, event-cascade completion, and route
ownership. No V6 source was imported or copied.

## Automated Gate

- Viewport Runtime Harness with 13 negative controls;
- Session/activation/pane isolation and branded immutable values;
- stable default/manual wall projection across Replay cursor and logical-index
  movement;
- explicit manual capture/reset revisions and data-independent intent;
- architecture writer inventory, public acyclic dependencies, source quality,
  full V7 Harness suite, and `git diff --check` before commit.

H014 is executable but remains pending the real browser interaction gate. H041
accepts the pure headless contract only.

## Human Review

Not required for R4.4 because there is no interaction or visual change. The
first real Lightweight Charts slice must stop after implementation for manual
interaction and visual review.
