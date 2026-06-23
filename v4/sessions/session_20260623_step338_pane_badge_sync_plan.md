# Step 338 - Unified Pane Badge and Sync Placement

## Goal

Make the two-pane chart chrome consistent and less intrusive:

- Both panes show the same lightweight `Symbol TF` badge.
- Pane-level `Sync/No Sync` controls move away from the right price axis.
- Active pane focus remains represented by the pane border, not by the sync button.

## Step Plan

### Step 338.1 - Unified pane badge

- Add a shared pane badge DOM for primary and comparison panes.
- Show each pane's current `Instrument TF` in the badge.
- Hide the old comparison-only info label in pane mode to avoid duplicate labels.
- Move OHLC legends below the badge where needed.
- Verify both panes expose consistent badge text and toolbar pane switching still updates it.

Status: complete.

Implementation:

- `chart-pane-dom.js` now creates `[data-pane-badge]` for Pane 1 and Pane 2.
- Badge text is derived from pane store `instrument/timeframe` and updates on `chart-panes:changed`.
- Pane mode hides the old `#comparison-chart-info` visual label while keeping the DOM text for existing compatibility tests and chart manager updates.
- Main OHLC legend moves below the badge in two-pane layout.

Verification:

```bash
node --check v4/src/chart-panes/chart-pane-dom.js
node --check v4/tests/comparison-window-browser-smoke.js
git diff --check
node v4/tests/comparison-window-browser-smoke.js
```

Result: passed. Node emitted the existing typeless-package warning for the ES module smoke test.

### Step 338.2 - Move Sync into pane badge

- Move existing pane-level `Sync/No Sync` button into the shared badge.
- Remove the right-edge floating sync button position so price axes remain unobstructed.
- Keep existing pane sync store semantics unchanged.
- Verify both sync buttons are inside badges, can both be `No Sync`, and no sync control overlaps the right price scale.

Status: complete.

Implementation:

- `ensurePaneSyncButton()` now appends or moves each pane sync button into that pane's badge.
- `.chart-pane-sync-toggle` is now a static pill inside the badge instead of an absolute top-right button.
- Existing click behavior, active-pane update, and pane sync store semantics are unchanged.
- Browser smoke asserts both sync buttons live inside `[data-pane-badge]`, stay in the left badge area, can both toggle to `No Sync`, and restore to `Sync`.

Verification:

```bash
node --check v4/src/chart-panes/chart-pane-dom.js
node --check v4/tests/comparison-window-browser-smoke.js
git diff --check
node v4/tests/comparison-window-browser-smoke.js
```

Result: passed. Node emitted the existing typeless-package warning for the ES module smoke test.

## Closeout

Step 338 is complete. The two-pane layout now has consistent left-top pane chrome:

- Pane 1 and Pane 2 both show `Symbol TF`.
- Pane-level `Sync/No Sync` is colocated with the pane identity badge.
- No pane sync control sits near the right price axis.

## Verification

Planned checks:

```bash
node --check v4/src/chart-panes/chart-pane-dom.js
node --check v4/tests/comparison-window-browser-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```
