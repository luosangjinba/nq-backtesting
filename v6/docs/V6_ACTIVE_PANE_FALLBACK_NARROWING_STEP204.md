# V6 Active-Pane Fallback Narrowing - Step 204

## Scope

Step 204 narrows active-pane fallback after Step 203 normalized pane runtime
bootstrap to chart-surface pane ids. It does not add TF UI, indicators, or new
pane controls.

## Audit Result

The remaining `PANE_COMMANDS.GET_ACTIVE` usages split into two categories.

### Removed Compatibility Fallback

These paths receive or derive an exact chart-surface `paneId`, so after Step
203 they no longer fall back to the active pane:

- `chart-entry-manual-next-runtime.js`: manual-next pane lookup after
  normalized `main` / `secondary` / `tertiary` ids.
- `chart-entry-projection-preparation-runtime.js`: display timeframe resolution
  for an initial chart-entry plan that already has a `paneId`.
- `leftward-history-extension-runtime.js`: leftward-history pane lookup for a
  pane-local history request.

If exact lookup fails in those paths, the caller either proceeds with explicit
payload/replay fallbacks where already supported, or fails/ignores the target
pane without silently borrowing active-pane intent.

### Keep Current-Pane Semantics

These paths intentionally operate on the current active pane when no pane id is
provided:

- `display-timeframe-runtime.js`: applying a display timeframe without `paneId`
  means apply it to the active pane.
- `playback-period-runtime.js`: sync mode tracks the active pane by design.

Those are not compatibility fallback paths and should remain unless a future UI
passes explicit pane ids everywhere.

## Acceptance

- Compatibility fallback was removed from exact-pane chart-facing paths.
- Current-pane semantics remain explicit in display-timeframe and playback
  period runtimes.
- Browser coverage confirms `main` still drives HTF projection after fallback
  narrowing.
- Chart browser regression pack and boundary smoke pass.

## Next Direction

After this step, TF UI or indicator work can target pane-local state with a
cleaner assumption: chart-facing paths use exact pane ids, while explicit
current-pane commands still use the active pane intentionally.
