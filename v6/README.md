# V6

## Development

V6 owns its JavaScript module boundary and dependency declaration in
`v6/package.json`. Run commands from `v6/`:

```bash
npm run test:boundary
npm run test:foundation
```

The browser route still uses the checked-in Lightweight Charts 5.2.0 asset
during the current no-build foundation phase. Moving that asset out of the V5
legacy directory is tracked as a packaging cleanup and does not change chart
ownership.

V6 is the clean replay-chart rewrite opened after V5 proved the product shape
but exposed a hard viewport/manual-anchor architecture blocker.

V6 should reuse stable backend/data services and selected V5 lessons, but it
must not port V5's chart viewport internals.

## Purpose

- Build the FX Replay workstation around a single explicit viewport-intent
  model.
- Make initial replay wall and user-created temporary wall the same primitive.
- Keep replay cursor, data loading, viewport intent, and chart-engine adapter
  responsibilities separate enough that one path cannot silently erase another.
- Establish executable tests before rebuilding broader workstation features.

## Required First Reads

1. `v6/docs/INDEX.md`
2. `v6/docs/V6_ARCHITECTURE.md`
3. `v6/docs/V6_EXECUTION_ROADMAP.md`
4. `v6/docs/specs/replay-viewport-intent.md`
5. `v6/docs/specs/replay-visible-latency.md`
6. `v6/docs/specs/pane-model.md`
7. `v6/docs/specs/fxreplay-baseline.md`
8. `v6/TODO.md`
9. `v5/docs/specs/v6-rewrite-start-decision.md`

## Hard Rules

- Replay runtime owns cursor/reveal/session state only.
- Bar data runtime owns requests/caches only.
- Chart viewport runtime owns follow/manual viewport intent only.
- Chart engine adapter translates intent to engine API calls only.
- Display-window loading must not overwrite viewport intent.
- Bar append/replace must not decide viewport mode.
- UI dispatches commands and subscribes to events.

## V5 Usage

V5 is reference and negative evidence. Do not copy V5's chart-runtime,
replay-display-window, viewport-demand, or Lightweight logical-range ownership
model into V6.
