import { requireActivationGeneration } from '../activation-generation/public.js';
import { requireSessionId } from '../session-identity/public.js';
import { failViewport } from './viewport-error.js';

const PANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function requirePaneId(value) {
  if (typeof value !== 'string' || !PANE_ID_PATTERN.test(value)) {
    failViewport('VIEWPORT_PANE_ID_INVALID', 'Pane identity must be an exact opaque token.');
  }
  return value;
}

export function createViewportPaneScope({ activationGeneration, paneId, sessionId }) {
  return Object.freeze({
    activationGeneration: requireActivationGeneration(activationGeneration),
    paneId: requirePaneId(paneId),
    sessionId: requireSessionId(sessionId),
  });
}
