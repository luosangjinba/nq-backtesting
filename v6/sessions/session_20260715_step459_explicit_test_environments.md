# Step 459 - Explicit Test Environments

## Scope

Replace filename and source-text environment inference with explicit metadata.
No production source or product behavior changed.

## Substeps And Commits

1. `8f263155` audited 192 inferred non-Node files into 173 browser-local, one
   browser-service, and 18 Node false positives.
2. `643559f5` connected explicit environment metadata and removed inference.
3. `f8f0e1d3` identified the previously hidden real-service dependency and
   introduced an explicit node-service environment.
4. `784df8e7` added a transitive browser-harness metadata guard.

## Evidence

- Exhaustive catalog: 755/755 classified.
- Roles: 545 gate, 159 quarantine, 17 runner, 34 support.
- Environments: 580 node, one node-service, 173 browser-local, one
  browser-service.
- Restored Node classifications: three current gates passed; 15 historical
  entries remain explicitly quarantined.
- Offline root Node gates: 378/378 passed.
- node-service gate: 1/1 passed against the local V4 API.
- browser-service gate: 1/1 passed against the local V4 API.
- Static architecture gates: 51/51 passed.
- Named canonical suite: an initial run recorded a 174.8ms latency sample above
  the 160ms gate; the isolated rerun passed at 97.4ms and the complete clean
  rerun passed 14/14 with the same gate at 126.5ms, total 24765ms.
- `git diff --check` passed.

## Outcome

Node is the default execution environment. Every browser or real-service
exception is explicit and reviewable. A test name or import string can no
longer silently change how the catalog schedules it.
