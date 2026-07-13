# Step 394 - Historical Static Test Audit

Status: completed on 2026-07-12.

## Baseline

Run:

```sh
node v6/tests/static-architecture-audit-step394.js --audit
```

The 2026-07-12 baseline found `201` static smokes: `140` passed and `61`
failed. The Step 276 and Step 293 behavioral browser packs remained green, so
this is a static architecture-test maintenance problem rather than evidence of
61 product regressions.

After consolidation, the suite contains `127` static smokes and passes
`127/127`. The migration removed `4212` lines of obsolete snapshot, file-shape,
and test-of-test assertions while adding four compact current-state/ownership
invariant smokes.

## Failure classes

1. Historical handoff assertions expect a past step to remain the latest step.
2. File-shape assertions inspect code that later moved behind an accepted owner
   boundary or runtime manifest.
3. Transitional assertions expect a command or runtime not to be wired even
   though a later accepted step completed that wiring.
4. Pack assertions expect literal member filenames after pack membership moved
   into a test-only group/member manifest.

## Migration rule

- Preserve tests for current ownership, command/event contracts, behavior, and
  regression-pack membership.
- Replace obsolete location assertions with current public-boundary assertions.
- Remove historical “latest handoff” assertions; the current handoff has one
  latest step by definition.
- Do not change production behavior merely to satisfy a superseded static test.

## Verification

- static architecture audit: `127/127` passed;
- V6 boundary smoke passed;
- Step 276 foundation browser pack: `8/8` in `41986ms`;
- Step 293 target-history browser pack: `8/8` in `19135ms`;
- `git diff --check` passed.

## Next recommendation

Step 395 should modularize `shell/replay-transport.js`, beginning with its
floating-position/drag controller. Keep the public mount API and replay command
ownership unchanged, add focused controller coverage, and commit each extracted
subdomain separately.
