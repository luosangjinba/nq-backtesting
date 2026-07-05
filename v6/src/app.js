import { renderAppShell } from './shell/app-shell.js';

const root = document.querySelector('[data-v6-root]');

if (!root) {
  throw new Error('V6 root element is missing.');
}

renderAppShell(root);
root.dataset.booted = 'true';
