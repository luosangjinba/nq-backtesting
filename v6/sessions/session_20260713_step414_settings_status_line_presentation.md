# Session - Step 414 Settings Status Line Presentation

Date: 2026-07-13

## Completed

- confirmed the official Lightweight Charts legend is application-owned HTML;
- upgraded Settings to schema v6 and activated the Status line tab;
- routed committed preferences through a focused bridge to Pane Status Readout;
- added previous-close absolute/percent bar change without a data request;
- aligned Bar Change color with the selected candle's OHLC direction;
- deferred market state, Volume, and Description until their truth owners exist;
- covered transaction, multi-pane application, and hard reload.

## Commits

- `c38a7b77 feat(v6): version status line settings`
- `cb375e98 feat(v6): apply status line presentation`
- final Step 414 browser/governance commit

## Next

Implement Step 415 Scales And Current Price Presentation.

## Visual Acceptance

The first pass requested Bar Change to share OHLC direction colors. Commit
`558e43d4` added the rule and browser coverage for both rising and falling
panes. The final human visual recheck passed; Step 414 is closed.
