# Workspace State Sync Policy

Date: 2026-06-24

Purpose: define which V4 browser-local state should sync through the default-user server workspace, and which state should remain device-local unless a later product decision changes it.

## Policy

Server workspace data must be user-private research/workspace content that should follow the user across computers.

Device-local data is browser workflow state, recent history, or machine-specific UI convenience that can differ across computers without corrupting research records.

The current server workspace foundation is:

```text
user_id = default
workspace_id = default
storage = v4/data/users/default/workspaces/default
```

## Server-Backed Now

These domains are already server-backed with localStorage fallback and best-effort sync.

| Domain | Scope | Reason |
| --- | --- | --- |
| `display-preferences` | workspace | User preference that should feel consistent across devices. |
| `pda-annotations` | instrument | Core research object. |
| `market-segments` | instrument | Core research object, including segment groups. |
| `order-reviews` | instrument | Core review object. |
| `live-records` | instrument | Core execution/review object. |
| `chart-notes` | instrument | User research annotations. |
| `daily-time-reviews` | instrument | User review content. |
| `time-overlays` | instrument | User-defined time lines and killzones. |
| `economic-event-notes` | instrument | User event review notes. |
| `entry-context-catalog` | workspace | Shared catalog across instruments. |
| `import-batches` | workspace | Audit trail for Review JSON and generated archive imports. |
| `date-range-history` | workspace | Recent load ranges are useful across devices during the same review workflow; localStorage remains the fallback. |

## Keep Device-Local For Now

These should remain local unless a later step explicitly promotes them.

| Storage key | Current owner | Reason |
| --- | --- | --- |
| `v4:primary-instrument` | `primary-instrument-store.js` | Startup convenience; changing it on one computer should not surprise another computer. |
| `v4:display-mode:<instrument>` | `display-mode.js` | Fast visual filter state; can vary by screen/workflow. |
| `v4.replayHistory` | `replay-history-store.js` | Recent navigation history, not canonical research data. |
| `v4:comparison-window:workspace` | `comparison-window-persistence.js` | Pane/window layout is still actively changing; keep local until pane model stabilizes. |
| `v4:chart-pane-labels` | `chart-pane-store.js` | Pane naming is layout preference; migrate together with pane/workspace layout later. |

## Promote Later

These are good candidates after the two-pane model stabilizes:

- Pane layout and custom pane names.
- Active pane instrument/timeframe defaults.
- Comparison/pane workspace preferences.
- Optional replay workspace sync if it becomes a saved workspace concept instead of a recent-history concept.

## Rules For New State

- New review objects default to server-backed workspace domains.
- New UI layout state defaults to device-local until it has a stable schema and clear cross-device value.
- New histories and MRU lists default to device-local.
- Any server-backed domain must have an explicit allowlist entry in `v4_api.py`.
- Any server-backed domain must preserve localStorage fallback until full multi-user login and migration tooling exist.
