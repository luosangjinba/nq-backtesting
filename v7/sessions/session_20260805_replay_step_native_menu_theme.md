# Session — Replay-Step Native Menu Theme

## Trigger

During authenticated Alibaba-host acceptance, the reviewer opened the Replay
step selector in the fixed bottom transport. With the pointer on the selector,
the native popup appeared dark; after the pointer moved onto the chart, the
still-open popup became white while retaining light option text.

## Boundary And Correction

The affected control is the Replay UI-owned native `.replay-step-select`, not
the top Chart timeframe menu. Its base background was transparent and only a
hover path supplied a dark surface, allowing Windows/Chromium native popup
painting to fall back to white after pointer exit.

The shared Replay transport select and its options now use an explicit opaque
`#101114` background and `color-scheme: dark`. No command, Replay cursor,
timeframe capability, Chart writer, or runtime ownership changed. The overall
acceptance checklist records the human recheck as open.

## Verification

- real Chrome proves the select uses `appearance: none`, dark color scheme,
  opaque `rgb(16, 17, 20)` base, and the same opaque background on all eleven
  Replay-step options;
- real pointer hit and exit both retain that opaque dark base;
- the focused assertions pass before the existing Replay Workspace visual
  fixture mismatch. That already-open fixture finding is not rebaselined;
- architecture/source gates and `git diff --check` remain required before
  commit.
