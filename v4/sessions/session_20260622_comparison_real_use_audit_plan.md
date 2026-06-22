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
