# V7 Disposition Of V6 Knowledge And Structure

Status: binding migration review standard (2026-07-19)

V7 must absorb V6's useful knowledge comprehensively without inheriting its
unreliable runtime graph. Every V6 area receives one of four dispositions:

- **retain**: product meaning or external contract remains authoritative;
- **re-derive**: useful behavior is rebuilt behind a V7 owner and retested;
- **reference**: evidence or interaction guidance only;
- **reject**: structure must not enter V7 production code.

## Product And Domain Disposition

| V6 area | Disposition | V7 treatment |
| --- | --- | --- |
| Local-first SMC/ICT validation direction | retain | remains the product north star |
| Free Practice + Validation Campaign | retain | policies over one shared workstation foundation |
| Blind replay and no-future evidence | retain | Replay provenance is mandatory |
| Backtesting and Journal artifacts | retain | separate owners above the stable foundation |
| V4 API/data timestamp contract | retain | reuse through a new provider adapter contract |
| Session-hours calendar semantics | re-derive | review fixtures, rebuild pure eligibility/calendar domain |
| Timeframe aggregation semantics | re-derive | one pure projection domain, including RTH anchor rules |
| Viewport wall interaction | re-derive | keep product behavior, replace lifecycle/ordering logic |
| Layout/pane record concepts | re-derive | uniform pane records from single pane onward |
| Validation artifact schemas | reference then retain selectively | migrate only after chart foundation acceptance |
| UI appearance and FXReplay ergonomics | reference | reuse interaction intent, not state ownership |
| V6 browser failures/screenshots | reference | become black-box regression scenarios |

## Engineering Structure Disposition

| V6 structure | Disposition | Reason |
| --- | --- | --- |
| explicit runtime owners | re-derive | correct concept, but V7 contracts must be clean |
| command intent / post-commit notification | re-derive | events cannot orchestrate business transactions |
| pure domain helpers with no runtime imports | review individually | only outcome-tested helpers are candidates |
| canonical/exhaustive harness organization | re-derive | useful test taxonomy without legacy assertions |
| Chart Entry event cascade | reject | distributed async stages can stall or complete stale |
| multiple Chart Data mutation callers | reject | one intent can cause multiple visible writes |
| implicit active Session state | reject | caused cross-session contamination |
| post-Next target-history replacement | reject | cursor and visible completion split |
| primary/non-primary pane paths | reject | makes multi-pane non-atomic |
| behavior fixes tied to TF or ETH/RTH branch | reject | cross-product rules belong to projection |
| mouse/resize/retry completion | reject | correctness cannot depend on incidental input |

## Required Source Audit Before Each Slice

Before implementing a V7 slice, inspect only the corresponding V6 contracts,
pure domains, harnesses, manual reports, and external adapter behavior. Record:

1. accepted product behavior;
2. observed V6 failure cases;
3. reusable external/pure inputs;
4. rejected ownership and orchestration;
5. V7 owner/interface and deletion proof;
6. automated and human acceptance matrix.

This targeted audit is mandatory. A bulk V6 source review or copy is forbidden
because it obscures ownership and imports obsolete assumptions.

## Intended Final Product Shape

V7's final shape is one local-first workstation, not a collection of separate
chart products:

- fast FXReplay-quality historical replay with imperceptible cache-hit Next;
- deterministic TF and ETH/RTH switching with a bounded refresh gate only when
  data acquisition is actually required;
- single and multi-pane layouts using the same pane model;
- pane-local TF/instrument/view while all panes share one Replay clock;
- stable user-controlled chart walls and scales during playback;
- Session create, re-entry, hard refresh, and persistence with absolute
  isolation;
- Backtesting and Journal workflows over the same chart/replay owners;
- prospective SMC/ICT evidence, plans, outcomes, statistics, and drillback;
- modular/plugin-friendly extension without direct feature-to-feature control.

Backtesting, Journal, drawings, evidence, analytics, calendars, data providers,
and chart adapters attach through declared ports. Optional modules can be
removed from an assembly without editing core module source. Core owners are
independently runnable against fake ports and replaceable by contract-conforming
implementations.

The extension model explicitly covers user-defined timeframes, optional
seconds/tick providers, new instruments/calendars, indicators, and future
formula languages. These extend registries and adapters; they do not add
feature-specific branches to Replay, Chart, or transaction owners.

This shape is implemented through vertical slices so every foundation behavior
is usable and manually reviewable before higher product modules resume.
