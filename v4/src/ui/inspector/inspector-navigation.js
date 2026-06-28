export function renderInspectorBackAction(canPop) {
  if (!canPop) return '';
  return `
    <div class="inspector-return-bar">
      <button class="inspector-button secondary" data-inspector-action="inspector-back" type="button">
        Back
      </button>
    </div>
  `;
}
