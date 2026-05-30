import { section } from './render-utils.js';

export function renderArchiveActions() {
  return section(
    'Archive',
    `
      <details class="order-review-edit-section">
        <summary>Import / Export</summary>
        <button class="inspector-secondary" data-inspector-action="export-review" type="button">Export Review JSON</button>
        <button class="inspector-secondary" data-inspector-action="import-review" type="button">Import Review JSON</button>
        <button class="inspector-secondary" data-inspector-action="export-pda" type="button">Export PDA JSON</button>
        <button class="inspector-secondary" data-inspector-action="import-pda" type="button">Import PDA JSON</button>
        <button class="inspector-secondary" data-inspector-action="clear-saved" type="button">Clear Saved PDA</button>
        <input class="inspector-file-input" data-inspector-action="import-review-file" type="file" accept="application/json,.json" />
        <input class="inspector-file-input" data-inspector-action="import-pda-file" type="file" accept="application/json,.json" />
      </details>
    `
  );
}
