import { getDrawingSets, isDrawingSetFocused, locateDrawingSet } from '../../segment/drawing-set-list.js';

export function renderDrawingSetList() {
  const sets = getDrawingSets();
  const rows = sets.length
    ? sets
        .map(
          (set) => {
            const isFocused = isDrawingSetFocused(set.type, set.id);
            return `
            <button class="drawing-set-row${isFocused ? ' active' : ''}" data-inspector-action="drawing-set-locate" data-set-type="${set.type}" data-set-id="${set.id}" type="button" aria-pressed="${isFocused ? 'true' : 'false'}">
              <span class="drawing-set-main">${set.label}</span>
              <span class="drawing-set-meta">${set.detail}</span>
            </button>
          `;
          }
        )
        .join('')
    : '<div class="drawing-set-empty">No segment or composite sets.</div>';

  return `
    <section class="inspector-section drawing-set-section">
      <div class="inspector-section-title">Structure Sets</div>
      <div class="drawing-set-list">${rows}</div>
    </section>
  `;
}

export function createDrawingSetActionController() {
  function handleClick(action, actionEl) {
    if (action !== 'drawing-set-locate') return false;
    locateDrawingSet(actionEl.dataset.setType, actionEl.dataset.setId);
    return true;
  }

  return { handleClick };
}
