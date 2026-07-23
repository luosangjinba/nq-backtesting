# Session — R6.10a Layout Sync Contract And Crosshair Persistence

Date: 2026-07-22
Status: executable; combined R6.10 interaction gate pending

## Delivered

- added one pure `core.layout-sync-domain` value for Symbol, Interval,
  Crosshair, Time, and Date range with reviewed defaults and exact versioned
  serialization;
- advanced configured Session workspaces to schema version 5, retaining prior
  schemas as lazy migration inputs;
- made Session Store the only durable Layout Sync writer with explicit Session
  identity, revision CAS, reconstruction, and A/B isolation;
- moved the existing Crosshair switch from component-local state into one small
  Replay Workspace projection controller;
- restored accepted Crosshair synchronization after leaving and reopening a
  Session;
- kept Replay and ETH/RTH always Session-wide and kept unimplemented sync
  controls out of production UI.

## Reference Decision

Official Lightweight Charts 5.2 already exposes native Crosshair and visible-
range synchronization primitives. The awesome-tradingview audit found no
multi-chart sync owner compatible with V7's one-way ownership and atomic Pane
replacement. V6 labels/defaults were retained as product evidence; its event
fan-out and local boolean ownership were rejected.

## Automated Evidence

- Layout Sync Domain fixture-backed harness passes seven negative controls;
- Session Store harness passes schema-5 migration, persistence, CAS, and
  Session-isolation checks;
- Layout Sync UI controller harness proves persist-before-project and complete
  last-accepted restoration after a failed write;
- Replay Layout Workspace browser harness proves reviewed defaults, unchanged
  Crosshair behavior, zero Replay/Workspace revision movement, and re-entry
  restoration;
- architecture boundary/hardening, module host, source-quality, full Harness
  suite, and `git diff --check` pass before commit.

## Next Boundary

R6.10b activates Symbol and Interval policies together because both are Pane
Workspace replacement intents. One command must calculate and atomically commit
the complete target Pane set. Time and Date range remain later adapter/Viewport
projection slices.
