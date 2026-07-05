export function createWorkflowPanelCoordinator() {
  const panels = new Map();

  function register(id, controller) {
    if (!id || typeof controller?.setOpen !== 'function') {
      throw new Error('Workflow panel controller with setOpen is required.');
    }
    panels.set(id, controller);
    return () => {
      panels.delete(id);
    };
  }

  function closeOthers(activeId) {
    panels.forEach((controller, id) => {
      if (id !== activeId) {
        controller.setOpen(false);
      }
    });
  }

  return Object.freeze({
    closeOthers,
    register,
  });
}
