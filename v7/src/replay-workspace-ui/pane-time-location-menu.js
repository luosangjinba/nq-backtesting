function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Own the DOM-only context menu for one explicit cross-Pane time-location command. */
export function createPaneTimeLocationMenu({ onChoose }) {
  const title = element('strong', { className: 'pane-time-location-title' });
  const subtitle = element('span', { className: 'pane-time-location-subtitle' });
  const actions = element('div', { className: 'pane-time-location-actions' });
  const root = element('div', { className: 'pane-time-location-menu' }, [title, subtitle, actions]);
  root.hidden = true;
  root.setAttribute('aria-label', 'Locate selected candle time');
  root.setAttribute('role', 'menu');
  let current = null;

  function close() {
    current = null;
    root.hidden = true;
    root.replaceChildren(title, subtitle, actions);
    actions.replaceChildren();
  }

  function choose(targetPaneIds) {
    const model = current;
    close();
    if (model) onChoose({ selection: model.selection, targetPaneIds });
  }

  function action(label, targetPaneIds, all = false) {
    const button = element('button', {
      className: `pane-time-location-action${all ? ' is-all' : ''}`,
      text: label,
      type: 'button',
    });
    button.setAttribute('role', 'menuitem');
    button.addEventListener('click', () => choose(targetPaneIds), { once: true });
    return button;
  }

  function onDocumentPointerDown(event) {
    if (!root.hidden && !root.contains(event.target)) close();
  }

  function onDocumentKeydown(event) {
    if (root.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function onWindowChange() { close(); }
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('blur', onWindowChange);
  window.addEventListener('resize', onWindowChange);

  return Object.freeze({
    close,
    dispose() {
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      document.removeEventListener('keydown', onDocumentKeydown);
      window.removeEventListener('blur', onWindowChange);
      window.removeEventListener('resize', onWindowChange);
      close();
      root.remove();
    },
    open(model) {
      close();
      current = model;
      title.textContent = `Locate ${model.timeLabel}`;
      subtitle.textContent = `From ${model.sourceLabel}`;
      if (model.targets.length > 1) {
        actions.append(action(
          'All other panes',
          model.targets.map(({ paneId }) => paneId),
          true,
        ));
      }
      for (const target of model.targets) {
        actions.append(action(`Locate in ${target.label}`, [target.paneId]));
      }
      root.hidden = false;
      const rect = root.getBoundingClientRect();
      const margin = 8;
      root.style.left = `${Math.max(margin, Math.min(model.clientX, window.innerWidth - rect.width - margin))}px`;
      root.style.top = `${Math.max(margin, Math.min(model.clientY, window.innerHeight - rect.height - margin))}px`;
      actions.querySelector('button')?.focus({ preventScroll: true });
    },
    root,
  });
}
