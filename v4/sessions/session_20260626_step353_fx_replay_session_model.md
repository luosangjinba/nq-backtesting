# Step 353 - FX Replay-Style Session Cursor Model

## Goal

Replace range-first chart loading with a clean replay session model inspired by FX Replay.

The user-selected date range defines a replay session boundary, not the full chart payload to load.

- `sessionStart`: first replayable timestamp.
- `sessionEnd`: last replayable timestamp.
- `cursor`: current replay position.
- Display rule: the chart may show historical context at or before `cursor`, but must not show bars after `cursor`.
- Prefix rule: historical context before `sessionStart` is normal chart context and can lazy-load left until the data source starts.
- End rule: replay stops at `sessionEnd` and reports the session is finished.

Step 353 replaces the reverted Step 352 implementation path. Step 351 remains the stable fallback until Step 353 is complete.

## Product Semantics

FX Replay behavior to match:

1. The session creation page chooses an initial date and end date.
2. Entering the chart places the right edge around the initial date.
3. Bars before the initial date are visible context.
4. Dragging left can keep loading older bars beyond the session start.
5. Bars after the current cursor are hidden until replay advances.
6. Switching timeframe keeps the same session and cursor semantics.
7. The end date only caps forward replay; it does not constrain left-side context.

## Architecture

### Session State

Create a dedicated replay session state separate from legacy load range state.

Minimum fields:

- `instrument`
- `timeframe`
- `sessionStart`
- `sessionEnd`
- `cursor`
- `autoUpdateEnd`
- `loadedRanges`
- `mode`

The state should be independently testable before UI behavior changes.

### Data Loading

The frontend never asks `/v4/bars` for the whole session range by default.

Instead it requests bounded chunks:

- initial context around `cursor`, clipped for display to `<= cursor`;
- left prefix chunks when the visible range approaches the earliest loaded bar;
- right chunks only when replay needs bars beyond current loaded data;
- pane/comparison/overlay sync windows only around visible/cursor ranges.

The backend `/v4/bars` safety limit remains unchanged.

### Display Model

The active chart data can include cached bars after `cursor`, but the series must only receive visible bars whose timestamp is `<= cursor`.

This is the key invariant. It prevents future leakage while still allowing prefetch.

### Timeframe Switching

Timeframe changes are session-preserving operations:

- keep `sessionStart`;
- keep `sessionEnd`;
- keep `cursor`;
- reload context in the new timeframe;
- continue to hide bars after `cursor`;
- allow prefix loading before `sessionStart`.

### Auto-Update End Date

Add a lightweight optional session setting.

If enabled, `sessionEnd` follows the latest available timestamp for the current instrument before loading/resuming the session. This supports daily review without creating a new range each day.

It must not move `cursor`. It only extends or refreshes the replay end boundary.

## Non-Goals

- Do not remove the backend bars limit.
- Do not load a full year of 1m bars into the chart.
- Do not preserve the reverted Step 352 modules.
- Do not force left-side historical context to start at `sessionStart`.
- Do not solve persistent IndexedDB cache in the first pass.

## Step Plan

### Step 353.1 - Design Boundary

Freeze the state model, invariants, non-goals, and acceptance criteria.

Deliverables:

- TODO entries.
- This session document.
- No runtime behavior changes.

### Step 353.2 - Session State Only

Add an isolated session state/store and tests.

Acceptance:

- Session state can create, update, serialize, and reset a session.
- Existing Load Range behavior is unchanged.
- Local smoke passes.

### Step 353.3 - Initial Cursor Right Boundary

When entering a replay session, load enough context around `sessionStart`, but only render bars at or before `cursor`.

Acceptance:

- Initial chart rightmost visible bar is at or before `sessionStart`.
- Bars after `sessionStart` are not visible until replay advances.
- No full date range request is made.

### Step 353.4 - Prefix Lazy Loading

When the user pans left near the earliest loaded bar, request an older chunk, prepend it, and keep the display clipped to cursor.

Acceptance:

- Panning left can reveal bars before `sessionStart`.
- Loaded chunks are cached.
- Repeated pan over recently loaded area does not refetch.

### Step 353.5 - Replay Forward Append

Replay Bar advances cursor. If the next bar is not loaded, fetch a small right-side chunk. Display remains clipped to cursor.

Acceptance:

- Next/play advances one replay unit at a time.
- Future bars remain hidden.
- At `sessionEnd`, replay stops and shows a clear finished state.

### Step 353.6 - Timeframe Switching

Switching timeframe reloads context around the same cursor and applies the same display clipping.

Acceptance:

- 1M, 5M, 15M, 1H, and 1D keep the same cursor boundary semantics.
- Left prefix can still load before `sessionStart`.
- No future bars appear after switching.

### Step 353.7 - Auto-Update End Date

Add session end auto-update using latest available instrument timestamp.

Acceptance:

- Toggle persists locally.
- When enabled, session end refreshes to latest data before loading.
- Cursor does not move automatically.

### Step 353.8 - Pane, Comparison, and Overlays

Adapt secondary data consumers to the session model.

Acceptance:

- Pane/Comparison do not request full session ranges.
- Overlays do not trigger future-bar leakage.
- Calendar locate respects session cursor semantics.

### Step 353.9 - Browser Smoke

Add real browser coverage for the session model.

Acceptance:

- Initial right edge equals session start/cursor.
- Prefix loading works by panning left.
- Replay forward reveals bars progressively.
- End boundary stops replay.
- Timeframe switching preserves clipping.

### Step 353.10 - Manual UX Validation

Manually compare behavior against FX Replay screenshots and real usage.

Acceptance:

- One-year 1M session is usable.
- Dragging does not stay permanently janky.
- Daily review with auto-update end is ergonomic.
- Remaining performance work is documented separately if needed.
