# Session — Pane Readout Font Size

## Trigger

After the light-Canvas contrast correction, the reviewer asked whether the
Pane's symbol, timeframe, OHLC, change, and Volume text could be resized and
approved adding that control.

## Capability And Ownership Check

The official Lightweight Charts `LayoutOptions` contract states that
`fontSize` controls text on the scales. The awesome-tradingview catalog exposes
official chart plugins and community extensions but no ownership-compatible
DOM status-line typography control. The existing Replay Workspace Pane overlay
therefore remains the correct owner; no Chart adapter option or plugin is added.

## Correction

Global Workstation Settings advances from version 6 to version 7 with
`paneReadout.fontSize`. The value defaults to 12px, accepts integer values from
10px through 18px, and migrates every version-1 through version-6 record to the
default without changing another preference.

`Settings → Status line → Typography → Font size` offers every integer size
from 10px through 18px. One overlay-owned CSS custom property scales the Pane number,
symbol, timeframe, OHLC, change, Volume, and header height. Every mounted and
future Pane receives the same global value through the existing reversible
Settings consumer.

## Verification

- the Workstation Settings harness proves the 12px default, strict version-7
  wire, version-6 migration, and out-of-range rejection;
- real Chrome proves an 18px draft reaches every Pane and renders the symbol at
  19px, then Cancel restores 12px without persistence;
- the same browser flow commits 16px, renders the symbol at 17px, persists
  version 7, and restores the value after hard reload and another Session;
- the default 12px real-Chrome Pane Layout fixture remains unchanged;
- the Status Line dialog fixture is intentionally rebaselined after visual
  inspection to include the Typography selector;
- architecture, source-quality, and diff gates remain required before commit.

Human confirmation remains open on the original cloud/browser path.
