# Session — R12.5 Cloud Replay Hot Path

Date: 2026-08-06

## Trigger

Cloud acceptance on `43.110.32.34` showed visible Play-bar delay that was not
present against the local loopback services. The measured path had about 176
ms average RTT with zero packet loss, 0.76–0.97 second cold HTTPS first-byte
time, and roughly 1–2 ms local market-data health time.

## Decision

- keep the standalone external DuckDB immutable for one active V7
  service/runtime lifetime;
- discover one authoritative revision per provider/instrument/source scope and
  answer repeated warm resolution from Provider Execution memory;
- require restart/redeployment for database replacement and preserve immediate
  HTTP 409 revision invalidation for out-of-contract change detection;
- retain Bar Data Runtime as the sole raw cache/request owner and use the
  existing bounded forward windows;
- schedule Autoplay from consecutive tick starts, subtracting completed
  transaction time without overlap, skipped bars, or accumulated catch-up.

## Implementation

- change the production market-data provider from a one-millisecond
  discoverable revision TTL to the immutable-runtime provider policy;
- inject the monotonic clock into the Replay Autoplay scheduler and schedule
  one successor with `max(0, cadence - transaction duration)`;
- extend the cache/latency descriptor and validator with zero warm network,
  runtime immutability, restart, mismatch invalidation, and cadence rules;
- add four declarative negative controls and runtime evidence for 128 repeated
  revision resolutions, immutable-cache 409 recovery, compensated cadence, and
  zero-delay saturation;
- advance governance to R12.5/H096 without changing any ownership manifest or
  creating a second Replay/data path.

## Automated Evidence

Recorded focused evidence:

- `node v7/tests/market-data-provider-adapter-harness.js` — pass;
- `node v7/tests/replay-autoplay-scheduler-harness.js` — pass;
- `node v7/tests/cache-latency-contract-harness.js` — pass;
- Provider Execution, Replay source traversal, Workspace composition,
  navigation, Pane-set materialization, and Workspace transaction Harnesses —
  pass.
- Architecture Hardening — pass, 96 rules and 15 negative controls;
- Production Architecture — pass, 51 modules, 127 edges, 115 construction
  sites, 19 state writers, and zero findings;
- Production Source Quality — pass, 319 files, 311 exports, and 22 negative
  controls;
- Production Regression Matrix — pass, 8 production scenarios, 11 axes, and
  8 negative controls. The two pre-declared visual failures were reproduced
  with no new regression;
- machine-readable JSON validation and `git diff --check` — pass.

Architecture and source-quality baselines were refreshed for R12.5. No
ownership manifest changed.

## Human Gate

Deploy the resulting commit to `43.110.32.34`, hard reload, and record at least
100 identical warm Replay steps. Browser Network must show no per-step health
or bars request. Record cache misses and host CPU/RAM/swap separately, then
compare 1x/2x/5x visible cadence with the local run. H096 remains executable
until this evidence is accepted.
