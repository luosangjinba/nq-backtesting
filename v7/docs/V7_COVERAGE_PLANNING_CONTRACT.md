# V7 Coverage Planning Contract

Status: R3.2b2 pure coverage and bounded-window planning (2026-07-20)

## Explicit Coverage

`core.coverage-planning-contract` requires a provider adapter to classify the
entire requested half-open window with ordered contiguous segments:

- `data` — authoritative data coverage;
- `market-closed` — settled calendar closure;
- `not-listed` — settled instrument non-coverage;
- `source-unavailable` — known temporary provider failure;
- `unknown` — not yet acquired or classified.

No code may infer one of these meanings merely because no bar exists. Reports
must tile the complete request window with no hole or overlap, echo the exact
raw request identity, and normalize adjacent equal segments.

## Bounded Request Planning

The planner requests `unknown` intervals only. A caller may explicitly open a
retry cycle for `source-unavailable`; settled data/closure/non-listing intervals
are never requested again. Every planned raw request preserves provider,
instrument, source resolution, and dataset revision.

Each chunk obeys both provider `maxWindowDurationMs` and
`maxBarsPerRequest * sourceStepMs`. Forward order supports normal acquisition;
backward order supports newest-first earlier-history extension. Planning is pure
and never depends on another mouse, wheel, resize, or timer event.

## Deliberate Deferrals

R3.2b2 does not invoke a provider, combine competing overlapping reports,
execute retry/deadline, cache revisions, prefetch, mutate Bar Data Runtime, or
own Session, Replay, chart, viewport, calendar UI, or visible state.
