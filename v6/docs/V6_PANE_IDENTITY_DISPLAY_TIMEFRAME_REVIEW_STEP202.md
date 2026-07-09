# V6 Pane Identity / Display Timeframe Review - Step 202

## Scope

Step 202 reviews the pane identity boundary before V6 expands display-timeframe
UI, indicators, or pane-local chart controls. It does not normalize pane ids or
change chart behavior.

## Current State

- Pane runtime owns the logical pane model and starts with `pane-default` as
  the only default record.
- Chart surface hosts are DOM/chart-engine panes named `main`, `secondary`, and
  `tertiary`.
- The current single-chart path works because several chart-facing runtimes try
  `PANE_COMMANDS.GET_BY_ID` first and then fall back to
  `PANE_COMMANDS.GET_ACTIVE`.
- This active-pane fallback is a compatibility behavior for the current primary
  chart path. It is not a finished multi-pane identity model.
- Pane status readouts are keyed by chart-surface pane ids from the DOM, so
  status updates for `main`, `secondary`, and `tertiary` only observe pane
  runtime display timeframe changes when events use the same pane ids.

## Accepted Interim Contract

- Chart-data, chart-viewport, chart-history, and chart-engine state remain
  pane-local by chart-surface pane id.
- Pane runtime remains the owner of symbol and display timeframe intent.
- Runtime code may use active-pane fallback only when all of these are true:
  the exact pane id lookup returns no pane, the path is still a singleton
  primary chart compatibility path, and the fallback does not mutate another
  chart-surface pane directly.
- New multi-pane behavior must not rely on the fallback. It must use an exact
  pane identity or an explicit mapping between chart-surface pane ids and pane
  runtime pane ids.
- Display-timeframe projection owners may read the active pane as a temporary
  compatibility source, but pane-local UI and future indicator paths need a
  single source of truth per visible pane.

## Risks

- A display timeframe set on `pane-default` can affect the primary `main` chart
  through fallback while the `main` status readout still looks like an
  independent pane.
- Adding TF UI or indicators before resolving identity can create two competing
  notions of pane-local state.
- Secondary and tertiary panes already use chart-surface ids for chart data and
  viewport state, so relying on the active pane fallback would make future
  multi-pane TF and indicator behavior ambiguous.

## Non-Goals

- Do not rename chart hosts in this step.
- Do not replace the pane store in this step.
- Do not add custom display-timeframe UI or indicator behavior in this step.
- Do not remove existing active-pane fallback until a bootstrap/mapping decision
  is implemented and covered.

## Step 203 Recommendation

Choose and implement one pane identity strategy before further TF UI or
indicator work:

1. Normalize pane runtime bootstrap to create `main`, `secondary`, and
   `tertiary` pane records that match chart-surface ids.
2. Or introduce an explicit chart-surface-to-pane-runtime id mapping and make
   every pane-local caller use it.

The first option is simpler for V6 because current chart-data, viewport,
status-readout, action-rail, reset-view, maximize, and layout code already use
`main`, `secondary`, and `tertiary`.
