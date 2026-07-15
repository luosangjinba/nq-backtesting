# Session — Step 452 Governance Probes Out Of Production

Date: 2026-07-14

## Outcome

Three historical decision/probe helpers with zero production incoming imports
move from `v6/src` to `v6/tests/governance/helpers`. Their historical tests and
evidence links follow the new owner.

The move does not include the responsiveness budget domain that still has real
production consumers, nor any runtime/feature module. An absence gate prevents
App or the runtime manifest from regaining these governance dependencies.

## Verification

- `node v6/tests/governance-probes-production-absence-smoke.js`
- affected Step 313/333/363 governance smokes
- `node v6/tests/static-architecture-audit-step394.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
