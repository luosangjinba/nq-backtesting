# Step 513 - Layout Active-Pane Policy

Date: 2026-07-04

## Goal

Make layout runtime choose the requested initial active pane for every supported
layout variant when expanding from single pane.

## Scope

In scope:

- add layout-runtime unit coverage for variant active-pane policy;
- implement an explicit variant-to-active-pane policy helper;
- make Step 512's multi-pane rebuild contract smoke pass its current triple
  active-pane failures.

Out of scope:

- pane display lifecycle rebuild;
- replay pane projection;
- chart runtime changes;
- chart adapter changes;
- UI layout visual changes.

## Plan

### Step 513.1 - Documentation

- Record that Step 513 is layout-runtime only.
- Keep chart/replay/pane lifecycle work deferred to Steps 514-516.

### Step 513.2 - Runtime Smoke

- Extend `layout-runtime-smoke.js` to assert expected active pane for each
  supported variant when expanding from `single.default`.

Status: completed. The new unit coverage currently fails as intended on
`triple.vertical`, which still chooses `primary` instead of `tertiary`.

### Step 513.3 - Implementation

- Replace fallback-only `preferredActivePaneForVariant()` with a tested policy
  table.
- Preserve existing active pane when switching among multi-pane layouts and the
  previous active pane still exists.
- Run the Step 512 browser contract smoke and related layout/multi-pane smokes.

## Status

In progress.
