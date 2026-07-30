# Session — R7.3o Dense RTH Time-Location Source Preservation

Date: 2026-07-30

Status: implemented and automatically verified; awaiting human interaction
review

## Reported Failure

In a restored two-Pane Session, both Panes were reset and P1 was zoomed to a
very dense wall. Repeated ETH drag and explicit location into P2 worked. After
switching to RTH, the same location still positioned P2 correctly, but P1
returned toward the Session entry and its candles collapsed against the left
side of the retained wide Viewport.

The exact real-browser reproduction measured P1 dropping from 604 accepted
bars to 240 while its roughly 1,283-bar logical span remained. P2 correctly
expanded from 240 to 645 bars, proving the defect belonged to unchanged P1
rather than the target-location planner.

## Cause And Correction

Explicit target-history location materializes the complete Pane set. The
target receives `time-location-history`; unchanged Panes receive ordinary
navigation. P1's RTH replacement had already accepted one wide raw source
batch, but its later navigation request was a narrower window fully contained
by that batch. The source ledger retained only adjacent prefixes and therefore
staged the narrower acquisition alone.

The Pane-local source ledger now recognizes complete ordered coverage under
the exact same schema, provider, instrument, source resolution, and dataset
revision. It retains the wider accepted batches for the unchanged navigation
Pane. Replacement operations and target-history extension retain their
existing semantics. Bar Data remains the only requester/cache, Projection
remains the OHLC computation owner, Chart Adapter remains the only series and
Viewport writer, and Replay remains untouched.

## Evidence

- pure source-ledger controls retain a same-scope covering RTH batch and reject
  foreign-instrument coverage;
- the real multi-Pane RTH Chrome gate creates a dense P1, switches RTH, invokes
  the actual `Locate in P2` menu action, and proves P1 bar count and span remain
  intact while P2 locates;
- Pane Time Location domain/controller, Workspace Transaction race controls,
  cache/latency, source-quality, architecture boundary/hardening, module host,
  Replay Workspace, and Pane Workspace gates pass;
- `git diff --check` passes before handoff.

## Human Gate

Hard reload the reported Session, repeat the same ETH and RTH drag/location
sequence, and confirm that P2 locates while dense P1 stays at its existing
history and zoom. No commit should be created until this interaction is
accepted together with the still-pending R7.3n calendar-timeframe review.
