export function bindWorkflowPanelClose({
  close,
  closeButton,
  root,
  unsubscriptions,
} = {}) {
  if (typeof close !== 'function') {
    throw new Error('Workflow panel close handler is required.');
  }

  if (closeButton) {
    const listener = () => close();
    closeButton.addEventListener('click', listener);
    unsubscriptions?.push?.(() => closeButton.removeEventListener('click', listener));
  }

  if (root?.addEventListener) {
    const listener = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    root.addEventListener('keydown', listener);
    unsubscriptions?.push?.(() => root.removeEventListener('keydown', listener));
  }
}
