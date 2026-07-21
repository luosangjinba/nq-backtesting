# V7 Manual Viewport Span Preservation — R6.7b

Status: implemented; review blocked by separate history-window coverage defect
(2026-07-21)

## Reproduction

In the reviewed two-Pane RTH history flow, rapidly drag toward older bars
several times. Candles can expand until only a few fit the Pane and further
dragging appears inert. Switching to one Pane retains a large empty left region;
history begins extending only after additional irregular chart movement.

## Cause

The durable manual Viewport began with an approximately 80-bar span. When a
closed-session RTH history window added raw coverage but no display candle, its
projected logical `from` remained before the first loaded slot. The adapter
repaired this by clamping only `from` to `-0.5` while keeping the projected
`to`. That transient range could be only about seven bars wide. A subsequent
native capture then promoted the artificial width into canonical `spanBars`,
causing oversized candles and carrying the damage through Pane-count changes.

## Correction

For a left-clamped manual wall, the adapter now translates the entire transient
logical range: `from` becomes `-0.5` and `to` becomes `from + spanBars`. The
canonical user span therefore survives a no-contribution history commit. The
default-wall fallback remains unchanged, and intentional native wheel zoom is
preserved because the algorithm retains the selected span rather than imposing
a fixed minimum.

## Gate

- the adapter plan fixture proves an 80-bar manual range cannot collapse to the
  reviewed approximately seven-bar result;
- the exact RTH browser reproduction performs repeated and rapid alternating
  drags in both Panes and requires at least a 40-bar visible span without
  false-empty Panes or Workspace errors;
- switching from two Panes to one must retain a usable surviving wall, and the
  first deliberate drag must advance the Workspace revision through a real
  history transaction;
- the flow still switches back to ETH successfully; all 37 non-browser and five
  browser gates pass, with Next p95 `62.4ms`, p99 `75.5ms`, max `99.2ms`, `12h`
  RTH replacement about `922ms`, and rapid history with no long task.

## Follow-up Review

The user confirmed the span no longer collapses, then found that a nominal
240-wall-minute request at RTH `09:30` can contain no eligible candle. Repeated
non-contributing requests made the boundary appear to snap back until enough
requests crossed the closure. R6.7c corrects that separate acquisition-window
problem without changing this Viewport correction.
