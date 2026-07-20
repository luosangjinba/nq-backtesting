# V7 Source Boundary

V7 production modules may be added only in roadmap order, with an owning public
contract, machine-readable descriptor, manifest inventory update, and
independent harness. Interaction or visual changes additionally require manual
acceptance. R1.1–R1.3 activate only pure identity and
transaction contracts. R1.4 adds an isolated module host with explicit port
injection and reversible lifecycle; it is not an application singleton,
Session store, scheduler, feature coordinator, or product runtime.
R1.5 adds pure versioned capability descriptors and compatibility negotiation;
it does not add a provider, timeframe implementation, instrument catalog,
calendar calculation, indicator evaluator, formula evaluator, or plugin loader.

R2.1 adds the explicit-key Session Store and replaceable persistence adapter.
R2.2 adds only the Session Browser DOM adapter and thin browser composition;
R2.3 extracts its accepted date-time interaction into the independent shared
Calendar Surface adapter. Calendar Surface owns only calendar/date-time
presentation and no coverage, bars, Replay, panes, viewport, provider, order,
news, or chart behavior.

R3.1 adds only immutable provider-neutral raw Bar Data request/bar/batch values.
No provider I/O, cache, prefetch, retry, Replay, projection, chart, or UI owner
is active yet.

R3.2a activates the single Bar Data requester/cache factory with an injected
provider port, exact-window LRU, coalescing, concurrency queue, and disposal.
Only fake providers are used; real transport and coverage policy remain absent.

R3.2b1 adds a transport-neutral Provider Policy Contract for revision freshness,
request limits, deadlines, bounded retry, stable errors, and the adapter port.
It selects and invokes no real provider.

R3.2b2 adds explicit full-window coverage values and pure bounded acquisition
planning. Missing bars do not imply a coverage reason, and no provider is
invoked by this module.

R3.2b3 adds a policy-bound provider execution wrapper and automatic complete
coverage-plan runner. Bar Data Runtime retains raw request/cache ownership, only
fake adapters are exercised, and no Replay or UI behavior is active.

Do not import runtime code from V4, V5, or V6.
