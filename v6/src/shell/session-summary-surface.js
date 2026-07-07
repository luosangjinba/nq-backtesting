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
  const closeListener = (event) => {
    if (event.target.closest?.('[data-v6-session-summary-close]')) {
      close();
    }
  };
  surface.addEventListener('click', closeListener);

  function open(session = {}) {
    currentView = createSessionSummarySurfaceView(session);
    renderSummarySurface(surface, currentView);
    surface.hidden = false;
    return getState();
  }

  function close() {
    currentView = null;
    surface.hidden = true;
    surface.innerHTML = '';
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
      close();
    },
  };
}
