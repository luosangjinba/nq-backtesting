# Session — Light Canvas Pane Readout Contrast

## Trigger

During authenticated Alibaba-host acceptance, the reviewer changed the Canvas
to a white background. The Pane's symbol, timeframe, OHLC, change, and Volume
readout remained tuned for a black chart and appeared blurred or low contrast.

## Boundary And Correction

The defect belongs to the Replay Workspace UI's DOM-only Pane overlay. Market
data, price formatting, Lightweight Charts ownership, and Workstation Settings
persistence were already correct. The overlay now classifies the effective
Canvas luminance from the normalized global background color and projects one
light/dark presentation tone to every mounted Pane.

The original dark-Canvas declarations remain unchanged. A light Canvas uses
dark symbol/status colors, accessible directional colors, and no text shadow.
Settings preview applies the tone immediately, while Cancel restores the prior
Canvas and overlay tone through the existing Settings owner.

## Verification

- pure controls classify opaque black as dark, opaque white as light, and
  translucent white over the black Pane host as dark;
- real Chrome previews `#ffffffff`, proves every Pane receives the light tone,
  and observes `rgb(29, 37, 45)` symbol text with `text-shadow: none`;
- the same browser flow cancels the draft and restores `#000000ff` plus the
  dark overlay tone without writing Settings;
- the complete Pane Workspace browser harness passes when visual capture is
  used only to bypass the retained Chrome pixel-baseline drift; generated
  fixture changes are restored and no visual baseline is re-recorded;
- Workstation Settings, production architecture, source-quality, and
  `git diff --check` gates remain required before commit.

Human confirmation remains open on the original cloud/browser path.
