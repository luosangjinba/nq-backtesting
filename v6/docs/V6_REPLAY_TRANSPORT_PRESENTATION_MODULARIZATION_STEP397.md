# Step 397 - Replay Transport Presentation Modularization

Status: completed on 2026-07-12.

## Outcome

`replay-transport-presentation.js` now owns all Replay Transport DOM rendering:

- root playback/status/period/speed datasets;
- Previous, Play, Next, and Restart labels and disabled/active states;
- speed slider and speed-button selection;
- period label, trigger, option selection, and roving tabindex;
- period-sync checked/title/active state.

The renderer has no command, event, runtime, or feature-contract dependency.
`replay-transport.js` now calls `renderReplayTransport(root, state)` and remains
the owner of transport state, command dispatch, event subscriptions, global
shortcuts, and lifecycle composition. It fell from 512 to 418 lines.

## Verification

- renderer behavior smoke passed;
- renderer ownership boundary smoke passed;
- replay transport controller smoke passed;
- Step 397 modularization pack passed `5/5` in `17606ms`;
- nested Step 396 period/browser pack passed `2/2` in `17223ms`;
- nested Replay Transport browser pack passed `4/4` in `15089ms`;
- V6 boundary smoke passed;
- static architecture suite passed `127/127`;
- `git diff --check` passed.

## Stop condition

The planned Replay Transport decomposition is complete. Position, drag/
persistence, period navigation, period-menu DOM behavior, and presentation are
now focused collaborators. The remaining main file has a coherent orchestration
role; further splitting is not justified by the current evidence and should not
continue merely to reduce line count.

## Next recommendation

Step 398 should return to product/foundation gap selection. Re-audit the current
chart loading, timeframe, replay, multi-pane, and date-range user journeys and
select one observable functional gap before doing more structural refactoring.
Only reopen a large-file split when that selected feature exposes a concrete
ownership conflict.
