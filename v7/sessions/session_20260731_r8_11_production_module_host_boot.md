# Session — R8.11 Production ModuleHost Boot

Date: 2026-07-31
Branch: `v7/rebuild`
Starting commit: `d341b034 refactor(v7): split replay workspace composition`

## Scope

Execute only R8.11 from the binding recovery plan: boot both real production
roots through ModuleHost and registered public ports, prove isolated instances,
reverse cleanup, partial-start rollback, and the production optional-removal
matrix, recover H018, create one commit, and stop before R8.12.

## Starting Evidence

The worktree began clean. ModuleHost, Production Module Assembly, Production
Architecture, Session Browser browser, and Data Acquisition browser Harnesses
passed. The exact starting snapshot contained 46 modules, 125 dependency
edges, 122 construction sites, seven writer sites, and the two R8.11
`BUG-V7-0004` findings.

## Implementation

- added real Session and Data Acquisition application lifecycle modules;
- moved Session application configuration and hash navigation into the owning
  application-composition module;
- added a production catalog loader that reads the real manifest/descriptors,
  selects one route closure, imports declared public entries, and registers
  them as ModuleHost ports;
- reduced both route entry files to ModuleHost definition loading, host start,
  and pagehide stop;
- made Replay Workspace an optional Session application port and expanded the
  production removal matrix from one descriptor consumer to two;
- added a production browser Harness for dual-instance isolation, real cleanup,
  partial-start rollback, both application roots, optional removal, and two
  negative controls.

## Evidence

- Production Application Host browser Harness;
- unchanged Session Browser and Data Acquisition production browser Harnesses;
- ModuleHost and Production Module Assembly Harnesses: 48 public entries, 16
  lifecycle descriptors, and two optional-removal cases;
- Production Architecture Harness: 48 modules, 125 dependency edges, 114
  construction sites, seven writer sites, zero blocking findings, and nine
  analyzer negative controls;
- Architecture Boundary, Architecture Hardening, and Source Quality Harnesses;
- all 76 top-level Harnesses passed in one final ordered run;
- `git diff --check`.

The final Replay Workspace sample measured p95 `68.7ms`. The restored Workspace
sample measured p95 `85.4ms` with zero provider requests.

## Recovery Ledger

- `BUG-V7-0004`: both production-root findings closed;
- H018: `regressed -> accepted`, retaining its original acceptance evidence and
  adding the real application-path recovery evidence;
- H077: `declared -> executable` with real production-root evidence; human
  acceptance remains unclaimed;
- seven recovery regressions remain assigned to R8.12–R8.14;
- no visual or interaction behavior changed, so the established automated
  recovery gate applies.

The next permitted step is R8.12 source and documentation closure. It must not
begin until the R8.11 commit and evidence have been reported.
