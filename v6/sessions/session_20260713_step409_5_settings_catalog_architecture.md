# Session - Step 409.5 Settings Catalog Architecture

Date: 2026-07-13

## Outcome

Accepted one binding Settings catalog before activating more controls. Canvas,
Symbol, Status line, and Scales/lines now have explicit scopes, owners,
consumer routes, and implement/defer/reject decisions. The Settings modal
remains one transactional shell; it does not become a monolithic chart,
viewport, session-calendar, status, or time-presentation runtime.

The old immediate Step 410 time-format rollout is superseded. Production work
starts with Canvas direct chart options after Step 409 human visual acceptance;
global timezone and 12/24-hour presentation move to Step 416.

## Capability Check

Official Lightweight Charts 5.2 options cover background, grid, crosshair,
scale text/font, axis borders, price-scale margins, and time-scale offsets.
Official plugin examples and awesome-tradingview provide no application-wide
Settings owner or ICT-aware day-separator solution.

## Verification

- `node v6/tests/settings-catalog-architecture-step409_5-smoke.js`
- `node v6/tests/next-settings-parity-selection-step409-smoke.js`
- `node v6/tests/global-time-format-settings-roadmap-smoke.js`
- `node v6/tests/global-time-format-settings-contract-smoke.js`
- `node v6/tests/settings-transaction-durability-step409-ownership-smoke.js`
- `git diff --check`

## Next

Complete Step 409 human visual acceptance. Then implement Step 410 Canvas
Direct Chart Options as one bounded production slice with migration,
multi-pane application, hard-reload persistence, and visual acceptance.
