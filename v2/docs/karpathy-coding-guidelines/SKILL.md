---
name: karpathy-coding-guidelines
description: "Personal coding-discipline skill for agent work: think before coding, prefer simplicity, make surgical changes, and verify against explicit goals."
version: 1.0.0
author: Leo + Hermes
license: MIT
metadata:
  hermes:
    tags: [coding, debugging, refactoring, review, testing, agent-discipline]
    related_skills: [codex, systematic-debugging, test-driven-development, requesting-code-review]
---

# Karpathy Coding Guidelines

Use this skill when:
- implementing a non-trivial feature
- fixing a bug
- editing unfamiliar code
- reviewing whether a solution is overengineered
- refactoring with scope control
- working with any autonomous coding agent

This skill exists to reduce common agent failure modes:
- silent wrong assumptions
- hidden confusion
- overengineering
- drive-by edits
- weak verification

## Core principles

### 1. Think Before Coding

Do not silently choose one interpretation when requirements are ambiguous.

Required behavior:
- state assumptions explicitly
- surface ambiguities before implementation
- present tradeoffs when multiple approaches are plausible
- push back if a simpler approach better matches the request
- if confused, stop and say what is unclear

Checklist:
- What is the exact requested outcome?
- What is explicit vs inferred?
- What assumptions am I making?
- What could be interpreted more than one way?
- Is there a simpler path worth proposing?

### 2. Simplicity First

Implement the minimum that solves the requested problem.

Rules:
- no speculative abstractions
- no future-proofing unless explicitly requested
- no extra configurability for single-use logic
- no framework-like solution for a local problem
- prefer directness over cleverness
- prefer fewer moving parts and fewer layers

Tests:
- Would a strong senior engineer call this overbuilt?
- Could this be materially simpler?
- Is every new abstraction justified right now?
- Am I solving the actual task instead of a hypothetical future one?

### 3. Surgical Changes

Touch only what is needed for the task.

Rules:
- do not refactor unrelated code
- do not rewrite adjacent comments or formatting without need
- do not impose a new style on the surrounding file
- match local conventions unless asked otherwise
- if unrelated dead code or issues are noticed, mention them rather than fixing them automatically
- remove only the imports, variables, or helpers made obsolete by your own changes

Test:
- Can every changed line be traced directly to the request?

### 4. Goal-Driven Execution

Turn requests into verifiable success criteria.

Preferred transformations:
- "fix bug" -> reproduce it, then make the reproduction pass
- "add validation" -> add failing cases, then make them pass
- "refactor X" -> preserve behavior and verify before/after
- "improve reliability" -> define measurable checks first

Preferred verification:
- tests
- direct reproduction
- lint/typecheck
- before/after output comparison
- targeted manual checks

Do not stop at:
- "looks right"
- "should work"
- "probably fixed"

## Default workflow

1. Restate the task briefly.
2. List assumptions.
3. List ambiguities or decision points.
4. Propose the simplest valid approach.
5. Define success criteria and verification.
6. Make the smallest effective change.
7. Verify the result.
8. Report:
   - what changed
   - what was intentionally left unchanged
   - what unrelated issues were noticed but not touched

For multi-step tasks, use:
1. [step] -> verify: [check]
2. [step] -> verify: [check]
3. [step] -> verify: [check]

## Personal preferences for this skill

Apply these preferences by default in Leo's coding workflows:

- prefer the smallest effective change
- do not rewrite architecture unless explicitly requested
- do not introduce new dependencies unless clearly justified
- do not refactor adjacent code just because it could be cleaner
- do not change comments or formatting unless needed
- when fixing bugs, prefer reproduction-first and verification-first
- when noticing unrelated problems, mention them separately instead of fixing them automatically
- keep diffs tight, reviewable, and easy to reason about
- clearly separate requested changes from optional improvements

## Recommended output pattern

Use this structure when helpful:

Assumptions:
- ...

Ambiguities:
- ...

Simplest approach:
- ...

Plan:
1. ...
2. ...
3. ...

Verification:
- ...

Result:
- changed: ...
- intentionally unchanged: ...
- unrelated issues noticed: ...

## Pitfalls

### Silent assumption drift
Do not guess when ambiguity matters.

### Abstraction creep
Do not introduce helpers, factories, interfaces, or config layers unless they are immediately useful.

### Drive-by cleanup
Do not fix unrelated nearby issues in the same change unless requested.

### Scope expansion
Do not turn a local edit into a broad redesign.

### Weak verification
Visual confidence is not enough for non-trivial code changes.

## Success criteria

This skill is working when:
- diffs are smaller
- assumptions are surfaced earlier
- code is simpler
- unrelated edits decrease
- verification gets more explicit
- fewer rewrites are needed after review
