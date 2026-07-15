# Step 437 - Workstation Outer Inset

Date: 2026-07-14

## Outcome

The workstation/browser boundary is reduced to a consistent 4px inset. This
retains separation between the browser edge and the active Pane border while
returning more area to the chart.

## Changes

- desktop shell padding: `10px` to `4px`;
- narrow-width shell padding: `8px` to `4px`;
- Session Dashboard minimum height: `calc(100vh - 20px)` to
  `calc(100vh - 8px)`;
- dedicated browser invariant covers the four equal insets and Dashboard
  geometry at three desktop resolutions.

## Commit

- `90e6813d style(v6): tighten workstation outer inset`

## Verification

- dedicated inset browser matrix passes at `1024x720`, `1440x900`, and
  `1920x1080`;
- compact Replay status matrix passes for single-, two-, and three-Pane layouts
  at all three resolutions;
- Transport clearance and status containment remain valid;
- product baseline screenshot passes and visually retains a distinct active
  Pane border without the former wide frame;
- boundary smoke passes;
- static architecture audit passes `124/124`;
- `git diff --check` passes.

## Next

Perform the Windows visual check at the user's actual display scaling. If the
4px frame is accepted, retain it as the workstation density baseline and return
to the remaining Step 435/436 visual closeout items.
