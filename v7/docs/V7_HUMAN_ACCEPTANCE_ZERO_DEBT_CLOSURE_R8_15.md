# V7 Human Acceptance And Zero-Debt Closure — R8.15

Status: human accepted; R8 recovery closed (2026-07-31)

## Outcome

The user explicitly reported `验收通过` after the final hard-reloaded real-
browser gate. The reviewed workflow covered Calendar `1D`/`1W`/`1M`, a dense
two-Pane ETH/RTH Workspace, large historical drag, repeated P1-to-P2 Locate,
bidirectional RTH Locate, stable independent Pane walls, shared Replay
immobility, persistence, and hard-refresh restoration.

R8 recovery mode is therefore inactive. The architecture-conformance feature
freeze is released only by this step, with no `regressed` catalog rule, no
production architecture finding, no source exception, and no tracked debt.

## Human Gate

The binding review asked the user to:

1. hard-refresh the production page;
2. open a two-Pane Session and reset both Panes;
3. make P1 maximally dense while preserving P2's normal wall;
4. drag P1 across a large historical span and repeatedly Locate P1 into P2 in
   ETH;
5. verify `1D`, `1W`, and `1M` are clickable and arrive with filled left
   context without another pointer input;
6. return to `1m`, switch atomically to RTH, then drag and Locate in both target
   directions;
7. confirm neither Pane returns to Session start, collapses left, loses its
   wall, exposes future bars, or moves Replay;
8. hard-refresh again and confirm the accepted RTH Workspace restores.

The user answered `验收通过` on 2026-07-31. This accepts R7.3n and R7.3o and
the R8 human-review rules covered by the same architecture, interaction,
latency, restore, and cleanup evidence.

## Automated Closure Evidence

All 78 top-level Harnesses passed sequentially immediately before closure.
The ordinary real Workspace 100-sample result was p95 89.0 ms, p99 117.1 ms,
and maximum 125.4 ms. The restored mixed-Pane result was p95 90.1 ms, p99
100.9 ms, maximum 101.4 ms, and zero warm provider requests.

After the closure metadata edits, every Harness was covered again. One loaded-
host aggregate run stopped at the ordinary Workspace latency check with p95
100.11 ms against the strict 100 ms budget; its isolated clean rerun passed at
p95 65.2 ms, p99 75.0 ms, and maximum 79.5 ms. The final restored mixed-Pane
run passed at p95 81.7 ms, p99 91.1 ms, maximum 96 ms, and zero warm provider
requests. No product assertion or durability check failed.

The exact browser identity also dynamically injects a durable publication
failure after every Pane has painted a newer candidate. It restores the exact
accepted visual/semantic/Replay revision and leaves the Session record byte-
for-byte unchanged. Production-owner evidence independently covers Chart,
Replay, Workspace State, publication, and persistence failure boundaries plus
delayed, reordered, stale, and late work.

Production evidence remains unchanged at 303 files, 22,405 effective lines,
2,400 functions, 304 public exports, 48 modules, 125 dependency edges, 115
construction sites, seven writer sites, and zero findings. Source policy has
zero file/function exceptions and the source baseline has zero debt comments.

## Rule And Defect Closure

Human acceptance advances H019, H021, H025, H066, H071, H072, H077, H078, and
H079 to `accepted`. H069 was already automatically accepted in R8.14. The five
stable recovery defects are closed:

- `BUG-V7-0001`: reversible global commit and dynamic post-visible rollback;
- `BUG-V7-0002`: Bar Data Runtime is the sole raw-retention owner;
- `BUG-V7-0003`: dense non-target walls survive ETH/RTH bidirectional Locate;
- `BUG-V7-0004`: production boots through the declared ModuleHost graph;
- `BUG-V7-0005`: production analysis and executable matrices replace fixture-
  or inventory-only evidence.

H001/H003/H004 remain executable at their pre-recovery governance status.
H070 also remains executable because the separate Data Acquisition administrator
page was not part of this chart acceptance. No unreviewed surface is promoted
by inference.

## Delivery Boundary

R8.15 changes governance and evidence only; production behavior is unchanged.
No further recovery work was planned at closure. The later R8.16 audit-evidence
correction fixes a prose total and strengthens H023 without reactivating
recovery. Normal product delivery still must be selected explicitly; the
separate R7.3/R7.3c Data Acquisition human gate remains open.
