# V6 Modularity And Large-File Audit — Step 470

Status: complete (2026-07-15)

## Purpose

Step 470 audits current production boundaries before the required ETH/RTH
Session Hours work. It is an inspection and sequencing decision, not a broad
refactor and not authorization to place Session Hours behavior in whichever
large file is convenient.

The audit asks:

1. which large files carry multiple durable responsibilities;
2. which existing boundaries ETH/RTH will cross;
3. which splits are required before a specific Session Hours phase;
4. which large files should remain unchanged because their ownership is still
   coherent.

## Quantitative Baseline

The largest production JavaScript files at audit time are:

| File | Lines | Assessment |
| --- | ---: | --- |
| `chart-engine/workstation-chart-surface.js` | 830 | large lifecycle owner; layout/resize complexity remains, but Session Hours must not enter it |
| `shell/workstation-shell-template.js` | 715 | coherent template boundary, but top-toolbar growth needs extraction before ETH/RTH UI |
| `shell/session-dashboard.js` | 665 | mixed dashboard/setup/list routing; unrelated to Session Hours and not a prerequisite |
| `chart-history/leftward-history-extension-runtime.js` | 545 | high-risk orchestration hotspot for Session-Hours-aware history |
| `contracts/app-contracts.js` | 462 | large but coherent public contract catalog |
| `shell/replay-transport.js` | 429 | transport controller/presentation orchestration; Session Hours must use Replay contracts rather than enter here |
| `chart-history/leftward-history-input-bridge.js` | 395 | scheduling bridge with several policies; observe during integration, no pre-emptive split selected |
| `shell/pane-status-readout.js` | 381 | pane-local readout plus developer diagnostics; not a Session Hours owner |
| `chart-engine/lightweight-chart-adapter.js` | 320 | coherent engine writer with minor hygiene debt |
| `replay/replay-cursor-pane-materializer.js` | 276 | bounded but duplicates important window/projection policy with replacer |
| `replay-navigation/replay-navigation-runtime.js` | 267 | coherent navigation owner; consume Session Hours policy through contracts |

Line count is evidence for inspection, not an automatic split rule.

## ETH/RTH Boundary Trace

The accepted flow is:

`toolbar -> Session Hours command -> shared mode owner -> Replay eligible cursor -> pane materialization/projection -> Chart Data -> Chart Engine`

Historical extension follows:

`visible-range intent -> leftward-history coordination -> Bar Data window -> Session Hours projection -> Chart Data prepend`

Higher timeframes follow:

`eligible source bars -> display/target-history projection -> pane Chart Data`

No path authorizes shell code, Chart Engine, or a pane to calculate exchange
hours.

## Required Structural Gates

### Gate 1 — Shared Replay Pane Materialization Policy

Timing: before ETH/RTH Phase C.

`replay-cursor-pane-materializer.js` and
`replay-cursor-pane-replacer.js` independently resolve pane instrument,
source/target timeframe, Bar Data windows, projection, cursor filtering, and
Chart Data writes. Their append/replace operations are legitimately separate,
but Session Hours eligibility must not be implemented twice.

Required action:

- extract a replay-owned pure/shared pane materialization policy for context,
  eligible source bars, projection inputs, and no-future filtering;
- leave append versus replace command selection in the existing focused
  executors;
- add parity tests proving append, replace, Previous, Restart, and drillback use
  the same Session Hours revision and eligibility rule.

### Gate 2 — Leftward-History Request Coordination

Timing: before ETH/RTH Phase C/D integration.

`leftward-history-extension-runtime.js` still combines runtime lifecycle,
in-flight/exhaustion bookkeeping, target-history fallback, repeated empty-gap
scans, diagnostics, and final Chart Data prepend orchestration. Step 393 moved
data loading/projection helpers out, but this entry remains the largest
stateful runtime hotspot touched by Session Hours.

Required action:

- extract request attempt/exhaustion/gap-scan coordination behind one explicit
  API, or an equivalently coherent subdomain selected by focused tests;
- keep runtime entry focused on command registration, state publication, and
  owner orchestration;
- make Session Hours revision part of request identity so stale ETH/RTH work
  cannot win;
- preserve the current target-history fast path and latency diagnostics.

### Gate 3 — Top-Toolbar Template Boundary

Timing: before ETH/RTH Phase E UI.

`workstation-shell-template.js` is a coherent markup owner, but its single
template function contains the entire workstation surface. Restoring a real
Session Hours control directly into that monolith would repeat the placeholder
growth that Step 418 removed.

Required action:

- extract the top-toolbar markup into a focused template module before adding
  the ETH/RTH selector;
- keep the selector controller in a separate shell UI module that dispatches
  commands and subscribes to events;
- do not move Session Hours state or calendar constants into either template.

## Conditional Splits

- `chart-history/leftward-history-input-bridge.js`: split only if Phase C adds
  another scheduling responsibility rather than consuming a single public
  Session Hours revision/intent.
- `display-timeframe/display-timeframe-runtime.js`: retain as orchestrator if it
  can pass an eligibility/projection context through an explicit API; split
  only if it begins calculating Session Hours itself.
- `pane-intent-reload/pane-intent-reload-chart-data-runtime.js`: do not add a
  third mode-specific replacement implementation. Route through the shared
  projection/materialization policy or select a bounded shared helper first.
- `app.js`: remains a composition root. Mounting one focused Session Hours
  controller is acceptable; domain logic, persistence, and event policy are
  not.

## Large Files Not Selected For Pre-Emptive Refactor

- `session-dashboard.js` is large and carries dashboard, Quick Session, recent
  sessions, and surface routing. It deserves a future dashboard-focused split,
  but ETH/RTH does not need to touch it.
- `workstation-chart-surface.js` owns chart-host lifecycle, visible layout,
  resize/maximize state, and range stabilization. Existing collaborators have
  already removed input mechanics and pure layout rules. Session Hours should
  arrive as Chart Data revisions, so no Session Hours split is authorized
  inside this owner.
- `app-contracts.js` is a registry rather than a behavior implementation.
  Session Hours commands/events may be added there without a speculative
  catalog split.
- `replay-transport.js` remains the UI dispatcher for transport behavior.
  Eligible cursor traversal belongs behind Replay commands.
- `pane-status-readout.js` and `lightweight-chart-adapter.js` have bounded
  cleanup opportunities, but neither should own or project Session Hours.

## Minor Hygiene Debt

The audit observed a repeated `lastVisibleLogicalRange` assignment and imports
placed after executable declarations in `lightweight-chart-adapter.js`. These
are low-risk cleanup candidates for a separate behavior-preserving commit, not
an ETH/RTH prerequisite.

## Step 470 Decision

No broad cleanup phase is required before ETH/RTH Phase A. Phase A is a pure
semantic/data-contract step and should start next.

The three structural gates are binding at their named integration points:

1. shared Replay pane materialization policy before Phase C;
2. leftward-history coordination split before Phase C/D;
3. top-toolbar template extraction before Phase E.

If Phase A discovers that RTH must be applied at a different data boundary,
revise this audit through an explicit decision rather than silently placing
filtering in Chart Engine or shell code.

## Next Authorized Work

ETH/RTH Phase A — Exchange Calendar And Replay Semantics.

It must verify the actual NQ/ES data timestamp contract and settle ETH/RTH,
maintenance break, weekend, holiday, early-close, DST, cursor-outside-RTH,
Replay traversal, and higher-timeframe aggregation semantics before production
UI or runtime behavior changes.
