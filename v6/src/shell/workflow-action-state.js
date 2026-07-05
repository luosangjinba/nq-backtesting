export function setWorkflowActionOpen(toggle, open) {
  if (!toggle) return;
  const active = Boolean(open);
  if (typeof toggle.classList?.toggle === 'function') {
    toggle.classList.toggle('is-active', active);
  }
  if (toggle.dataset) {
    toggle.dataset.v6WorkflowActive = String(active);
  }
  toggle.setAttribute?.('aria-expanded', String(active));
  toggle.setAttribute?.('aria-pressed', String(active));
}
