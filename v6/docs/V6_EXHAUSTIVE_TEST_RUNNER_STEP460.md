# Step 460 - Exhaustive Catalog Gate Runner

## Decision

Keep two different runners with explicit purposes:

- the canonical runner executes the small named milestone suite;
- the exhaustive runner executes every catalog entry whose role is gate in a
  selected explicit environment.

The exhaustive runner defaults to offline Node. Running all environments must
be an explicit choice because browser and service suites have materially
different prerequisites and cost.

## Required Interface

- `--environment=node`
- `--environment=node-service`
- `--environment=browser-local`
- `--environment=browser-service`
- `--environment=all`
- `--list`

The runner must execute sequentially, stop on first failure, report individual
and total duration, and return a non-zero exit code on failure.

## Steps

1. Extract reusable catalog loading and pure environment selection.
2. Implement the executable runner and explicit runner metadata.
3. Verify list mode, offline exhaustive gates, service gates, and canonical
   milestone gates.

## Closeout

Step 460 is complete:

- shared catalog loading replaces duplicate recursive scanning;
- pure selection excludes runner, support, and quarantine roles;
- the CLI supports all four explicit environments, `all`, and `--list`;
- canonical and exhaustive runners share one process execution boundary;
- the exhaustive runner is itself explicit runner metadata and cannot recurse;
- exhaustive Node gates passed 380/380 in 33855ms;
- node-service and browser-service gates each passed 1/1;
- browser-local lists 165 exhaustive gates; the intentionally bounded
  canonical browser execution passed as part of 14/14 in 24907ms;
- static architecture gates passed 52/52;
- the catalog classifies 761/761 JavaScript files as 547 gates, 159
  quarantines, 18 runners, and 37 support files.

The full 165-test browser-local catalog is available for deliberate long-form
execution. It is not silently substituted for the named canonical browser gate
in routine milestone verification.
