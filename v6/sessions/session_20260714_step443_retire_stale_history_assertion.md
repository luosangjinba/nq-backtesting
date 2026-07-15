# Session — Step 443 Retire Stale History Assertion

Date: 2026-07-14

## Outcome

The Step 187 browser gate again measures one responsibility: Manual Next must
remain fast and correct while leftward-history work is active. It retains the
`<160ms` threshold, cursor/reveal progression, latest-candle visibility, and
future-data protection.

The historical requirement that every run also append an older source window
is removed. Older data may be exhausted or a duplicate request may be ignored;
that outcome is not evidence of Replay latency failure and is covered by
dedicated history-extension tests.

## Verification

- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/canonical-test-manifest-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
