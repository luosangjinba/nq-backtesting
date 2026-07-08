# V6 Multi-Pane Crosshair Readout - Step 154

## Decision

Step 154 accepts multi-pane crosshair OHLC readout isolation.

The visible OHLC readout follows the hovered pane. Chart-surface state still
stores crosshair records by pane, but only events marked `displayReadout: true`
are allowed to update the shell readout. A pane leave/null event only clears the
readout when it belongs to the pane that currently owns the readout.

## Accepted Behavior

- Crosshair state remains pane-local in `workstation-chart-surface`.
- A selected bar in any pane becomes the current readout source.
- A null crosshair event from a non-current pane does not clear or overwrite the
  visible readout.
- A null crosshair event from the current readout pane clears OHLC to
  `O -- H -- L -- C --`.
- `status-readout` ignores `chartSurface:crosshairChanged` payloads with
  `displayReadout: false`.
- Chart-engine remains the only owner of chart series writes.

## Coverage

- `multi-pane-crosshair-readout-step154-smoke.js` proves pane-local crosshair
  state, hovered-pane readout selection, and non-current pane null suppression.
- `multi-pane-crosshair-readout-browser-step154-smoke.js` proves real browser
  multi-pane chart hosts update the readout from the hovered pane without
  retaining the prior pane's OHLC.
- Step 153 browser coverage still proves the single-pane crosshair OHLC path.
- Step 147 multi-pane chart-surface coverage still proves pane-local chart data
  and viewport projection behavior.

## Next Direction

Step 155 should harden multi-pane leftward historical extension isolation. Keep
each pane's canvas-left request boundary and exhausted-history memory isolated,
while preserving replay speed, chart-data ownership, and chart-engine series
writes.
