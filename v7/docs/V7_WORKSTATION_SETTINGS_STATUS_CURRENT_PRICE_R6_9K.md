# V7 Workstation Settings Status And Current Price — R6.9k

Status: accepted by human interaction and visual review (2026-07-22); font-size
acceptance correction implemented, human recheck pending (2026-08-05)

## Product Boundary

R6.9k activates the Status line and current-price slice frozen by R6.9f and
refined by R6.9g. These remain one global durable visual preference shared by
every current and future Pane. They are not Session data, Pane operational
state, Replay intent, or market-data requests.

Compact symbol and timeframe provenance remain visible and cannot be disabled.
The active controls and defaults are:

```json
{
  "currentPrice": {
    "lineVisible": true,
    "nameVisible": true,
    "valueVisible": true
  },
  "paneReadout": {
    "changeVisible": true,
    "fontSize": 12,
    "ohlcVisible": true,
    "volumeVisible": false
  }
}
```

The complete Workstation Settings wire advances from version 3 to version 4.
Version-1 Grid, version-2 opaque candle, and version-3 hex-alpha records migrate
deterministically while retaining every accepted earlier preference.

## Status-line Mapping

The Pane overlay is the sole owner of symbol, timeframe, OHLC, change, and
Volume DOM. Existing selected/latest Crosshair semantics are unchanged:

- `ohlcVisible` hides only the four OHLC values;
- `changeVisible` hides only absolute and percentage bar change;
- `fontSize` scales the complete product-owned readout from 10px through 18px,
  defaults to 12px, and adjusts the overlay height without changing the chart;
- `volumeVisible` reveals the accepted bar's source or aggregate Volume;
- finite Volume is formatted compactly, while explicit unknown `null` is
  rendered honestly as `Vol —` and never coerced to zero;
- symbol and timeframe remain visible in every combination.

The Pane grid applies the same committed presentation and shared price formatter
to every mounted overlay and to an overlay created later.

The 2026-08-05 acceptance correction advances the current Settings wire from
version 6 to version 7. Existing version-1 through version-6 records migrate to
the 12px default without changing any accepted visual or time preference.
Official Lightweight Charts documentation limits `layout.fontSize` to scale
text, and the awesome-tradingview catalog offers no compatible status-line
typography plugin, so the existing DOM overlay remains the correct owner.

## Current-price Mapping

The Lightweight Charts adapter is the sole chart/series presentation writer.
It maps the independent controls as follows:

| Name | Value | Line | Presentation |
| --- | --- | --- | --- |
| off | off | off | no label, no line |
| off | off | on | line only |
| off | on | off | numeric value only |
| off | on | on | numeric value and line |
| on | off | off | symbol-only axis label |
| on | off | on | symbol-only axis label and line |
| on | on | off | symbol plus numeric value |
| on | on | on | symbol plus numeric value and line |

Native `title`, `lastValueVisible`, and `priceLineVisible` options implement the
six combinations where Name is off or Value is on. The two Name-on/Value-off
combinations use one bounded adapter-owned series primitive which contributes
only a price-axis view. It reads the accepted series' latest close and candle
direction, owns no bars, and cannot call `setData` or `update`.

The Pane-set adapter resolves the compact symbol label from foundation
Instrument metadata and passes it explicitly. Opaque ids such as
`instrument.cme.nq` are never parsed as display text by the chart adapter.

## Transaction And Invariants

The existing Workstation Settings stage/apply/persist/commit transaction is
unchanged. Save fans one complete value to the Pane-set chart consumer and Pane
overlay consumer. Any rejection restores the prior presentation. A successful
Save cannot increment Replay, Workspace, Pane, Viewport, bar-count,
series-data, or chart-visible receipt revisions.

Reset changes only the authoritative dialog draft. The later R6.9l review
correction previews valid draft changes through reversible consumer stages;
Cancel, close, Escape, and backdrop dismissal restore the committed
presentation. A committed value survives hard reload, another Session, and
future Pane creation.

## Acceptance Evidence

- `tests/workstation-settings-harness.js` proves strict version-4 values,
  version-1/2/3 migration, defaults, invalid visibility rejection, durable
  restore, and atomic consumer rollback;
- `tests/lightweight-chart-adapter-browser-harness.js` proves all eight
  Name/Value/Line combinations against real Lightweight Charts 5.2 without a
  series-data revision;
- `tests/replay-pane-workspace-browser-harness.js` proves Status and current-
  price draft/Save behavior, finite Volume, current/future Pane fan-out, hard
  reload, cross-Session restore, and unchanged Replay/Workspace revisions;
- `tests/replay-layout-workspace-browser-harness.js` proves explicit unknown
  Volume formatting and retains all accepted Canvas-overlay behavior;
- `tests/fixtures/replay-workspace/workstation-settings-status-dialog.png` and
  `workstation-settings-current-price-dialog.png` are the focused visual
  baselines;
- the full V7 pure-domain and browser Harness suite passes before commit.

Human interaction and visual review accepted this slice on 2026-07-22.
