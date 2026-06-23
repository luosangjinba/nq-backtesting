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

## Verification

Planned checks:

```bash
node --check v4/src/chart-panes/chart-pane-dom.js
node --check v4/tests/comparison-window-browser-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```
