import { createSessionSummarySurfaceView } from '../session-summary/session-summary-surface-model.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSummarySurface(element, view) {
  element.innerHTML = `
    <div class="session-summary-card" role="dialog" aria-modal="false" aria-labelledby="v6-session-summary-title">
      <header>
        <div>
          <span>${escapeHtml(view.owner)}</span>
          <strong id="v6-session-summary-title">${escapeHtml(view.title)}</strong>
        </div>
        <button type="button" data-v6-session-summary-close aria-label="Close session summary">&times;</button>
      </header>
      <dl>
        ${view.fields.map((field) => `
          <div data-v6-session-summary-field="${escapeHtml(field.field)}">
            <dt>${escapeHtml(field.label)}</dt>
            <dd>${escapeHtml(field.value)}</dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `;
}

export function mountSessionSummarySurface(root) {
  if (!root) {
    throw new Error('Session summary root is required.');
  }

  let surface = root.querySelector('[data-v6-session-summary-surface]');
  if (!surface) {
    surface = document.createElement('section');
    surface.className = 'session-summary-surface';
    surface.dataset.v6SessionSummarySurface = '';
    surface.hidden = true;
    root.append(surface);
  }

  let currentView = null;
  let previousFocus = null;
  const closeListener = (event) => {
    if (event.target.closest?.('[data-v6-session-summary-close]')) {
      close();
    }
  };
  const keydownListener = (event) => {
    if (event.key === 'Escape' && !surface.hidden) {
      event.preventDefault();
      close();
    }
  };
  surface.addEventListener('click', closeListener);
  root.ownerDocument.addEventListener('keydown', keydownListener);

  function open(session = {}) {
    previousFocus = root.ownerDocument.activeElement;
    currentView = createSessionSummarySurfaceView(session);
    renderSummarySurface(surface, currentView);
    surface.hidden = false;
    surface.querySelector('[data-v6-session-summary-close]')?.focus();
    return getState();
  }

  function close() {
    const focusTarget = previousFocus;
    currentView = null;
    previousFocus = null;
    surface.hidden = true;
    surface.innerHTML = '';
    if (focusTarget?.isConnected && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
    return getState();
  }

  function getState() {
    return {
      open: !surface.hidden,
      owner: currentView?.owner || null,
      sessionId: currentView?.sessionId || null,
    };
  }

  return {
    close,
    getState,
    open,
    unmount() {
      surface.removeEventListener('click', closeListener);
      root.ownerDocument.removeEventListener('keydown', keydownListener);
      close();
    },
  };
}
