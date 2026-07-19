# V7 V6 Migration Denylist

Status: binding negative migration policy (2026-07-19)

V6 is evidence, not a runtime donor. No bulk copy, directory copy, cherry-pick,
or compatibility bridge from `v6/src` is permitted.

## Forbidden Structures

- the Chart Entry initialization/context/bootstrap/default-wall/projection
  event cascade;
- direct Chart Data writes from feature orchestrators;
- post-Next replacement or target-history handoff paths;
- separate append/replace/prepend semantic coordinators;
- primary/secondary or primary/non-primary pane ownership;
- global active-session persistence keys used by async work;
- Replay events published before chart-visible acceptance;
- viewport completion driven by chart data, mouse, resize, retry, or timers;
- request schedulers introduced to reconcile competing writers;
- Session Hours or timeframe-specific patch paths;
- assertions tied to legacy event order, helper names, or timing accidents.

## Permitted Reference Process

A V6 artifact may be re-derived only when a step records:

1. the product invariant being retained;
2. the new V7 owner and public contract;
3. proof that no V6 runtime import or copied orchestration is introduced;
4. focused tests written against outcomes;
5. manual acceptance.

Pure fixtures must be reviewed independently; passing a V6 test is not proof
that its implementation or expected behavior is correct.

## Deletion Proof

When a V7 path replaces a temporary V7 path, replacement and deletion happen
in the same commit. Production code may have only one active path for each
chart-visible intent. Architecture manifests contain exact owner/writer
inventories; prose and comments cannot retire debt.
