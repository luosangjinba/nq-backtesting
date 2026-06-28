# CSS Domain Split Plan

Step 353.7 starts the CSS split with a repeatable import pattern and one
low-risk extraction.

## Import Pattern

- `v4/index.html` keeps loading `style.css`.
- `style.css` remains the compatibility entry point.
- Domain files live under `v4/styles/` and are imported from the top of
  `style.css`.
- Shared variables and base layout stay in `style.css` until a later base
  extraction, so imported domain files can rely on the existing CSS variables.

## Split Order

1. `base-layout.css`: reset, `:root`, `html/body`, app/workspace/chart shell.
2. `toolbar.css`: toolbar groups, date range calendar, settings popover.
3. `chart-comparison.css`: chart canvas, legends, viewport controls, comparison
   window. Step 353.7 extracts the comparison window subset first.
4. `inspector.css`: inspector shell, generic controls, detail panels.
5. `inspector-calendar.css`: inspector calendar month grid, day object groups,
   economic event rows.
6. `context-menu.css`: primary/secondary PDA context menus and comparison
   context menu.
7. `maintenance.css`: only if Data Maintenance moves from its current page-local
   styling to shared styles.
8. `responsive.css`: media query overrides after domains are separated enough
   to avoid moving unrelated responsive rules.

## Step 353.7 Extraction

- Extracted `.comparison-*` window, placeholder, overlay, and comparison menu
  styles to `styles/comparison-window.css`.
- Left shared legend, viewport control, chart pane, and responsive rules in
  `style.css` because those selectors are shared with primary/secondary chart
  layout.

## Manual Check

- Open the app and verify the Comparison Window opens, resizes, drags, shows its
  header/placeholder/legend, and still overlays the chart correctly.
- Verify primary chart, secondary chart, toolbar, Inspector, and Calendar layout
  did not shift.
