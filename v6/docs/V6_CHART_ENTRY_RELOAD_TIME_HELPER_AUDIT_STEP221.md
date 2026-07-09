# V6 Step 221 - Chart Entry / Reload Time Helper Readiness Audit

## Decision

Step 221 is an audit step, not an implementation step.

The next migration should continue the same time-domain consolidation line, but
only after the remaining chart-entry, pane-intent-reload, and layout-bootstrap
timestamp conversions are classified by ownership and input semantics.

## Why This Matters

V6 is still in chart foundation work for an SMC/ICT-focused backtesting and
journal workstation. The current priority is reliable K-line loading, timeframe
switching, replay, multi-pane behavior, date ranges, and chart dragging before
indicators, overlays, or trading simulation.

Steps 215 through 220 consolidated projection, bar-data, replay, pane,
viewport, and history time helpers. The remaining high-risk conversions are now
mostly in chart-entry and reload orchestration. These paths decide which bars
are projected, appended, or copied into panes, so changing them without a file
level plan can reintroduce the same kind of 5m/15m drift that caused the
leftward-extension failures.

## Classification

| File | Current conversion | Input semantics | Correct next helper/API | Owner boundary |
| --- | --- | --- | --- | --- |
| `v6/src/chart-entry/chart-entry-projection-preparation.js` | `parseCursorTimestamp` uses `new Date(...).valueOf() / 1000` | external replay cursor time text | `normalizeUnixSeconds` behind a chart-entry wrapper | pure chart-entry preparation owns cursor lookup, not generic parsing |
| `v6/src/chart-entry/chart-entry-projection-preparation-runtime.js` | `parseCursorTimestamp` and `parseOptionalTimestamp` use `new Date(...).valueOf() / 1000` | external replay/session time text | `normalizeUnixSeconds` / `normalizeOptionalUnixSeconds` | projection preparation runtime owns dispatch and state only |
| `v6/src/chart-entry/chart-entry-manual-next-runtime.js` | `normalizeTimeframeMinutes`, `parseReplayTimestamp`, and direct cursor timestamp math | minute TF labels plus replay time text | `normalizeMinuteTimeframe`, `normalizeUnixSeconds`, `summarizeProjectionSource` | manual-next runtime owns append orchestration, not TF/time parsing |
| `v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js` | `cursorTimestampFromWindow`, `normalizeTimeframe`, `parseOptionalTimestamp` | bar-data window API minute strings, integer TFs, optional session time text | `normalizeUnixSeconds`, `normalizeMinuteTimeframe({ allowSuffix: false })`, `normalizeOptionalUnixSeconds`, `summarizeProjectionSource` | pane-intent reload owns reload application, not timestamp parsing |
| `v6/src/layout/layout-pane-bootstrap-runtime.js` | `timestampFromReplayState` uses number passthrough or `new Date(...).valueOf() / 1000` | replay state may already carry seconds or time text | `normalizeUnixSeconds` behind a layout-local optional wrapper | layout bootstrap owns visible pane copy/viewport wiring only |

## Migration Order

1. Step 222: migrate `chart-entry-projection-preparation.js` and
   `chart-entry-projection-preparation-runtime.js`.
   - These are the smallest chart-entry surface.
   - Preserve prepared payloads, projection dispatch payloads, and error text.
2. Step 223: migrate `chart-entry-manual-next-runtime.js`.
   - This file mixes TF parsing, replay timestamp parsing, cursor bar picking,
     and projection-source summary.
   - Migrate through local wrappers first, then swap internals to `time-domain`.
3. Step 224: migrate `pane-intent-reload-chart-data-runtime.js`.
   - Preserve loaded-window cursor selection and reload replacement payloads.
   - Do not alter projection conditions or replacement ordering.
4. Step 225: migrate `layout-pane-bootstrap-runtime.js`.
   - Preserve numeric replay timestamps as seconds.
   - Preserve fallback to source record latest bar timestamp.

## Non-Goals

- Do not change chart-entry, manual-next, reload, or layout behavior in Step
  221.
- Do not add new TFs, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading/order tickets, prop firm rule engines, or pseudo-live simulation.
- Do not move chart series writes, replay cursor ownership, bar-data requests,
  projection ownership, viewport intent, or pane state into shell or route code.
- Do not change database query shape, bar-data cache keys, boundary metadata,
  or leftward-history request windows.

## Acceptance

- Remaining chart-entry/reload/layout timestamp conversion sites are documented
  with file-level references.
- Each site is classified as external text parsing, known millisecond
  serialization, chart-bar seconds, or replay-state seconds/text.
- Step 222 has a bounded implementation target.
- Static smoke coverage prevents this audit from going stale before the
  migration begins.
