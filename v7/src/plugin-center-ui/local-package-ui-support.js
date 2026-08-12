import { element } from './dom-primitives.js';

export function localPackageErrorCopy(error, fallback = 'Local package command failed.') {
  const code = typeof error?.code === 'string' ? `${error.code} · ` : '';
  return `${code}${error?.message ?? fallback}`;
}

export function localPackageDefinition(title, values, empty = 'None') {
  const root = element('div', { className: 'core-plugin-definition-list' }, [
    element('dt', { text: title }),
  ]);
  for (const value of values.length === 0 ? [empty] : values) {
    root.append(element('dd', { text: value }));
  }
  return root;
}

export function localPackageFeedback() {
  const root = element('p', { className: 'core-plugin-feedback local-plugin-feedback' });
  root.hidden = true;
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('role', 'status');
  return Object.freeze({
    clear() { root.hidden = true; root.textContent = ''; root.dataset.kind = ''; },
    root,
    show(message, kind = 'info') {
      root.textContent = message;
      root.dataset.kind = kind;
      root.hidden = message.length === 0;
    },
  });
}

export function localPackageButton(text, primary = false) {
  return element('button', {
    className: primary ? 'core-plugin-primary-button' : 'core-plugin-secondary-button',
    text,
    type: 'button',
  });
}

export function inactiveDisclosure() {
  return element('section', { className: 'local-plugin-inactive-note' }, [
    element('strong', { text: 'Installed does not mean active' }),
    element('p', {
      text: 'External package execution is unavailable in P1b. This package cannot run, contribute UI, or control ModuleHost.',
    }),
  ]);
}
