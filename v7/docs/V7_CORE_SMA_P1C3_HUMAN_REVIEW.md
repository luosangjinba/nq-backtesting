# V7 P1c.3/H120 Core SMA Focused Human Review

Status: automated H120 passed; focused product-owner review required; H120 is
`executable` with `acceptanceEvidence: null`

Scope: only `first-party.moving-averages@1.0.0` and its single
`SMA(close)` Definition

## Start The Production Route

Use the normal V7 market-data service, then run:

```bash
node v7/scripts/serve.mjs 8007
```

Open `http://127.0.0.1:8007/v7/app/`. Create or open an NQ Replay Session with
enough visible history; the automated fixture uses 2026-05-01 12:40 through
2026-05-11 12:40 in `America/Los_Angeles`.

## Ten Checks

1. Open **Settings → Plugins**. Confirm one active **Moving Averages 1.0.0**
   Core package. Do not count the existing FVG semantic package as a Moving
   Average.
2. In one Pane choose **Indicators**. Confirm Add Indicator offers exactly one
   Moving Averages definition: **Simple Moving Average** with Core/version
   provenance.
3. Add it. Confirm **SMA 20** appears as a credible blue price line in Main,
   the legend value follows the crosshair, and no line extends into unrevealed
   future time.
4. Open **Settings** for the instance. Check Inputs, Style, Visibility,
   integer/range validation, Cancel/discard protection, field Reset and Reset
   all, Apply, keyboard operation, and focus return. Set length to 500 on a
   short history and confirm honest `—`/whitespace; Reset to 20 and confirm the
   line returns.
5. Change length to 2 and confirm values recalculate without an old-line flash.
   Change only color/width/pattern and confirm geometry values stay the same.
6. Choose **Move to New Region**, then **Move to Main**. Confirm this remains
   one synchronized chart, values are unchanged, the empty Region disappears,
   and candles, drag, wheel, crosshair, price scale, and Reset View still work.
7. Exercise Replay forward/back, Go To, timeframe, and ETH/RTH changes. Confirm
   no future point, stale flash, blank chart, or obvious interaction stall.
8. Hide and Show the SMA, hard reload the route, then Remove it. Confirm the
   exact state persists and no orphan line, legend, Region, or blank pane
   remains.
9. Add an SMA, disable Moving Averages in Core Plugins, and reload. Confirm one
   retained unresolved instance with no pixels. Re-enable and reload; confirm
   it resolves and freshly recalculates instead of restoring cached output.
10. Switch to four Panes and add one SMA to each. Confirm instances are
    isolated, all Panes remain contained and usable at a narrow window, and no
    other Indicator/plugin/algorithm has appeared.

Reject H120 with the failed item number and a short observation if any check is
unclear or defective. If all ten pass, an explicit product-owner statement such
as `H120 验收通过` is still required before the repository may mark H120
`accepted` or begin another plugin.

## Automated Evidence Command

```bash
node v7/tests/core-moving-averages-harness.js
```

The passing command reports formula/resource evidence, real-Chromium pixels,
one/four-Pane timings, and `automated-passed-human-review-required`.
