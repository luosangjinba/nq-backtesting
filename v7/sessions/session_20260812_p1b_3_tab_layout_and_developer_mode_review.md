# Session — P1b.3 Tab Layout And Developer Mode Product Review

Date: 2026-08-12

Status: compact layout corrected and automated evidence passed; subsequent
product-owner direction accepted the recommended top-level removal

## Request And Boundary

The product owner requested that Included, Installed, and Developer Mode labels
use a normal-sized layout and asked whether Developer Mode is actually
necessary. This authorizes the bounded visual correction and product-role
assessment. It does not authorize removal of an accepted P1b surface, P1b.4,
MCP, external execution, activation, or H117 acceptance.

## Layout Reproduction And Correction

The labels were not intrinsically oversized. `plugin-center-workspace` used two
implicit `auto` grid rows inside a tall container. Grid content distribution
stretched both rows, and the tab list's default Flex cross-axis behavior then
stretched every tab button to roughly 174 px high.

The workspace now declares `auto minmax(0, 1fr)` rows so only the panel receives
remaining height. The tab list aligns controls to content, sizes itself to its
labels, and caps overflow. Tabs use a compact 30 px control height, explicit
11 px label size, natural widths, and one-line labels. Real Chromium reports a
40 px list, 30 px maximum tab height, 113.3125 px maximum label control width,
and no 620 px horizontal overflow.

## Developer Mode Role Assessment

Current Developer Mode can select one already-prepared candidate output,
double-snapshot and validate it, explicitly reload it, and encode the same
validated entries as `.v7plugin`. It cannot edit source, compile, run fixtures,
preview package behavior, install the result, activate a contribution, or
create a ModuleHost descriptor.

That leaves no unique current product outcome:

- P1a already owns validate, build, test, preview, and pack for a developer
  workspace and produces both unpacked and archive outputs;
- Installed/Install from file already owns the meaningful device admission,
  trust disclosure, confirmation, persistence, and recovery workflow;
- P1b deliberately provides no external runtime, so Reload cannot provide a
  live product preview or shorten a code-to-behavior feedback loop;
- the persistent mode preference, extra top-level navigation, retained handles,
  generation lifecycle, concurrency, copy, and acceptance surface therefore
  cost more product complexity than the browser-only repack convenience earns.

The recommendation is **not to retain Developer Mode as a top-level production
mode in the current phase**. Preserve the strict in-memory entry inspector,
bounded directory snapshot logic, and negative controls as developer tooling
and security evidence. Reconsider a product-visible developer surface only
when a separately authorized runtime can safely preview an external
contribution, or when observed developer use proves a browser-only unpacked
workflow that P1a CLI/Library/MCP cannot serve.

No removal was implemented in this review commit because that required explicit
product-owner direction. The owner subsequently accepted the recommendation;
the bounded correction is recorded in
`session_20260812_p1b_3_developer_mode_surface_removal.md`.

## Verification

- H117 passes all 54 frozen negative groups and real-Chromium product/storage
  evidence with the new tab-layout measurements.
- P1a/H116 passes independently with all 20 negative controls and both trusted
  package Harnesses; one parallel browser-only `Uncaught` did not reproduce on
  the required independent rerun.
- The 620 px no-overflow, keyboard/focus, Installed transaction, Restricted
  Mode, and Developer Mode evidence remains intact.
- H117 remains executable and unaccepted; P1b.4 remains unauthorized.
