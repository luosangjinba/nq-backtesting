# V7 P1c.2 / H119 Calculated-Series Chart Projection Human Review

Status: executable; focused human acceptance pending

Date: 2026-08-13

## Scope

This gate reviews synthetic Chart projection infrastructure only. It is not an
MA/SMA or product-Indicator review, does not make the calculated-series Profile
executable, and does not authorize instance persistence, settings UI,
Community/Worker execution, P1b.4, or an H117 state change.

## Automated Prerequisite

From the repository root, run:

```bash
node v7/tests/calculated-series-chart-projection-harness.js
```

Expected terminal line:

```text
v7 H119 calculated-series Chart-owned projection harness passed (21 negative controls, exact reversible child transaction, real one-chart Main/internal Plot evidence)
```

The gate proves complete branded candidate closure, Chart-owner-only admission,
ready/non-ready settlement, retained handles, move-without-calculation,
rollback/finalize fault escalation, candle-writer invariance, native gestures,
responsive containment, and idempotent disposal.

## Focused Visual Evidence

Open
`tests/fixtures/calculated-series-chart-projection/main-internal-1000x700.png`.
Confirm all of the following:

1. there is one chart surface split into a Main region and one internal region,
   not two independently synchronized charts;
2. the Main region contains three synthetic candles plus a cyan line, blue
   area, green/red baseline fill, translucent purple band with dashed edges,
   and the labeled gray reference line;
3. the explicit whitespace point breaks the continuous Plot paths rather than
   drawing through the missing value;
4. the internal region contains the negative pink and positive green histogram
   around a zero-centered ratio Scale;
5. the Main instrument-price labels and internal decimal labels are readable,
   and neither region overflows the chart bounds;
6. the screenshot contains no Indicator picker, settings, persistence,
   Plugin Center, MA/SMA, or other product UI.

The 1969 time labels are intentional synthetic epoch evidence, not a product
date-format decision.

## Acceptance Update

On explicit product-owner acceptance only:

- set H119 from `executable` to `accepted`;
- set H119 `acceptanceEvidence` to the P1c.2 implementation session;
- close only P1c.2;
- leave H117 exactly `executable`, human-review-required, and unaccepted;
- do not start MA/SMA, instance/persistence/UI, Community/Worker, P1b.4, or a
  generic layout slice.
