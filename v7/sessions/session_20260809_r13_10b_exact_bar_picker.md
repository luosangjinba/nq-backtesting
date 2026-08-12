# Session — R13.10b Exact Bar Picker

Date: 2026-08-09

Status: accepted and closed 2026-08-09

## Scope

Activated removable `optional.annotation-bar-picker` under the existing
interaction owner and extended the Chart-owned interaction adapter with one
mutually exclusive Picker lease. The new boundary emits only a branded exact
Pane/Bar-start selection. It requests no Bar, moves no Replay/Workspace state,
writes no Annotation, persists nothing, and contains no semantic type.

The browser fixture composes the Picker with the existing transient Rectangle
Preview only to show cyan candidate and lime accepted Bar highlights. It is not
a production toolbar or accepted Annotation surface.

## Upstream Decision

Official Lightweight Charts `subscribeCrosshairMove`, `subscribeClick`, and
`MouseEventParams.seriesData` are sufficient. The exact timestamp is read from
the original mounted-Series item, not reconstructed from pixels. The pinned
official highlight-Bar Primitive informs the test presentation. No community
drawing runtime or new dependency was added.

## Evidence So Far

H110 passes 12 negative controls plus pure controller, concrete adapter, and
real-Chromium evidence. It proves one-shot exact selection, stale/duplicate
rejection, Escape/right-click/focus-loss cancellation, native context-menu
suppression for the consumed right-click, shared-lease exclusion with Drawing,
subscription teardown, unchanged candlestick data/native options, exact UTC
Bar start, and optional module removal.

Focused R13.4–R13.6 interaction/projection browser regressions pass. Current
architecture contains 61 modules, 132 dependency edges, 115 construction sites,
23 writer sites, and zero findings. Module assembly contains 61 public entries,
25 lifecycle modules, and 24 optional-removal cases. Current source quality is
485 files, 42,009 effective lines, 4,354 functions, and 452 public exports, with
no accepted exception. The standing R13 closure gates pass.

The first human pass rejected two details. The highlight used target-center to
next-center coordinates directly and therefore covered half of two adjacent
candles. In addition, a real click could publish a later candidate event after
pointer-down, making the captured event sequence stale: the cyan preview then
cleared without a lime acceptance. The correction centers the render bounds on
the target slot and defers fallback sequence allocation until pointer-up. The
fallback retains only an official-Series candidate, rejects movement at or
above the shared drag threshold, and never derives a Bar from pixels. Focused
tests now cover centered pixel bounds, real click acceptance, official-click
acceptance, and pan-sized non-acceptance.

The second human pass still showed cyan-preview removal without lime
acceptance. The remaining difference was listener order: the real vendor
container could consume pointer-down before the adapter's listener on that
same container. The Bar-only fallback now observes pointer-down at window
capture, filters it to the active Picker and the actual plot bounds, and leaves
the existing container listener untouched for Drawing/selection. H110 now
drives this earlier event-target path directly as well as through Chromium.

The following retry still did not show lime acceptance. The final bounded
correction covers two real-input differences that the zero-motion Chromium
case omitted: an official click may contain a point but transiently lose its
Series item, and remote/physical click jitter may exceed Drawing's 3px drag
threshold. The subscription now retains the last exact official candidate only
for a same-time-axis-slot official click; another-slot empty click remains a
hard no-op. The pointer fallback uses an independent 8px click slop, while a
40px movement remains native pan and Drawing continues using 3px.

The visible diagnostic finally reproduced the user's exact terminal state:
one down, one up, one click, zero movement, no controller error, and
`cancel=focus-loss`. The remote browser briefly blurs the window inside the
click. The corrected pointer helper defers only focus-loss observed while a
primary Picker gesture is active for 150ms; successful pointer-up accepts and
clears the timer, while unresolved blur cancels after the delay and idle blur
still cancels immediately. Both the concrete adapter and real Chromium H110
path now inject blur between press and release.

## Human Gate — Accepted 2026-08-09

Accepted at:

`http://127.0.0.1:8013/v7/tests/fixtures/annotation-bar-picker/`

The user confirmed the cyan hover candidate, lime one-click acceptance,
accurate UTC status, Escape/right-click cancellation without an extra accepted
Bar or native menu, and unarmed native Chart drag/wheel behavior. Acceptance
followed the focus-loss correction described above. The temporary diagnostic
strip was removed before closure, leaving the clean acceptance fixture and its
automated regression only.

The post-acceptance closure rerun passed H100–H110, architecture boundary,
production architecture, writer closure, module assembly, ModuleHost,
deployed-runtime architecture, source quality, architecture hardening, and
`git diff --check`. The final inventories remain 61 modules, 132 dependency
edges, 115 construction sites, 23 writer sites, 61 public entries, 25 lifecycle
modules, 28 optional-removal cases, 417 production files, and 393 public
exports, with zero blocking architecture findings or accepted source-quality
exceptions.

R13.10b is closed as one separate commit. R13.10c and all FVG/Inspector work
remain unauthorized.
