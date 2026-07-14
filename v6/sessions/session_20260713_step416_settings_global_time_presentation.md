# Session - Step 416 Settings Global Time Presentation

Date: 2026-07-13

## Completed

- upgraded Settings persistence to schema v8;
- added one shared Exchange/UTC/Local and 12/24-hour presentation domain;
- connected native Lightweight Charts axis and crosshair formatters;
- replaced native Go-to time inputs with canonical controlled inputs;
- connected replay footer Start/Cursor/End to the same formatter;
- preserved New York wall-clock replay/navigation ownership and DST behavior;
- passed focused model and browser regression gates.

## Commits

- `81017d80 feat(v6): version global time presentation`
- `87111a36 feat(v6): apply global chart time presentation`
- `df30bdf8 feat(v6): control replay navigation time display`
- `e05ac154 feat(v6): format replay status times globally`
- final Step 416 documentation/governance commit

## Remaining

Human visual acceptance for 12/24-hour and Exchange/UTC presentation.

## Next

After visual acceptance, re-audit Step 417 templates and pane overrides against
real multi-pane requirements before implementation.
