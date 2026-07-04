# Step 512 - Multi-Pane Contract Smokes

Date: 2026-07-04

## Goal

Add executable browser coverage for the multi-pane rebuild contract before
rewriting production code.

## Substeps

### Step 512.1 - Smoke Strategy

- Document that Step 512 can add strict contract smokes that fail against the
  current production implementation.
- Keep production code unchanged in this step.
- Use the failing smoke as the target for Steps 513-516.

### Step 512.2 - Layout Expansion Contract Smoke

- Add a browser smoke that creates a replay session, opens each supported
  `twice.*` and `triple.*` variant from single pane, and records:
  - expected initial active pane;
  - actual active pane;
  - mounted pane count;
  - every-pane rendered bar count;
  - `fullBarCount > 0 && renderedBarCount === 0` failures.

Status: completed. `multi-pane-rebuild-contract-browser-smoke.js` currently
fails against production as intended, exposing missing triple initial
active-pane policy:

- `triple.vertical`: expected `tertiary`, got `primary`;
- `triple.left`: expected `secondary`, got `primary`;
- `triple.bottom`: expected `secondary`, got `primary`.

### Step 512.3 - Reset And Immediate Next Contract Smoke

- Extend the same smoke to assert:
  - reset view keeps every pane visibly rendered;
  - immediate `Next` after layout expansion advances every same-timeframe pane;
  - no pane becomes rendered-empty after `Next`.

## Status

In progress.
