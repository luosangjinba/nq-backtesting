export function createChartSettingsStatusBindings({
  root,
  getDraft,
}) {
  const presentationStatusTitleModeControls = Array.from(
    root.querySelectorAll('[data-presentation-status-title-mode]')
  );
  const presentationToggleControls = Array.from(root.querySelectorAll('[data-presentation-toggle]'));

  function render(draft) {
    presentationStatusTitleModeControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.statusTitleMode;
      }
    });
    presentationToggleControls.forEach((control) => {
      const key = control.dataset.presentationToggle;
      if (control.type === 'checkbox') {
        control.checked = Boolean(draft[key]);
      }
    });
  }

  function bindDraftEvents() {
    presentationStatusTitleModeControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.statusTitleMode = control.value;
      });
    });
    presentationToggleControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        const key = control.dataset.presentationToggle;
        if (!draft || !key || control.type !== 'checkbox') return;
        draft[key] = control.checked;
      });
    });
  }

  return {
    bindDraftEvents,
    render,
  };
}
