# Step 398 - Active-Pane Date Locator Slice Selection

Status: selected.

## Selected next slice

Step 399 - Active-Pane Loaded-Window Date Locator.

Add one visible workstation Go-to-time control that accepts a date/time,
resolves it against the active pane's already-loaded chart data, and applies a
manual viewport projection centered near the nearest existing bar.

## Why this slice

- It closes the only observable gap found in the five foundation journeys.
- It tests the suitable existing Lightweight Charts approach before adding a
  custom missing-window workflow.
- It is bounded: no backend/schema work and no full session-range preload.
- It preserves replay cursor/source reveal authority; navigation changes the
  viewport only.

## Ownership

- Shell control validates draft input and dispatches an intent only.
- A focused date-locator coordinator resolves active pane context and asks
  Chart Data for the current record.
- A pure domain helper selects the nearest loaded bar and target logical range.
- Chart Viewport/Chart Surface applies the projection through its existing
  public boundary and Lightweight Charts `setVisibleLogicalRange` path.
- Shell and coordinator must not import the Lightweight Charts adapter or call
  time-scale APIs directly.

## Explicit non-goals

- No fetch when the requested time is outside the loaded window.
- No replay cursor mutation, reveal-state change, or auto-play restart.
- No full date-range load.
- No cross-pane feature-module control. Existing layout sync may observe normal
  surface range events, but Step 399 does not add a new sync mechanism.
- No copy of the V5 Chart Runtime ownership model.

## Step 399 acceptance gate

1. Visible control opens, validates, submits, and reports outside-window input.
2. Loaded-window input selects the nearest real bar; no synthetic timestamp.
3. Active pane enters manual viewport mode at the selected range.
4. Replay cursor and source bars are unchanged.
5. Browser coverage proves main/secondary active-pane isolation.
6. Bar Data receives zero requests for the loaded-window success path.

After Step 399, re-audit whether Step 400 should add bounded missing-window
loading or whether the loaded-window locator already solves the common workflow.
