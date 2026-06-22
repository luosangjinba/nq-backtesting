# Step 313: Comparison Window Real-use Audit / Split Removal Readiness Plan

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Steps 309-312 closed the planned technical migration gaps for Comparison Window:

- locate routing;
- pick-preview routing;
- existing-object hit-test link;
- low-risk advanced PDA actions.

Step 308.6 still requires a real-use audit before any Split removal plan is allowed.

## Goals

- Convert the Step 308.6 checklist into an executable audit record.
- Provide a stable document the user can fill after one or two real review/trading sessions.
- Run a technical readiness smoke suite for the migrated Comparison Window workflows.
- Record a readiness decision without deleting Split.

## Non-goals

- Do not remove Split.
- Do not create a Split removal branch.
- Do not migrate deferred advanced PDA workflows in this step.
- Do not mark readiness as complete without real-use evidence.

## Step 313.1: Build Executable Audit Checklist

Status: Completed in implementation.

Commit:
- Pending in current Step 313 execution.

Executable row fields:

- Workflow
- Required Action
- Pass Signal
- Fail Signal
- Observed Result
- Notes
- Decision

Checklist:

| Workflow | Required Action | Pass Signal | Fail Signal | Observed Result | Notes | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| NQ/ES SMT | Use Main=NQ and Comparison=ES on the same timeframe; create or review SMT evidence; select and locate it from Inspector. | SMT renders on primary and comparison, selection opens Inspector, locate lands on expected time. | Need old Split to see SMT, selection misses comparison object, or locate only works on secondary. | Not audited yet |  | needs real-use data |
| 1M + HTF replay | Use primary 1M with comparison 1H or 4H while Replay On. | Comparison HTF candle progresses without showing future complete candle; cursor/hover sync is usable. | Future HTF data appears early, chart desyncs, or comparison becomes visually misleading. | Not audited yet |  | needs real-use data |
| Comparison annotation | Create BSL/SSL, FVG/IFVG, OB Last Bar, Wick CE, and Segment in Comparison Window. | Objects keep comparison source metadata and later render/select/filter correctly. | Metadata wrong, wrong price-axis projection, or Inspector cannot review object. | Not audited yet |  | needs real-use data |
| Active Order Setup evidence | Add comparison bar evidence and link comparison-created PDA/Segment/FVG where supported. | Active setup records evidence/ref with `sourceChartId=comparison-window`. | Evidence loses source context or still requires old Split for normal setup review. | Not audited yet |  | needs real-use data |
| Calendar/Inspector locate | Locate comparison-source objects from Calendar or Inspector. | Primary and comparison target behavior is predictable; status copy names target. | Locate silently falls back to primary or cannot reach comparison. | Not audited yet |  | needs real-use data |
| Replay History restore | Save a replay state with Comparison Window enabled, reload, and restore from History. | Primary cursor/range and comparison instrument/timeframe/window state restore. | Comparison state is missing, stale, or loads wrong range. | Not audited yet |  | needs real-use data |
| Fixed layout preference | During the same review, try the workflow without old Stack/Side Split. | Floating/sliding window is ergonomically acceptable for repeated comparison. | User still needs fixed Stack/Side layout for high-frequency work. | Not audited yet |  | needs real-use data |
| Advanced PDA frequency | Track every need for OB/Breaker range draft, Fib, EQH/EQL Point Sets in comparison context. | These are low-frequency or acceptable on primary/old Split. | Any becomes frequent enough to block Split removal. | Not audited yet |  | needs real-use data |

Create checklist rows for:

- NQ/ES SMT;
- 1M + HTF replay;
- Comparison annotation;
- Active Order Setup evidence;
- Calendar/Inspector locate;
- Replay History restore;
- Fixed layout preference;
- Advanced PDA frequency.

Each row must include required action, pass signal, fail signal, observed result, notes, and decision.

## Step 313.2: Add Audit/readiness Docs

Add `v4/docs/user/COMPARISON_WINDOW_REAL_USE_AUDIT.md`.

Include:

- audit window requirement;
- checklist table;
- session log template;
- pass/fail rule;
- readiness decision options.

## Step 313.3: Run Readiness Smoke Suite

Run:

- `node v4/tests/viewport-router-smoke.js`
- `node v4/tests/comparison-viewport-controller-smoke.js`
- `node v4/tests/pda-locate-actions-smoke.js`
- `node v4/tests/pick-context-router-smoke.js`
- `node v4/tests/comparison-pick-preview-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `git diff --check`

## Step 313.4: Record Readiness Decision

Allowed decisions:

- `ready for removal plan`;
- `keep Split`;
- `needs more real-use data`.

Rule:

- Without at least one full real-use review session, the decision must be `needs more real-use data`.
- Any failed checklist row blocks Split removal.

## Step 313.5: Closeout

Update:

- `v4/TODO.md`;
- this session file;
- `v4/docs/README.md` if a new audit doc is added.

Record:

- commits;
- technical verification;
- readiness decision;
- next allowed action.
