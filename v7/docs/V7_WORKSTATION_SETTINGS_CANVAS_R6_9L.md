# V7 Workstation Settings Canvas — R6.9l

Status: human accepted (2026-07-22)

## Product Boundary

R6.9l activates the Canvas slice frozen by R6.9f and refined by R6.9g. These
fields remain one global durable visual preference shared by every current and
future Pane. They do not become Session data, per-Pane appearance overrides,
Replay intent, or market-data requests.

The complete Settings wire advances from version 4 to version 5. Every accepted
Grid, Symbol, Status-line, and current-price preference migrates unchanged. The
new defaults are:

```json
{
  "canvas": {
    "backgroundColor": "#000000ff",
    "bottomMarginPercent": 12,
    "crosshairColor": "#758696ff",
    "crosshairOpacityPercent": 100,
    "crosshairStyle": "dashed",
    "crosshairWidth": 1,
    "gridVisible": true,
    "rightMarginBars": 12,
    "scaleFontSize": 12,
    "scaleTextColor": "#b8bdc5ff",
    "topMarginPercent": 10
  },
  "interface": {
    "paneControlDockVisibility": "hover"
  }
}
```

The value validates normalized hex-alpha colors, integer opacity `0..100`,
Crosshair width `1..4`, style `solid | dashed | dotted`, scale font size
`8..24`, top/bottom margins `0..50` with a combined maximum of `90`, right
margin `0..100` bars, and dock visibility `hover | always | hidden`.

## Chart And Crosshair Mapping

The Pane-set adapter is the sole chart-presentation fan-out owner. A focused
Canvas presentation mapper converts the committed value into native Lightweight
Charts 5.2 options:

- solid background maps to `layout.background`;
- Grid visibility maps to both horizontal and vertical Grid lines;
- scale text color/font size map to `layout.textColor` and `layout.fontSize`;
- top/bottom percentages map to the Pane's price-scale margins;
- one composed Crosshair color/opacity, native width, and native line style map
  identically to horizontal and vertical Crosshair lines.

The adapter never calls `setData` or `update` for these settings. Replay
truncation retains its existing temporary blue Crosshair while selection is
armed. Exiting or completing selection reapplies the committed user Crosshair,
so neither feature silently wins after its own lifetime.

The reviewed native option path was preferred over another plugin or rendering
owner. The official chart options already cover the bounded fields, and the
awesome-tradingview catalog adds no ownership-compatible Canvas replacement
needed by this slice.

## Interface And Viewport Ownership

Replay Workspace UI owns only DOM visibility for the existing lower-right
Maximize/Restore and Reset View dock:

- `hover` shows it for actual Pane hover or keyboard-visible focus;
- `always` keeps it visible;
- `hidden` removes it from presentation.

This setting does not change active-Pane selection, layout, chart geometry, or
the actions' existing owners.

`rightMarginBars` is not a chart-option shortcut. A separate transactional
Settings consumer routes it to Viewport Runtime as the default used by a newly
created Pane and by explicit Reset View. Saving a new default does not move an
existing chart and never replaces a manual Viewport wall or increments its
revision. This preserves the distinction between durable presentation default
and Pane-local operational intent.

## Transaction And Non-Goals

Canvas, interface, and Viewport-default consumers participate in the existing
stage/apply/persist/commit/rollback transaction. Any rejected consumer or
persistence write restores all already-applied presentation and the previous
Viewport default. A successful Save reaches current Panes, future Panes, hard
reloads, and another Session without moving Replay or an existing manual wall.

The human-review correction makes every valid draft change a live reversible
preview. The Settings owner, not the dialog, stages and applies the complete
candidate to all consumers while keeping durable Settings and their revision
unchanged. A later draft replaces the prior preview atomically. `OK` persists
and commits the already-visible candidate; `Cancel`, close, Escape, backdrop
dismissal, and Workspace disposal roll every previewed consumer back to the
snapshot that was committed when the dialog opened. `Reset` previews defaults
but remains non-durable until `OK`. A persistence read/write or consumer failure
also restores the committed presentation. Replay Workspace DOM presentation is
a formal consumer alongside chart and Viewport consumers; the dialog owns only
draft inputs and dispatches preview/confirm/discard intent.

R6.9l intentionally does not add gradient background, editable Grid color,
Session breaks, watermark, Canvas border, price-scale placement/modes, plus
button, countdown, per-Pane settings, Template, or Apply to all. Timezone, date,
weekday, and 12/24-hour presentation are delivered separately by R6.9m.

## Acceptance Evidence

- `tests/workstation-settings-harness.js` proves strict version-5 values,
  version-1/2/3/4 migration, defaults, Viewport consumer apply/rollback, and
  durable transaction behavior;
- `tests/lightweight-chart-adapter-browser-harness.js` proves real native
  background/Grid/Crosshair/scale/margin mapping, zero series-data mutation,
  and truncation-blue-to-user-Crosshair restoration;
- `tests/viewport-runtime-harness.js` proves changing the right-margin default
  cannot alter a manual intent/revision and that Reset View consumes the new
  default;
- `tests/replay-pane-workspace-browser-harness.js` proves immediate non-durable
  preview, Cancel/close/Escape/backdrop rollback, OK persistence,
  all-current/future-Pane fan-out, a preserved manual wall during preview and
  Save, explicit Reset, hard reload, and cross-Session inheritance;
- `tests/fixtures/replay-workspace/workstation-settings-canvas-dialog.png` is
  the focused dialog visual baseline;
- the full V7 pure-domain and browser Harness suite passes before commit.

Human review accepted the live Canvas styling, reversible preview, Crosshair,
control visibility, price margins, and Reset View durable default on
2026-07-22.
