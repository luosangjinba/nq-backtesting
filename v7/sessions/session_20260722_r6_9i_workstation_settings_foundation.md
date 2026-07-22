# Session — R6.9i Workstation Settings Foundation

Date: 2026-07-22
Status: awaiting human interaction and visual review

## Delivered

- activated one strict versioned global Settings value and separate durable
  record;
- added all-consumer transactional Save with presentation and persistence
  rollback;
- added a professional four-tab modal with draft-only Reset and discard paths;
- activated only Canvas Grid-line visibility;
- routed the committed value through the Pane-set and Lightweight Charts
  adapters to all current and future Panes;
- restored the global value after hard reload and in every Replay Session;
- preserved Replay, Workspace, Pane, series-data, and Viewport ownership.

## Automated Evidence

- Workstation Settings owner Harness passes strict-value, restore, recovery,
  future-consumer, persistence-failure, and consumer-failure cases;
- real Lightweight Charts browser Harness proves grid `applyOptions` without
  series or visible-state revision movement;
- real Replay Workspace browser Harness proves four-tab draft semantics,
  all-Pane application, future-Pane inheritance, hard reload, cross-Session
  persistence, state immutability, and the fixed modal visual;
- architecture, module-host, source-quality, JSON, and diff checks pass before
  commit.

## Human Review Boundary

Review the Settings launcher and modal hierarchy, all discard paths, draft Reset,
immediate all-Pane grid hide/show, future Pane inheritance, hard-reload and
cross-Session persistence, and unchanged Replay cursor/candles. Stop at this
gate before R6.9j activates Symbol controls.
