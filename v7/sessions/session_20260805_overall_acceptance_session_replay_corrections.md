# Session — Overall-Acceptance Session And Replay Corrections

## Trigger

The reviewer completed another pass through `v7/tmp/验收1.md` and separated six
requested changes from ordinary acceptance notes: Session-card creation time,
instrument-picker dismissal, Saturday Session boundaries, rapid Manual Next,
Escape cancellation of truncation, and Exact GoTo appearing one minute early.

## Ownership Decisions

- Session Browser continues to own card presentation, instrument-selection DOM,
  market-data date availability, and creation-intent normalization. Calendar
  Surface remains generic and receives only enabled-date predicates.
- Replay Workspace UI dispatches Next and Escape intents only. The composition
  command layer serializes rapid Manual Next clicks and Workspace Execution
  supplies an idle notification; Replay Runtime remains the only cursor owner.
- Exact GoTo remains a UI adapter over the existing exclusive-cutoff action.
  The customer now chooses the minute to reveal, while the adapter dispatches
  the next minute as the no-future cutoff.

## Corrections

- Session cards retain name, instruments, and historical range but omit the
  ambiguous creation timestamp.
- Each instrument selection closes the dropdown; reopening still permits NQ+ES
  multi-selection.
- A source-backed Saturday Start resolves to Sunday `18:00 New York`, while a
  source-backed Saturday End resolves to Friday `16:59 New York`.
- Manual Next stays enabled during accepted-chart refresh. Rapid clicks are
  queued in order and executed one at a time through the existing transaction.
- Escape invokes the existing truncation toggle and restores navigation.
- Exact GoTo defaults to the latest revealed minute, validates through the last
  minute before Session End, and reveals the exact selected minute.
- Replay-step select hover now explicitly retains the same opaque dark base as
  its non-hover state, hardening the earlier native-popup correction.

## Verification

- Session Browser pure and real-Chrome harnesses prove Saturday predicates,
  persisted Sunday/Friday epochs, picker collapse, card text, and six reviewed
  fixtures.
- Replay Workspace composition proves three rapid Next intents execute in
  strict order; the real chart harness proves Next never enters disabled state
  during refresh and retains the 100-step performance gate.
- Replay Pane Workspace real Chrome proves Escape cancellation and an Exact
  `13:00` choice visibly ends at `13:00`, with an intentionally updated Exact
  dialog fixture. Its retained 39-pixel environment delta was not rebaselined.
- Calendar, Replay navigation/response, UI-independent, architecture, and
  source-quality gates pass. The committed baselines remain clean at 48
  modules, 125 dependency edges, 115 construction sites, eight writer sites,
  309 production files, 23,158 effective lines, 2,478 functions, and 306
  public exports.

Human confirmation remains open on the original cloud/browser path.
