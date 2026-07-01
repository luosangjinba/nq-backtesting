# V5 Session Handoff - Step 416 Candle Style Settings

Date: 2026-07-01

## Status

Step 416 is complete.

## Goal

Make Chart Settings control real candle body, border, and wick colors while
preserving V5 runtime ownership boundaries.

## Changes

- Added `candleStyle` defaults to chart presentation contracts with up/down
  body, border, and wick colors.
- Extended chart presentation runtime normalization so candle colors are
  validated as `#rrggbb` values and merged with existing settings state.
- Added Settings `Symbol` section controls for candle `Body`, `Borders`, and
  `Wick` color pairs.
- Kept Settings draft semantics: color inputs update route-local draft state
  until `Ok`; cancel/close still discards edits.
- Carried candle style through chart runtime display context.
- Applied candle style in the chart-engine adapter:
  - Lightweight candlestick series receives color options on creation and
    presentation updates;
  - DOM fallback records color metadata and uses the configured body/border
    colors for fallback candles.
- Updated presentation, adapter, and browser smokes for candle style behavior.

## Invariants

- UI dispatches presentation/display-context commands and does not call chart
  engine series APIs directly.
- Chart runtime remains the only writer of chart series.
- Presentation changes do not mutate replay cursor, reveal state, display bars,
  bar-data cache, or loaded windows.
- Bar data runtime remains the only requester/cache owner for bars.
- Replay runtime remains the only owner of replay cursor and reveal state.
- The chart route still exposes one active pane: `primary`.

## Verification

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Candidates

- Continue chart Settings expansion with grid/crosshair style controls.
- Continue setup route visual cleanup before layout split panes.
- Keep split-pane layout deferred until single-pane chart infrastructure is
  stable and visually acceptable.
