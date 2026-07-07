# V6 Next Dashboard Row Action Exposure Readiness Audit

Date: 2026-07-07

## Decision

Journal row action has since been exposed by Step 116.

Journal is the nearest candidate in this audit because its owner contract already marks the
command surface and persistence as ready. It must remain hidden until the
journal owner surface is ready and a dedicated browser smoke proves the row
action can open that surface without crossing into chart, bars, replay,
viewport, orders, or calendar ownership.

Order and Calendar remain later candidates:

- Order still has no ready command surface, persistence path, or write path.
- Calendar still has no ready command surface, persistence path, provider-read
  path, or write path.

## Contract Comparison

| Action | Owner | Current exposure | Ready signals | Blocking signals |
| --- | --- | --- | --- | --- |
| Order | `orders-runtime` | hidden | none | command surface, persistence, and write path are not ready |
| Journal | `journal-runtime` | visible after Step 116 | command surface, persistence, owner surface, and browser row-action coverage are ready | chart/bars/replay/viewport/orders/calendar paths remain blocked |
| Calendar | `calendar-runtime` | hidden | none | command surface, persistence, provider-read, and write path are not ready |

Order and Calendar keep `rowActionVisible` false. Journal now keeps
`rowActionVisible` true after Step 116, while all three still cannot load bars,
open a chart, advance replay, or touch the viewport.

## Browser Coverage Gate

The dashboard/session browser pack now covers Summary, Stats, Copy, and Journal
actions. It intentionally contains no browser selector or command path for:

- `data-v6-row-action="order"`
- `data-v6-row-action="calendar"`

Before any hidden action becomes visible, its owner must provide a browser smoke
that exercises the user-facing row action through the owner surface and proves
the action does not mutate chart, bars, replay, viewport, or another feature
runtime.

## Next Direction

Step 110 should focus on Journal row-action owner surface readiness. Keep the
dashboard row action hidden while defining and testing the minimum journal-owned
surface/browser contract needed before exposure.

## Verification

- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
