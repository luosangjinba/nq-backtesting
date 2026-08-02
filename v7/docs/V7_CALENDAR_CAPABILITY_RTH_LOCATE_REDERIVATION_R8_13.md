# V7 Calendar Capability And RTH Locate Re-derivation — R8.13

Status: human accepted through R8.15 (2026-07-31)

## Outcome

R8.13 reintroduces fixed and calendar timeframes as versioned registered
contributions at the Replay Workspace composition boundary. The generic
registry merges definitions, alignment identities, replacement entries, menu
groups, history planners, and optional Replay steps without importing either
timeframe policy family or branching on a concrete capability id.

Calendar `1D`/`1W`/`1M` remains implemented and enabled. Its exchange-wall
alignment and OHLC projection stay in `core.calendar-timeframe-domain`; fixed
durations stay in `core.fixed-timeframe-domain`. Adding another conforming
timeframe now requires focused contribution code and one composition
registration, without changes to Projection, Replay, Chart, Bar Data, UI, or
the V4 adapter/backend owners.

## Registered Extension Boundary

Each extension declares schema/API version, opaque extension id, calendar
alignment ids, and one registration factory. Its contribution supplies:

- normalized timeframe definitions and menu metadata;
- registered Workspace replacement entries for supported instrument and
  Session Hours combinations;
- one history-planning policy per timeframe;
- an optional Replay-step value rather than a calendar-specific Replay branch.

The registry rejects empty extension sets, duplicate extension/alignment/
timeframe identities, malformed contributions, and undeclared history
planning. A synthetic third-party contribution passes the same production
registry Harness. Source inspection proves the existing core owners contain
neither the calendar contribution import nor concrete capability-id branches.

## Dense RTH Locate Ownership

R8.5 already moved accepted raw coverage and the covering-window rule into Bar
Data Runtime while deleting the invalid Pane-local source ledger. R8.13 makes
that corrected behavior binding evidence for `BUG-V7-0003`:

```text
complete Pane-set materialization
  -> target Pane: bounded history extension lease
  -> unchanged Pane: ordinary navigation lease
  -> Bar Data Runtime detects the narrow request is covered
  -> the lease exposes the wider accepted request set by callback only
  -> Projection derives a complete immutable Pane snapshot
  -> the global Workspace transaction commits both Panes atomically
```

No raw bars or cache reader escape the Bar Data lease. Workspace State retains
semantic Viewport walls; the Chart adapter applies those walls; Pane time
location dispatches the explicit action; Replay remains unchanged.

## Ecosystem Decision

Lightweight Charts provides `barsInLogicalRange` for detecting historical
gaps and `setVisibleLogicalRange` for applying logical walls. Its plugins add
rendering surfaces such as custom series and primitives. Neither the library
nor the awesome-tradingview catalogue owns exchange-session aggregation,
transaction-scoped raw retention, or cross-Pane atomic materialization. The
existing adapter APIs remain appropriate, while data preservation stays in
the V7 runtime owners.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/time-scale>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://github.com/tradingview/awesome-tradingview>

## Evidence And Remaining Gate

The pure registry Harness proves the production fixed/calendar registrations,
synthetic extension, zero concrete-id branches, and five negative controls.
The Bar Data coverage Harness proves bidirectional two-Pane Locate leases retain
each non-target Pane's wider accepted coverage. Real Chrome proves two resets,
dense P1 history, repeated ETH P1-to-P2 Locate, atomic RTH replacement, both
RTH target directions, usable Pane walls, and an unchanged Replay cursor.

H019, H066, and H078 were executable after R8.13. The R8.14 production matrix
then passed, and the user explicitly accepted the hard-reloaded R8.15 Calendar
and dense ETH/RTH bidirectional Locate workflow on 2026-07-31. All three rules,
R7.3n, and R7.3o are now accepted.

The current production source baseline contains 309 files, 22,891 effective
lines, 2,449 functions, and 306 public exports. The architecture baseline
remains clean at 48 modules, 125 dependency edges, 115 construction sites,
eight writer sites, and zero blocking findings.
