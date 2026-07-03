export function createChartSettingsStatusBindings({
  root,
  getDraft,
}) {
  const presentationStatusTitleModeControls = Array.from(
    root.querySelectorAll('[data-presentation-status-title-mode]')
  );
  const presentationToggleControls = Array.from(root.querySelectorAll('[data-presentation-toggle]'));
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

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
      const handleChange = () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.statusTitleMode = control.value;
      };
      addListener(control, 'change', handleChange);
    });
    presentationToggleControls.forEach((control) => {
      const handleChange = () => {
        const draft = getDraft();
        const key = control.dataset.presentationToggle;
        if (!draft || !key || control.type !== 'checkbox') return;
        draft[key] = control.checked;
      };
      addListener(control, 'change', handleChange);
    });
  }

  function dispose() {
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
  }

  return {
    bindDraftEvents,
    dispose,
    render,
  };
}
