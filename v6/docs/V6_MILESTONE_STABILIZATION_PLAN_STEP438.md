# V6 Milestone Stabilization Plan — Step 438

Status: accepted execution baseline (2026-07-14)

## Scope Freeze

Steps 438-454 are a foundation-stabilization milestone. During this sequence:

- do not implement the three operating modes;
- do not implement Semantic Drawing;
- do not add product/business capability;
- preserve the V5 ownership rules inherited by V6;
- give every Step its own verification evidence and commit.

The baseline commit is `c05e9c70` (`docs(v6): record workstation outer
inset`). Existing user changes must not be folded into these commits.

## Audit Baseline

- Static architecture audit: `124/124` passing.
- Boundary smoke: passing.
- JavaScript inventory: 218 production files and 721 test files.
- Non-browser/non-static smoke classification: 337 passing and 72 failing;
  23 failures require browser/service infrastructure and 49 mix stale and
  current assertions.
- No JavaScript import cycle was detected.
- `app.js` has 43 direct dependencies; `core-runtime-manifest.js` has 42 and
  coordinates about 40 runtimes.
- `workstation-shell.js` is 722 lines; `workstation-chart-surface.js` is 862
  lines and both carry more than one durable responsibility.
- `TODO.md`, the documentation index, and historical session inventory have
  grown beyond a useful current-state reading surface.

The primary runtime defect is the time-axis scaffold: whitespace points are
currently appended to candlestick data, forcing `update()` to rebuild all
series data. The full chart pack exposed a leftward-history latency regression,
and the isolated Manual Next sample reached 161.5 ms against a 160 ms gate.

## Ordered Execution

| Step | Bounded outcome | Independent gate |
| --- | --- | --- |
| 438 | Freeze this baseline and execution order | docs links, boundary/static gates |
| 439 | Define the dual-Series scaffold contract | contract smoke, boundary/static gates |
| 440 | Move future whitespace to an auxiliary Series and restore candle `update()` | adapter/unit/browser scaffold tests |
| 441 | Close scaffold performance and visual regressions | chart pack plus latency/geometry gates |
| 442 | Define one canonical test manifest and classifications | manifest self-check |
| 443 | Retire or rewrite stale historical assertions | canonical non-browser pack |
| 444 | Normalize browser harness naming and environment requirements | browser manifest discovery check |
| 445 | Close the executable test catalog | canonical static/unit/browser summaries |
| 446 | Establish a safe DOM rendering boundary | renderer contract/security smoke |
| 447 | Remove unsafe persisted-data HTML rendering | affected Session/Journal browser gates |
| 448 | Extract App contribution composition | app/boundary/static gates |
| 449 | Extract Shell templates | shell browser/geometry gates |
| 450 | Extract Chart Surface controllers | chart surface and multi-Pane gates |
| 451 | Extract runtime pipeline contributions | runtime manifest/app lifecycle gates |
| 452 | Move governance probes out of production `src` | architecture and import-absence gates |
| 453 | Canonicalize time validation at its owner boundary | timezone/date/Go-to/replay gates |
| 454 | Archive historical ledgers and publish milestone closeout | current TODO/index/read-path gates |

## Stop Conditions

Each Step stops if its focused regression gate fails or if the change would
alter Replay truth, market-bar ownership, chart-series ownership, or persisted
canonical time semantics. Fixes remain inside the current Step only when they
are necessary to satisfy that Step's invariant; otherwise record them for a
later milestone.

Step 454 may close only after all earlier commits exist independently and the
canonical test catalog reports the expected foundation gates.
