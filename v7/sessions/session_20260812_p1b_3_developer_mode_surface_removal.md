# Session — P1b.3 Developer Mode Product-Surface Removal

Date: 2026-08-12

Status: product correction implemented; automated evidence and corrected
focused-human P1b.3 review passed; H117 remains unaccepted pending P1b.4

## Authority And Boundary

After reviewing the role of the implemented P1b.3 Developer Mode, the product
owner accepted the recommendation to remove it as a top-level production mode
and instructed the next step. This correction stays inside P1b.3: P1b.4 MCP,
H117 acceptance, external descriptors, package execution, activation, Workers,
registry, Marketplace, and new business contributions remain unauthorized.

## Product Correction

- The production Plugin Center now exposes only `Included` and `Installed`.
- The production browser adapter owns one `.v7plugin` picker snapshot and
  in-memory archive inspection. It retains no directory handle, device-local
  mode preference, listener set, development generation, reload state, or pack
  destination.
- Deprecated directory/storage/save ports fail closed with
  `V7DK_DEVELOPER_MODE_REMOVED`, preventing an accidental hidden reintroduction.
- The former Developer Mode control, production directory-snapshot module, DOM,
  styles, settings preference, and application wiring were removed.

## Retained Security Boundary

Prepared unpacked candidates remain a Developer Kit artifact, not a production
mode. The strict entry inspector remains in `core.plugin-contract`; directory
double-snapshot, path/NFC, symlink/special-file, resource, cancellation, stale-
snapshot, and stale-receipt checks now live in a tooling-only inspection adapter.
It retains no handle after the explicit call and cannot install, evaluate,
activate, watch, synchronize, or create a ModuleHost descriptor.

H117 keeps 54 frozen groups. Its third set of 18 is rebaselined from product
Developer Mode lifecycle behavior to two-surface/product-absence and unpacked-
candidate security evidence. The real Chromium fixture likewise proves exactly
two compact tabs and the absence of a production developer surface.

## Verification

H117 passes all 54 frozen negative groups plus real Chromium/IndexedDB/product
evidence. Its browser result records exactly two tab panels, no Developer Mode
surface, a 40 px tab list with 30 px controls, and no 620 px overflow. The
tooling set proves archive-only production API, no preference/handle retention,
exact pack bytes, and all unpacked path/snapshot/receipt controls.

The refreshed production source baseline contains 497 files, 43,718 effective
lines, 4,546 functions, and 461 public exports with no exception or finding.
The architecture baseline contains 68 modules, 150 actual dependency edges, 133
construction sites, 27 writer sites, and zero findings. Independent P1a/H116
passes all 20 negative controls and both trusted-package Harnesses. The Core
Plugin Center and production application-host browser regressions pass, including
two isolated application instances, reverse cleanup, and partial rollback.
`git diff --check` passes before commit.

## Human Review Result

On 2026-08-12 the product owner reported `本轮验收通过` for the corrected
Included/Installed surface. This closes P1b.3's focused visible gate only.

## Next Gate

P1b.4 is deliberately paused. Do not begin its MCP work or accept H117 without
a separate product-owner instruction.
