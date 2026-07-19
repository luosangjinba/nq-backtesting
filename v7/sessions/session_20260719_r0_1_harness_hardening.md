# V7 R0.1 Harness Hardening — 2026-07-19

## Trigger

R0 documented the correct architecture, but much of its executable harness
only proved that rule names were present. V6 showed that positive-only tests
and prose rules could pass while real chart behavior remained broken.

## Scope

R0.1 adds test-governance and architecture negative controls only. It adds no
production runtime, UI, persistence, network, Replay, Bar Data, or Chart code.

## Result

- 21 critical rules have stable ids, owners, V6 failure rationale, activation
  steps, enforcement states, and human gates;
- executable rules require both positive evidence and negative fixtures;
- nine intentional violations exercise the R0.1 architecture validator;
- minimal core is fixed as a headless, optional-module-free, no-global-state
  architecture assembly;
- future rules remain visibly declared/scaffolded instead of being falsely
  reported as protected.

## Manual Review

Review the rule catalog for missing V6 failure classes, premature executable
claims, incorrect activation order, and missing human gates. There is no
browser behavior in this step.
