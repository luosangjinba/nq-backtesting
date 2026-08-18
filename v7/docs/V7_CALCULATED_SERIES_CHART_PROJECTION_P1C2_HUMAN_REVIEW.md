# V7 P1c.2 / H119 Calculated-Series Chart Projection Human Review

Status: accepted on 2026-08-17 after corrected focused human re-review

Gate created: 2026-08-13

First review and correction: 2026-08-17

Accepted: 2026-08-17

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
v7 H119 calculated-series Chart-owned projection harness passed (22 negative controls, exact reversible child transaction, real one-chart Main/internal Plot evidence)
```

The gate proves complete branded candidate closure, Chart-owner-only admission,
ready/non-ready settlement, retained handles, move-without-calculation,
rollback/finalize fault escalation, candle-writer invariance, native gestures,
responsive containment, and idempotent disposal. The corrected browser gate also
proves that four logical scalar Plots use seven bounded adapter-private native
Series, samples six pixel-probe neighborhoods across the three
line/area/baseline whitespace gaps, and requires zero matching bridge pixels. A
raw pinned-Lightweight-Charts Line
Series with the same value/whitespace/value shape is the sensitivity control and
must produce a positive bridge-pixel count, so a blind or disabled probe cannot
pass the gate.

## Focused Visual Evidence

Open
`tests/fixtures/calculated-series-chart-projection/main-internal-1000x700.png`.
Confirm all of the following:

1. there is one chart surface split into a Main region and one internal region,
   not two independently synchronized charts;
2. the Main region contains three synthetic candles plus a cyan line, blue
   area, green/red baseline fill, translucent purple band with dashed edges,
   and the labeled gray reference line;
3. each cyan line, blue area, and green/red baseline appears as two visibly
   separated segments at the middle whitespace point, with no connecting
   stroke or fill through the missing value;
4. the internal region contains the negative pink and positive green histogram
   around a zero-centered ratio Scale;
5. the Main instrument-price labels and internal decimal labels are readable,
   and neither region overflows the chart bounds;
6. the screenshot contains no Indicator picker, settings, persistence,
   Plugin Center, MA/SMA, or other product UI.

The 1969 time labels are intentional synthetic epoch evidence, not a product
date-format decision.

## Review History

- On 2026-08-13 the implementation and this gate were created. H119 became
  `executable`; it was not accepted.
- On 2026-08-17 the product owner reviewed the fixture and rejected item 3:
  line, area, and baseline were still painted continuously through the middle
  whitespace point.
- The same-day authorized correction now maps each contiguous value run to an
  adapter-private built-in Series, keeps one logical Plot and one visible title,
  includes every segment in the native resource ceiling and reversible
  lifecycle, refreshes the screenshot, and adds the pixel assertion plus its
  native sensitivity control.

The prior review conclusion was therefore an explicit rejection, not an earlier
acceptance. H119 moved to `accepted` only after the corrected focused re-review
on 2026-08-17.

## Acceptance Result

On 2026-08-17 the product owner stated:

> H119 验收通过，下一步计划做什么？

This accepts the corrected H119 evidence, records the 2026-08-17 correction
session as `acceptanceEvidence`, and closes only P1c.2. H117 remains exactly
`executable`, human-review-required, and unaccepted. Acceptance does not itself
allocate or start MA/SMA, instance/persistence/UI, Community/Worker, P1b.4, or
the generic layout slice.

Correction record:
`sessions/session_20260817_p1c_2_h119_whitespace_rejection_and_correction.md`.
