# Step 409 - Settings Transaction And Durability Selection

Status: selected as the next bounded Phase 7 implementation slice; production
implementation has not started.

## Why This Comes Next

Step 407/408 replay navigation and fixed-timeframe alignment passed automated
and human acceptance. The remaining Phase 7 work includes Settings parity and
persistence before Free Practice or Validation product workflows expand.

The current Settings surface is not yet a safe foundation for another user
preference:

- each field change immediately dispatches `SETTINGS.UPDATE`;
- Cancel, close, and Escape only hide the modal, so they cannot discard edits;
- Settings state is memory-only and is lost on reload;
- `displayTimezone`, `showWatermark`, `chartGrid`, and `theme` have no
  production consumers of `SETTINGS_EVENTS`;
- the visible `showWatermark` field is labelled as a different candle-color
  behavior, while grid and theme are hidden runtime fields.

Adding `timeFormat` directly to this surface would make a fifth preference
appear to exist before Settings has transactional UI semantics, durable state,
or a consumer boundary.

## Existing Capability Check

Lightweight Charts already exposes the chart-rendering hooks required by the
following time-presentation step:

- `LocalizationOptions.timeFormatter` formats the time-scale crosshair label;
- `TimeScaleOptions.tickMarkFormatter` formats time-axis tick labels;
- `applyOptions` lets the chart adapter update those options without a custom
  chart primitive.

Official references:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LocalizationOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScaleOptions
- https://github.com/tradingview/awesome-tradingview

The awesome-tradingview ecosystem lists official plugin examples, indicators,
wrappers, and a visible-range utility. It does not provide an application-wide
Settings owner, transactional settings modal, durable preference repository,
or controlled 12/24-hour time input. V6 should use the official chart formatter
hooks behind its chart adapter and retain application Settings ownership.

## Step 409 Decision

Implement **Settings Transaction And Durable Preference Foundation** through
the existing Settings boundary.

### 1. One Settings owner

- UI dispatches Settings commands and subscribes to Settings state/events.
- The Settings runtime owns validation, committed state, hydration, updates,
  reset behavior, and persistence coordination.
- UI and feature modules must not read or write `localStorage` directly.
- Reuse the existing persistence repository/Web Storage adapter through an
  injected port when suitable; do not create another ad-hoc storage schema in
  the panel.

### 2. Transactional modal draft

- Opening Settings snapshots committed state into a panel-local draft.
- Field edits update only that draft.
- Cancel, close, backdrop close, and Escape discard the draft.
- OK validates and submits one atomic Settings update, then closes on success.
- Reset changes the draft to model defaults; it does not persist until OK.
- Reopening always begins from the latest committed Settings snapshot.

### 3. Durable, versioned record

- Hydrate before the first Settings snapshot is presented.
- Persist only normalized committed records.
- Define a versioned record and deterministic migration/default behavior.
- Missing, malformed, or unavailable storage falls back through the Settings
  model and must not prevent workstation startup.
- A failed write leaves the last committed in-memory state usable and emits an
  observable failure rather than making UI code repair storage.

### 4. Honest surface

Step 409 must audit every currently rendered field against a real consumer.
Fields with no production consumer must not be presented as working controls:
either connect them through an explicit owning adapter in the same bounded
step, or keep them out of the active surface until their consumer is selected.
The mislabeled `showWatermark` control cannot remain as-is.

### 5. Explicitly deferred from Step 409

Do not add `timeFormat`, replace all workstation time controls, or implement
chart/session/journal formatting in this step. Step 409 establishes the correct
owner, transaction, and durability boundary so the preference can be added
once and consumed consistently in Step 410.

## Step 409 Acceptance Gate

- model/store tests cover defaults, normalization, record version, migration,
  malformed storage, and unavailable storage;
- runtime tests prove hydration precedes snapshots and committed updates are
  persisted once through the injected boundary;
- browser tests prove edits are invisible outside the draft until OK;
- Cancel, close, and Escape all restore committed values after reopen;
- Reset is draft-only until OK;
- hard reload restores a committed setting;
- the panel contains no active control that is knowingly disconnected from its
  claimed behavior;
- Settings UI has no direct storage or chart-engine access;
- foundation and workflow-panel regression packs remain green.

## Ordered Follow-up

Step 410 is **Global Time Presentation Integration**:

- add the accepted `timeFormat: '24h' | '12h'` field and migration;
- keep it orthogonal to `displayTimezone`;
- create one shared presentation formatter for shell, Go-to, Session, replay,
  and Journal surfaces;
- apply chart axis/crosshair formatting through the official Lightweight
  Charts option hooks in the chart adapter, not a custom chart primitive;
- replace native time inputs where deterministic selected-format rendering is
  promised while preserving canonical `HH:mm` values;
- verify reload, both formats, timezone independence, DST-sensitive session
  anchors, canonical navigation values, and multi-pane chart labels.

Phase 8 Free Practice and Phase 9 Validation remain after these Phase 7
foundation-closeout gates. This ordering is product work: it establishes a
trustworthy workstation preference surface rather than performing line-count
cleanup.

## Stop Conditions

Stop Step 409 if it:

- lets the panel become the durable Settings owner;
- introduces a second raw browser-storage implementation;
- makes Cancel persist or publish a draft;
- exposes a setting without a real consumer;
- changes chart/replay/bar-data ownership;
- begins the broader Step 410 formatting rollout inside the foundation step.
