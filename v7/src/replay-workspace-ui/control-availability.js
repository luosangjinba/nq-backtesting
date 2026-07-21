/** Keep transient transaction locks interactive-safe without visually flashing controls. */
export function setControlDisabled(control, { disabled, preserveVisual = false }) {
  control.disabled = disabled;
  if (disabled && preserveVisual) control.dataset.pendingLock = 'true';
  else delete control.dataset.pendingLock;
}

export function setControlsDisabled(controls, options) {
  for (const control of controls) setControlDisabled(control, options);
}
