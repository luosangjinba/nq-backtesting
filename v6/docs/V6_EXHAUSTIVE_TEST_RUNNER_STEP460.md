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
