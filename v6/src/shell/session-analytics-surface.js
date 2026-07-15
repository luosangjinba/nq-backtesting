import { createSessionAnalyticsSurfaceView } from '../session-analytics/session-analytics-surface-model.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderAnalyticsSurface(element, view) {
  element.innerHTML = `
    <div class="session-analytics-card" role="dialog" aria-modal="false" aria-labelledby="v6-session-analytics-title">
      <header>
        <div>
          <span>${escapeHtml(view.owner)}</span>
          <strong id="v6-session-analytics-title">${escapeHtml(view.title)}</strong>
        </div>
        <button type="button" data-v6-session-analytics-close aria-label="Close session stats">&times;</button>
      </header>
      <section aria-label="Unavailable metrics">
        <div class="session-analytics-metrics">
          ${view.metricFields.map((field) => `
            <article data-v6-session-analytics-metric="${escapeHtml(field.field)}" data-v6-session-analytics-metric-status="${escapeHtml(field.status)}">
              <span>${escapeHtml(field.label)}</span>
              <strong>${escapeHtml(field.value)}</strong>
            </article>
          `).join('')}
        </div>
      </section>
      <dl>
        ${view.metadataFields.map((field) => `
          <div data-v6-session-analytics-field="${escapeHtml(field.field)}">
            <dt>${escapeHtml(field.label)}</dt>
            <dd>${escapeHtml(field.value)}</dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `;
}

export function mountSessionAnalyticsSurface(root) {
  if (!root) {
    throw new Error('Session analytics root is required.');
  }

  let surface = root.querySelector('[data-v6-session-analytics-surface]');
  if (!surface) {
    surface = document.createElement('section');
    surface.className = 'session-analytics-surface';
    surface.dataset.v6SessionAnalyticsSurface = '';
    surface.hidden = true;
    root.append(surface);
  }

  let currentView = null;
  let previousFocus = null;
  const pointerdownListener = (event) => {
    if (surface.hidden || surface.contains(event.target)) return;
    close();
  };
  const closeListener = (event) => {
    if (event.target.closest?.('[data-v6-session-analytics-close]')) {
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
  root.ownerDocument.addEventListener('pointerdown', pointerdownListener);
  root.ownerDocument.addEventListener('keydown', keydownListener);

  function open(session = {}, { anchor = null } = {}) {
    previousFocus = root.ownerDocument.activeElement;
    currentView = createSessionAnalyticsSurfaceView(session);
    renderAnalyticsSurface(surface, currentView);
    const row = anchor?.closest?.('[data-v6-dashboard-session-row]');
    if (row) row.append(surface);
    surface.hidden = false;
    surface.querySelector('[data-v6-session-analytics-close]')?.focus();
    return getState();
  }

  function close() {
    const focusTarget = previousFocus;
    currentView = null;
    previousFocus = null;
    surface.hidden = true;
    surface.innerHTML = '';
    if (surface.parentElement !== root) root.append(surface);
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
      root.ownerDocument.removeEventListener('pointerdown', pointerdownListener);
      root.ownerDocument.removeEventListener('keydown', keydownListener);
      close();
    },
  };
}
