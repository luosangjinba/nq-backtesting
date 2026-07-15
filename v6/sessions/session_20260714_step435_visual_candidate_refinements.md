# Step 435 - Visual Candidate Refinements

Date: 2026-07-14

## Outcome

Three user-requested workspace refinements are implemented as separate,
revertible changes before final human visual acceptance.

## Changes

1. Pane title/value readouts use the pane's latest chart bar when crosshair is
   absent. Crosshair selection temporarily overrides that value and clearing
   crosshair restores the latest bar. OHLC, bar change, and direction color
   share the same displayed-bar basis.
2. Go-to reuses its existing shell controller, coordinator, shortcuts, and
   settings dialog from a compact top-navigation entry. Its dedicated 48px
   right rail and orphan rail styling are removed, giving that width back to
   the chart.
3. The shell's unconditional six-pixel row gap is removed, so a hidden panel
   row cannot leave a blank strip between top navigation and Canvas.

## Commits

- `32f6fa89 feat(v6): default pane readout to latest bar`
- `447f971d refactor(v6): move go-to into top navigation`
- `b7478174 style(v6): join chart canvas to navigation`
- `1647c50c style(v6): color latest bar readout`

## Verification

- status readout model and pane controller smokes passed;
- crosshair and pane-status browser smokes passed;
- Settings Status browser smoke passed;
- Go-to UI and workspace functional baseline browser smokes passed;
- top/workstation, bottom chrome, and compact Replay layout smokes passed;
- App Shell and product baseline screenshot smokes passed;
- boundary smoke passed;
- static architecture audit passed `124/124`;
- `git diff --check` passed.

The baseline screenshot test had one grouped PNG byte-size threshold failure
after all layout assertions passed; immediate isolated rerun passed. No layout
or product failure was reproduced.

## Next

Perform Step 435 human visual acceptance on Windows at representative display
scales and on single-, two-, and three-pane layouts. Do not close the cleanup
phase until that visual pass is accepted.
