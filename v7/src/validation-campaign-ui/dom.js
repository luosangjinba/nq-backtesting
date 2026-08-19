export function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined) node.append(child);
  }
  return node;
}

export function field(label, control, hint = null) {
  return element('label', { className: 'validation-field' }, [
    element('span', { text: label }),
    control,
    hint ? element('small', { text: hint }) : null,
  ]);
}

export function button(text, onClick, className = 'validation-button') {
  const control = element('button', { className, text, type: 'button' });
  control.addEventListener('click', (event) => {
    try {
      Promise.resolve(onClick(event)).catch((error) => {
        control.dataset.actionError = 'true';
        control.title = error?.message ?? 'Validation Campaign action failed.';
        globalThis.alert?.(control.title);
      });
    } catch (error) {
      control.dataset.actionError = 'true';
      control.title = error?.message ?? 'Validation Campaign action failed.';
      globalThis.alert?.(control.title);
    }
  });
  return control;
}

export function statusBadge(text, tone = 'neutral') {
  return element('span', {
    className: `validation-status validation-status-${tone}`,
    text,
  });
}

export function formatNumber(value) {
  return value === null || value === undefined ? '—' : Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}
