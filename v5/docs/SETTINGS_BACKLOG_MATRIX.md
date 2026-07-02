# V5 Settings Backlog Matrix

This matrix keeps FXReplay-style settings staged by ownership boundary. It is a
planning guardrail, not a UI checklist to implement all at once.

## Categories

- `presentation-runtime`: normalized by chart presentation runtime and applied
  through chart display context to the chart-engine adapter.
- `chart-engine-contract`: needs an explicit adapter/runtime contract before UI.
- `replay-runtime-contract`: affects replay cursor, reveal state, or session
  time semantics and must be owned by replay runtime.
- `deferred-persistence`: needs saved templates/presets or workspace storage
  design before implementation.
- `future-pane`: blocked until split-pane and pane ownership are designed.

## Matrix

| Setting | Owner | Status | Notes |
| --- | --- | --- | --- |
| Candle body/border/wick colors | presentation-runtime | implemented | Draft UI applies through presentation runtime only. |
| Grid visibility/colors | presentation-runtime | implemented | Canvas metadata and Lightweight options are adapter-owned. |
| Crosshair visibility/colors/label background | presentation-runtime | implemented | Crosshair readout remains chart-owned. |
| Time/date label format | presentation-runtime | implemented | Display-only; does not mutate canonical timestamps. |
| Status line title/OHLC/change/readout toggles | presentation-runtime | implemented | Route renders from presentation state. |
| Canvas margins/right offset/background | presentation-runtime | implemented | Right offset remains display range spacing, not replay cursor. |
| Price/time scale visibility and borders | presentation-runtime | implemented | Adapter owns Lightweight scale options. |
| Watermark text/color/size | presentation-runtime | implemented | Adapter-owned chart decoration. |
| Price scale side | presentation-runtime | implemented in Step 429 | `right`/`left`; hidden state still uses price scale visibility. |
| Scale placement beyond side | chart-engine-contract | planned | Requires explicit mapping for multiple scales and future panes. |
| Lock price-to-bar ratio | chart-engine-contract | planned | Needs chart-engine behavior contract and acceptance harness. |
| No-overlap labels | chart-engine-contract | planned | Needs label ownership and collision rules. |
| Countdown to bar close | replay-runtime-contract | planned | Depends on replay clock semantics and active interval. |
| Session breaks | replay-runtime-contract | planned | Requires exchange/session calendar contract and bar gaps policy. |
| Templates/presets | deferred-persistence | planned | Needs workspace persistence and reset/overwrite rules. |
| Pane-specific settings | future-pane | deferred | Requires split-pane ownership and sync design first. |

## Implementation Rule

Only `presentation-runtime` rows may be implemented directly from Settings UI
without a new runtime contract. All other rows need a planning step that states
the owner, command/event surface, adapter behavior, and smoke acceptance before
UI controls are added.
