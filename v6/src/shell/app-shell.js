import { createWorkstationShellMarkup } from './workstation-shell.js';

export function renderAppShell(root) {
  const outlet = root.querySelector('[data-app-outlet]');
  if (!outlet) {
    throw new Error('V6 app outlet is missing.');
  }

  outlet.innerHTML = createWorkstationShellMarkup();
}
