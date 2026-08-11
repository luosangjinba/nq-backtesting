# Session — P0b Trusted-Build Core Plugin Center Implementation

Date: 2026-08-11

Status: implementation complete; H115 executable and passing; focused human
visual acceptance remains open

## Delivered

- Added pure, package-neutral Core profile, settings, dependency-impact,
  application-omission, boot-selection, and two-dimensional status contracts.
- Added `core.plugin-profile` as the sole device-local active/pending profile
  writer with exact revision CAS, durable receipts, explicit cascade
  confirmation, discard/reset composition, ready-only promotion, and stable
  failed-attempt diagnostics.
- Added `adapter.plugin-center-ui` as a removable host-rendered Settings
  destination with search, enabled-only filtering, manifest-derived details,
  accessible staged toggles, generic package/profile controls, honest
  no-settings state, retention copy, pending actions, and recovery display.
- Added the bounded application boot supervisor. It tries pending,
  last-known-good, and Kernel-safe graphs sequentially; each graph is still
  created, started, rolled back, stopped, and disposed only by ModuleHost.
- Enhanced ModuleHost failures with exact `moduleId` and lifecycle `phase`
  while preserving the original cause and reverse rollback.
- Kept the profile outside Server State Sync and preserved Annotation Artifact
  bytes and package/profile settings while FVG is disabled.

## Automated Evidence

`tests/core-plugin-center-harness.js` proves eight negative controls, synthetic
dependency and settings generality, monotonic profile revisions, stale command
and receipt rejection, explicit cascades, non-removable impact closure, corrupt
record non-repair, local-only scope, exact ModuleHost failure/rollback, and the
real production manifest inventory. Its Chromium path opens the real Settings
shell, stages FVG disable, reloads into the disabled graph, re-enables and
reloads, simulates a failed candidate with last-known-good recovery, verifies
unchanged Artifact bytes, exercises search/no-settings/pending states, checks a
narrow layout, and captures painted pixels.

H115 remains `executable`, not `accepted`, because its specification requires a
human review of the changed Settings surface. Community packages, installation,
Worker execution, SDK/MCP, Pine migration, and new Core capabilities remain out
of scope.

The refreshed production graph contains 66 modules, 148 actual dependency
edges, 128 construction sites, 25 writer sites, and zero architecture findings.
The source-quality contract has no size/function exception or finding.

## Verification

- `node v7/tests/core-plugin-center-harness.js` passes H115 with eight negative
  controls and the real Settings-hosted Chromium flow.
- `node v7/tests/architecture-boundary-harness.js`,
  `node v7/tests/architecture-hardening-harness.js`,
  `node v7/tests/production-architecture-harness.js`,
  `node v7/tests/production-module-assembly-harness.js`, and
  `node v7/tests/source-quality-harness.js` pass after the exact P0b graph and
  writer inventories were refreshed.
- The 116-Harness sweep completed with 111 direct passes. Two resource-sensitive
  browser checks—Annotation Chrome-profile cleanup and the four-Pane latency
  budget—then passed cleanly when rerun independently. The only remaining
  non-zero checks are the three explicitly preserved H091 visual fixtures:
  Session date picker, mixed-Pane layout, and Replay Workspace. The nine-scenario
  production regression matrix passes and reproduces its two inventoried visual
  findings exactly.
- The V7 market-data-dependent sweep used a temporary read-only service against
  the existing acceptance DuckDB. The pre-existing V4 service occupying port
  8766 was restored immediately afterward with its original command and
  `Restart=on-failure` behavior.
- `git diff --check` passes. No visual baseline was re-recorded.

## Focused Visual Feedback

The first human review found that the shared Reset/Cancel/OK footer still
painted over the Core Plugins detail text and was clipped by the dialog frame.
The footer's `hidden` attribute had lost to its author-level `display: flex`
rule while the Core Plugins grid collapsed that footer row to zero height.
The corrected shell now gives Core Plugins only header/body rows and explicitly
maps a hidden Settings footer to `display: none`. H115 additionally asserts the
computed hidden state. H115, Workstation Settings, Replay Workspace UI
independence, production application host, and source-quality Harnesses pass;
the corrected pixels still require human review before acceptance.
