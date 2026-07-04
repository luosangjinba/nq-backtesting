# Step 535 V5/V6 Rewrite Decision Audit

## Phase

Phase 3 replay workstation architecture governance.

## Purpose

Step 534 removed the main primary/non-primary display-state split from the
multi-pane replay path. Step 535 decides whether V5 should continue from this
state or whether the multi-pane/replay area is still structurally compromised
enough to justify a V6 rewrite.

This is a decision audit. It must not become another symptom patch.

## Decision Rules

Continue V5 when:

- `primary` is only a default pane id, DOM compatibility label, or layout id;
- chart display state is stored and mutated through one pane-state path;
- replay reveal fan-out is driven by replay cursor/timeframe, not by the active
  or default pane;
- bar loading remains inside bar-data runtime;
- chart series writes remain inside chart runtime;
- remaining debt is bounded to names, bootstrap defaults, historical tests, or
  small adapter contracts that can be retired incrementally.

Open V6 only when at least one hard blocker is found:

- core replay/chart display still requires a primary-owned state path;
- changing one pane's TF or viewport fundamentally depends on another pane's
  runtime state;
- replay cursor/reveal ownership and chart display ownership cannot be
  separated without rewriting most route/runtime modules;
- route or feature modules still directly write chart series or request bars in
  normal replay flows;
- the same class of bug can only be hidden by additional special-case patches.

## Audit Scope

The audit covers:

- chart runtime state store and chart write commands;
- replay display-window loading;
- replay Next fan-out and projection;
- pane display coordination;
- route/orchestrator state ownership;
- bootstrap/prefix paths that still mention `primary`;
- tests that still encode obsolete primary/non-primary architecture.

Out of scope:

- visual polish;
- Settings parity;
- unrelated replay initial start-resolve full-range request except as a
  separate V5 bootstrap/bar-data debt item.

## Required Artifacts

- A static audit script that classifies primary/default-pane mentions as
  allowed, review-needed, or forbidden.
- A session handoff with a V5/V6 recommendation.
- TODO update with the next engineering direction.

## Verification

- Static audit script runs and records findings.
- Existing Step 534 structural guard still passes.
- The final session handoff states one of:
  - Continue V5;
  - Continue V5 with mandatory cleanup items;
  - Open V6.
