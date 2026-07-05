# V6 Documentation Index

Read this index before working on V6.

## Required First Reads

- `v6/README.md`: V6 purpose, hard rules, and V5 usage boundary.
- `v6/docs/V6_ARCHITECTURE.md`: runtime boundaries and non-porting rules.
- `v6/docs/V6_EXECUTION_ROADMAP.md`: detailed execution order based on the
  useful V5 formation sequence, with V6 gates inserted earlier.
- `v6/docs/V6_PRODUCT_TOP_CHROME.md`: top chrome product-surface rules,
  diagnostics visibility limits, and UI reference handling.
- `v6/docs/specs/replay-viewport-intent.md`: the first core V6 contract.
- `v6/docs/specs/replay-visible-latency.md`: user-visible replay candle latency
  gates that prevent V5's delayed K-line appearance problem from returning.
- `v6/docs/specs/pane-model.md`: unified pane model that forbids V5's old
  primary/non-primary split.
- `v6/docs/specs/fxreplay-baseline.md`: FXReplay-like replay workstation
  behavior and layout baseline for the first usable V6 chart route.
- `v6/TODO.md`: current execution steps and acceptance gates.
- `v5/docs/specs/v6-rewrite-start-decision.md`: why V6 exists and which V5
  failure mode it must avoid.

## Stable Specs

- `specs/replay-viewport-intent.md`: canonical viewport-intent model for
  default replay wall, manual temporary walls, native drag/zoom, display-window
  loads, and append/replace behavior.
- `specs/replay-visible-latency.md`: visible-candle latency metric, browser
  harness shape, and pre-feature performance gates.
- `specs/pane-model.md`: one pane state shape and one command/event path for
  single-pane and future multi-pane behavior.
- `specs/fxreplay-baseline.md`: first-screen product baseline for replay
  controls, chart workspace, status, default/manual walls, and no-future bars.
- `V6_PRODUCT_TOP_CHROME.md`: default top chrome rules that keep runtime/test
  diagnostics out of the user's main reading path.

## Reading Rule

Do not load V5 historical sessions by default. Use V5 docs only for targeted
negative evidence or to port a test case into V6.
