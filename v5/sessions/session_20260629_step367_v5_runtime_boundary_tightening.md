# Step 367 - V5 Runtime Boundary Tightening

## Goal

Tighten the V5 runtime boundaries found during the post-Step 366 architecture
audit before adding more replay features.

The main concern is not current behavior correctness. Current smokes pass. The
concern is drift: replay runtime is accumulating orchestration responsibility,
features have mixed command constant import styles, and router navigation state
uses a global document scan.

## Audit Context

The audit confirmed the main V5 direction is still intact:

- feature UI dispatches commands and subscribes to events;
- chart runtime remains the only chart writer;
- bar data runtime remains the only K-line requester/cache owner;
- replay runtime owns cursor, reveal state, prefix demand, and playback;
- session creation does not preload full chart history.

The audit also identified boundary risks that should be handled before adding
more user-facing replay behavior.

## Planned Steps

### Step 367.1 - Replay Event Mutation Path

- Review replay runtime subscriptions to chart events.
- Prefer making chart-event handlers dispatch replay commands instead of calling
  replay mutation helpers directly.
- If direct event-driven mutation is intentionally kept, write an ADR that
  names the exception and its limits.

Status: pending.

### Step 367.2 - Event Mutation Boundary Harness

- Add a focused boundary smoke for replay runtime event handlers.
- The harness should guard that events do not become hidden mutation channels.
- If an ADR exception is chosen in 367.1, the harness should enforce the
  documented exception shape rather than a vague rule.

Status: pending.

### Step 367.3 - Pure Command/Event Contracts

- Extract command/event names that feature modules need into pure contract
  modules.
- Feature modules should import contracts and the command/event bus only.
- Runtime implementation modules can continue to import and register the same
  contract names.

Status: pending.

### Step 367.4 - Feature Contract Migration

- Update session setup and chart replay feature routes to use contract modules.
- Preserve existing command names and browser behavior.
- Keep feature modules free of runtime implementation imports.

Status: pending.

### Step 367.5 - Router Root Scope

- Remove global route-link scanning from router.
- Scope route-link state to the app shell/root or return route state so the app
  shell updates nav UI.
- Preserve route dispose behavior added during Step 366 review follow-up.

Status: pending.

### Step 367.6 - Boundary Docs

- Update specs or add ADRs for:
  - command contracts as feature-facing API;
  - events as notifications, not hidden mutations;
  - router lifecycle/root-scoping rules.

Status: pending.

## Manual Acceptance

- Events remain notification channels unless a narrow ADR exception says
  otherwise.
- Runtime state mutation remains observable through registered commands.
- Feature routes import command/event contracts and generic buses, not runtime
  implementation modules.
- Router state updates are scoped to the app shell/root, not the full document.
- Existing replay controls and prefix behavior remain unchanged.

## Checks

- `node v5/tests/boundary-smoke.js`
- `node v5/tests/chart-boundary-smoke.js`
- `node v5/tests/bar-data-boundary-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js` if added in this step
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
