function node(tag, className, text) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

/** Own the compact V6-derived interval menu DOM without owning projection state. */
export function createTimeframeMenu({ groups, onChoose }) {
  const root = node('div', 'timeframe-menu-anchor timeframe-control');
  const toggle = node('button', 'timeframe-toggle', '1m');
  const menu = node('div', 'timeframe-menu');
  const options = new Map();
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Chart timeframe');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'menu');
  menu.hidden = true;
  menu.setAttribute('aria-label', 'Chart timeframe');
  menu.setAttribute('role', 'menu');

  for (const group of groups) {
    const section = node('section', 'timeframe-menu-section');
    section.setAttribute('aria-label', group.label);
    section.append(node('div', 'timeframe-menu-heading', group.label));
    for (const item of group.items) {
      const option = node('button', 'timeframe-menu-option', item.menuLabel ?? item.label);
      option.type = 'button';
      option.dataset.timeframeId = item.id;
      option.setAttribute('role', item.unavailable ? 'menuitem' : 'menuitemradio');
      if (item.unavailable) {
        option.disabled = true;
        option.title = 'Requires session-aware calendar aggregation';
      } else {
        option.setAttribute('aria-checked', 'false');
        option.addEventListener('click', () => {
          syncValue(item.id);
          onChoose(item.id);
          close();
        });
        options.set(item.id, Object.freeze({ item, option }));
      }
      section.append(option);
    }
    menu.append(section);
  }

  function close() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function syncValue(id) {
    const selected = options.get(id);
    if (!selected) return;
    toggle.textContent = selected.item.label;
    for (const [optionId, entry] of options) {
      entry.option.setAttribute('aria-checked', String(optionId === id));
    }
  }

  function onDocumentClick(event) {
    if (!menu.hidden && !root.contains(event.target)) close();
  }

  function onDocumentKeydown(event) {
    if (event.key === 'Escape') close();
  }

  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  root.append(toggle, menu);

  return Object.freeze({
    dispose() {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      root.remove();
    },
    root,
    setDisabled(disabled) { toggle.disabled = disabled; },
    setValue: syncValue,
  });
}
