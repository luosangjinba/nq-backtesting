# 2026-06-08 - Step 275 Display Setup Font Scale

Goal:

- Add a purely manual display setup for Windows 4K / Linux 1080p differences.
- Keep code lighter than an automatic DPI/resolution heuristic.
- Preserve the current Linux 1080p default visual size unless the user changes
  the setting.

Decision:

- Use manual controls only.
- Do not infer font size from `screen.width`, `devicePixelRatio`, browser zoom,
  or OS scaling.
- Treat display settings as local machine preferences, not review data. They
  should not be exported in Review JSON.

Planned controls:

- UI Scale: `100%`, `110%`, `125%`, `140%`
- Chart Text: `Normal`, `Large`, `XL`
- Inspector Density: `Compact`, `Normal`, `Comfortable`
- Reset defaults

Implementation plan:

1. Step 275.1: Define display preferences boundary and defaults.
   - Add `display/display-preferences.js`.
   - Store normalized settings for `uiScale`, `chartTextScale`,
     `inspectorDensity`, and `toolbarDensity` if needed.
   - Default values must reproduce the current UI.

2. Step 275.2: Add CSS variable foundation.
   - Introduce variables such as `--ui-font-size`, `--compact-font-size`,
     `--toolbar-font-size`, `--inspector-font-size`,
     `--chart-label-font-size`, `--control-height`, and `--panel-row-gap`.
   - Apply variables first to toolbar, buttons, inputs, context menus,
     Inspector, Calendar, and Archive.
   - Avoid scattered inline style changes unless canvas primitives need direct
     font strings.

3. Step 275.3: Add the manual Display Setup UI.
   - Add a compact `Display Setup` panel in the Inspector settings/archive area
     or another existing settings surface.
   - Use select/segmented controls, not `alert` / `prompt`.
   - Apply changes immediately.

4. Step 275.4: Persist local preferences.
   - Use the local persistence helper.
   - Use a local display preference key; this is machine UI state, not archive
     data.
   - Restore and apply settings early during app boot to avoid visible font-size
     flicker.

5. Step 275.5: Wire chart text scales.
   - Chart Notes, PDA labels, Segment / Composite labels, SMT labels, Order
     Setup helper labels, Time Line / Killzone labels should read the chart text
     scale.
   - Keep all prices, timestamps, line colors, line widths, and object geometry
     unchanged unless text overlap requires spacing adjustments.

6. Step 275.6: Fix overflow at larger scales.
   - Check toolbar range input, period selector, Sub/Sub TF/Layout, Replay bar,
     Calendar cells, Target Progress rows, context menu, and three-dot menus.
   - Prefer flex wrap, stable min widths, and density variables over one-off
     hard-coded fixes.

7. Step 275.7: Validate.
   - Linux 1920x1080 default settings should look unchanged.
   - Simulate large viewport / Windows 4K usage with UI Scale 125% and 140%.
   - Cover Split on/off, Replay bar, Inspector Calendar, Chart Notes, right-click
     menu, and chart object labels.
   - Run full JS syntax check, targeted UI smoke if available, and
     `git diff --check`.

Execution notes:

- Each sub-step can be committed independently if implementation begins.
- Do not include runtime files, database files, or untracked deployment files in
  these commits.
- This step intentionally avoids automatic resolution detection.

Progress:

- Step 275.1 completed in `6d42e8d`: added `display/display-preferences.js`
  and early app initialization. Defaults reproduce the existing UI while
  exposing normalized `uiScale`, `chartTextScale`, and `inspectorDensity`
  settings plus CSS variable application.
- Step 275.2 completed: added CSS variables for UI, toolbar, Inspector, chart
  labels, controls, and panel density; wired the main visible surfaces
  including toolbar, context menu, Inspector, Calendar, Chart Note editor, and
  Replay controls to those variables.
