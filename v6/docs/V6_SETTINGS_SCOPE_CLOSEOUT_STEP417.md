# V6 Settings Scope Closeout - Step 417

Date: 2026-07-13

## Decision

Step 417 is a scope-closeout decision, not a feature implementation step.
V6 explicitly rejects the following Settings capabilities for the current
product:

- Settings templates;
- Apply to all;
- per-Pane Settings overrides.

The decision follows V6's lightweight, personal-workstation positioning. These
features primarily solve advanced configuration-management problems and do not
improve the core SMC/ICT validation or replay-practice loop.

## Why Pane Overrides Are Rejected

A Pane override would let one chart Pane replace a global presentation value,
for example hiding the current-price line only in Pane 2. That requires a
precedence chain such as:

`Pane override > global workspace preference > product default`

It would also require inheritance indicators, Pane-target selection, per-Pane
Reset semantics, override deletion, layout/Panes lifecycle rules, additional
persistence records, and an Apply-to-all conflict policy. No current V6 journey
needs that complexity. Pane-local symbol, timeframe, viewport, and replay/chart
state remain Pane-local because they are working state; visual preferences
remain global workspace preferences.

## Binding Constraints

- Settings continues to own one `workspaceSettings:global` preference record.
- No template selector, save/load/import/export template path, or template
  persistence is added.
- No Apply-to-all action is added to Settings.
- No Pane-scoped visual-preference record or inheritance layer is added.
- Existing Pane-local operational state must not be moved into global Settings.
- A future reconsideration requires a concrete user journey and a new product
  decision; it must not be revived as assumed parity with FXReplay.

## Outcome

Steps 409-416 provide the accepted Settings foundation and active catalog.
Step 417 closes the Settings expansion sequence without production code or a
schema migration.

## Next

Return to the primary product loop and perform a bounded product/foundation gap
re-audit. The next implementation should improve replay practice, prospective
chart judgment capture, auditable validation evidence, or Journal linkage—not
generic Settings parity.
