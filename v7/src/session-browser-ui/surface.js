import { element, formatDateRange, formatDateTime, icon } from './dom-primitives.js';

function statePanel(state, message, onRetry) {
  if (state === 'loading') {
    return element('section', { className: 'state-panel state-loading', 'aria-busy': 'true', 'aria-label': 'Loading sessions' }, [
      element('div', { className: 'skeleton skeleton-title' }),
      element('div', { className: 'skeleton skeleton-copy' }),
      element('div', { className: 'skeleton skeleton-card' }),
      element('div', { className: 'skeleton skeleton-card' }),
    ]);
  }
  const unavailable = state === 'unavailable';
  return element('section', { className: `state-panel state-${state}`, role: state === 'error' ? 'alert' : 'status' }, [
    element('div', { className: 'state-icon' }, [icon(unavailable ? 'database' : 'warning')]),
    element('div', { className: 'state-copy' }, [
      element('h2', { text: unavailable ? 'Session storage unavailable' : 'Sessions could not be loaded' }),
      element('p', { text: message ?? (unavailable
        ? 'This browser cannot provide durable local storage. Enable site storage, then reload.'
        : 'Your saved sessions were not changed. Try loading them again.') }),
    ]),
    onRetry ? element('button', { className: 'button button-secondary', type: 'button', onClick: onRetry }, [
      icon('refresh'), element('span', { text: 'Try again' }),
    ]) : null,
  ]);
}

function sessionCard(card, actions, workstationSettings) {
  const instruments = element('div', { className: 'instrument-tags', 'aria-label': 'Instruments' });
  card.instruments.forEach((instrument) => instruments.append(
    element('span', { className: 'instrument-tag', text: instrument.label }),
  ));
  const standardActions = element('div', { className: 'session-card-actions' }, [
    element('button', {
      className: 'open-session-button', type: 'button',
      'aria-label': `Open ${card.name}`, onClick: () => actions.onOpen(card.id),
    }, [element('span', { text: 'Open' }), icon('chevronRight')]),
    element('button', {
      className: 'delete-session-button', type: 'button',
      'aria-label': `Delete ${card.name}`,
    }, [icon('trash'), element('span', { text: 'Delete' })]),
  ]);
  const cancelDelete = element('button', {
    className: 'session-delete-cancel', type: 'button', text: 'Cancel',
  });
  const confirmDelete = element('button', {
    className: 'session-delete-confirm', type: 'button', text: 'Delete',
    'aria-label': `Confirm delete ${card.name}`, onClick: () => actions.onDelete(card.id),
  });
  const confirmation = element('div', {
    className: 'session-delete-confirmation', role: 'group',
    'aria-label': `Confirm deletion of ${card.name}`,
  }, [
    element('span', { className: 'session-delete-question', text: 'Delete permanently?' }),
    cancelDelete,
    confirmDelete,
  ]);
  confirmation.hidden = true;
  const deleteButton = standardActions.querySelector('.delete-session-button');
  deleteButton.addEventListener('click', () => {
    standardActions.hidden = true;
    confirmation.hidden = false;
    confirmDelete.focus();
  });
  cancelDelete.addEventListener('click', () => {
    confirmation.hidden = true;
    standardActions.hidden = false;
    deleteButton.focus();
  });
  return element('article', { className: 'session-card', dataset: { sessionId: card.id } }, [
    element('div', { className: 'session-card-marker' }, [icon('layers')]),
    element('div', { className: 'session-card-body' }, [
      element('div', { className: 'session-card-heading' }, [
        element('div', {}, [
          element('h3', { text: card.name }),
        ]),
        instruments,
      ]),
      element('div', { className: 'session-card-meta' }, [
        element('span', {}, [icon('calendar'), element('span', {
          text: formatDateRange(card.startEpochMs, card.endEpochMs, workstationSettings),
        })]),
      ]),
    ]),
    element('div', { className: 'session-card-action-slot' }, [standardActions, confirmation]),
  ]);
}

function listScreen(model, actions, workstationSettings) {
  const header = element('header', { className: 'page-header' }, [
    element('div', {}, [
      element('span', { className: 'eyebrow', text: 'Practice workspace' }),
      element('h1', { text: 'Replay sessions' }),
      element('p', { text: 'Create focused historical practice windows and return to them without crossing context.' }),
    ]),
    element('button', { className: 'button button-primary', type: 'button', onClick: actions.onCreate }, [
      icon('plus'), element('span', { text: 'New session' }),
    ]),
  ]);
  const content = element('div', { className: 'page-content' });
  if (model.state === 'loading' || model.state === 'unavailable'
    || (model.state === 'error' && model.cards.length === 0)) {
    content.append(statePanel(model.state, model.message, model.state === 'error' ? actions.onRetry : null));
  } else if (model.state === 'empty') {
    content.append(element('section', { className: 'empty-state' }, [
      element('div', { className: 'empty-visual' }, [
        element('span', { className: 'empty-orbit orbit-one' }),
        element('span', { className: 'empty-orbit orbit-two' }),
        element('div', { className: 'empty-icon' }, [icon('sessions')]),
      ]),
      element('h2', { text: 'Build your first replay session' }),
      element('p', { text: 'Choose a historical window and one or more instruments. Market bars are loaded only when the replay workspace is available.' }),
      element('button', { className: 'button button-primary', type: 'button', onClick: actions.onCreate }, [
        icon('plus'), element('span', { text: 'Create first session' }),
      ]),
    ]));
  } else {
    const section = element('section', { className: 'sessions-section', 'aria-busy': model.state === 'stale' ? 'true' : 'false' }, [
      model.state === 'error' ? element('div', { className: 'inline-alert', role: 'alert' }, [
        icon('warning'),
        element('span', { text: model.message ?? 'The action failed. Your saved sessions were not changed.' }),
        element('button', { className: 'button button-ghost', type: 'button', text: 'Dismiss', onClick: actions.onRetry }),
      ]) : null,
      element('div', { className: 'section-heading' }, [
        element('div', {}, [
          element('h2', { text: 'Your sessions' }),
          element('p', { text: `${model.cards.length} saved ${model.cards.length === 1 ? 'session' : 'sessions'}` }),
        ]),
        element('button', { className: 'icon-button', type: 'button', 'aria-label': 'Refresh sessions', onClick: actions.onRetry }, [icon('refresh')]),
      ]),
      element('div', { className: 'session-list' }, model.cards.map(
        (card) => sessionCard(card, actions, workstationSettings),
      )),
    ]);
    if (model.state === 'stale') section.append(element('div', { className: 'refresh-gate', 'aria-label': 'Refreshing sessions' }, [
      element('span', { className: 'spinner' }), element('span', { text: 'Updating sessions…' }),
    ]));
    content.append(section);
  }
  return element('div', { className: 'page page-sessions' }, [header, content]);
}

function openedScreen(model, actions, workstationSettings) {
  const content = element('div', { className: 'page-content opened-content' });
  if (model.state === 'loading' || model.state === 'error' || model.state === 'unavailable') {
    content.append(statePanel(model.state, model.message, model.state === 'error' ? actions.onBack : null));
  } else {
    const session = model.session;
    if (model.workspace) {
      content.classList.add('replay-opened-content');
      content.append(element('section', {
        className: 'replay-workspace-slot',
        'aria-label': `${session.name} replay workspace`,
      }));
    } else content.append(
      element('section', { className: 'session-hero' }, [
        element('div', { className: 'session-hero-mark' }, [icon('layers')]),
        element('div', {}, [
          element('span', { className: 'eyebrow', text: 'Selected session' }),
          element('h1', { text: session.name }),
          element('div', { className: 'instrument-tags' }, session.instruments.map((item) =>
            element('span', { className: 'instrument-tag', text: item.label }))),
        ]),
      ]),
      element('section', { className: 'session-summary-grid' }, [
        element('article', { className: 'summary-card' }, [
          element('span', { className: 'summary-icon' }, [icon('calendar')]),
          element('span', { className: 'summary-label', text: 'Historical window' }),
          element('strong', {
            text: formatDateRange(session.startEpochMs, session.endEpochMs, workstationSettings),
          }),
        ]),
        element('article', { className: 'summary-card' }, [
          element('span', { className: 'summary-icon' }, [icon('clock')]),
          element('span', { className: 'summary-label', text: 'Last opened' }),
          element('strong', { text: formatDateTime(session.updatedAtEpochMs, workstationSettings) }),
        ]),
      ]),
      element('section', { className: 'foundation-notice' }, [
        element('div', {}, [
          element('h2', { text: 'Session details saved locally' }),
          element('p', { text: 'Your market selection and historical window are ready. Market data stays out of the Session list and loads only inside the replay workspace.' }),
        ]),
      ]),
    );
  }
  const header = element('header', { className: 'opened-header' }, [
      element('button', { className: 'button button-ghost', type: 'button', onClick: actions.onBack }, [
        icon('arrowLeft'), element('span', { text: 'All sessions' }),
      ]),
      element('span', { className: 'workspace-status' }, [element('span', { className: 'status-dot' }), element('span', { text: 'Local workspace' })]),
    ]);
  return element('div', { className: 'page page-opened' }, [model.workspace ? null : header, content]);
}

function syncPresentation(snapshot) {
  const status = snapshot?.status ?? 'local';
  return {
    badge: {
      conflict: 'Conflict', offline: 'Local-first', synced: 'Synced', syncing: 'Syncing',
    }[status] ?? 'Local-first',
    note: snapshot?.message ?? 'Stored on this device',
    status,
  };
}

function stateSyncAlert(snapshot, actions) {
  const status = snapshot?.status ?? 'local';
  const alert = element('aside', {
    className: 'state-sync-alert',
    role: 'alert',
    dataset: { stateSyncAlert: '' },
  }, [
    element('strong', {
      dataset: { stateSyncAlertTitle: '' },
      text: status === 'offline' ? 'Server sync offline' : 'Saved-state conflict',
    }),
    element('span', {
      dataset: { stateSyncAlertMessage: '' },
      text: snapshot?.message ?? 'This device and the server contain different saved state.',
    }),
    element('div', {
      className: 'state-sync-alert-actions',
      dataset: { stateSyncConflictActions: '' },
    }, [
      element('button', {
        className: 'button button-secondary', type: 'button', text: 'Use server',
        onClick: actions.onUseServerState,
      }),
      element('button', {
        className: 'button button-primary', type: 'button', text: 'Keep this device',
        onClick: actions.onUseDeviceState,
      }),
    ]),
    element('div', {
      className: 'state-sync-alert-actions',
      dataset: { stateSyncOfflineActions: '' },
    }, [
      element('button', {
        className: 'button button-primary', type: 'button', text: 'Retry sync',
        onClick: actions.onRetryStateSync,
      }),
    ]),
  ]);
  alert.querySelector('[data-state-sync-conflict-actions]').hidden = status !== 'conflict';
  alert.querySelector('[data-state-sync-offline-actions]').hidden = status !== 'offline';
  alert.hidden = !['conflict', 'offline'].includes(status);
  return alert;
}

/** Update sync-only DOM without remounting Session or Replay owners. */
export function updateStateSyncPresentation(root, snapshot) {
  const presentation = syncPresentation(snapshot);
  const footer = root.querySelector('[data-state-sync-status]');
  if (footer) {
    footer.dataset.stateSyncStatus = presentation.status;
    const badge = footer.querySelector('.foundation-badge');
    const note = footer.querySelector('.local-note');
    if (badge) badge.textContent = presentation.badge;
    if (note) note.textContent = presentation.note;
  }
  const alert = root.querySelector('[data-state-sync-alert]');
  if (alert) {
    const conflict = presentation.status === 'conflict';
    const offline = presentation.status === 'offline';
    alert.hidden = !conflict && !offline;
    const title = alert.querySelector('[data-state-sync-alert-title]');
    const message = alert.querySelector('[data-state-sync-alert-message]');
    const conflictActions = alert.querySelector('[data-state-sync-conflict-actions]');
    const offlineActions = alert.querySelector('[data-state-sync-offline-actions]');
    if (title) title.textContent = offline ? 'Server sync offline' : 'Saved-state conflict';
    if (message) message.textContent = presentation.note;
    if (conflictActions) conflictActions.hidden = !conflict;
    if (offlineActions) offlineActions.hidden = !offline;
  }
}

function shell(content, { immersive = false, stateSync = null, syncActions } = {}) {
  const sync = syncPresentation(stateSync);
  return element('div', { className: 'workstation-shell' }, [
    immersive ? null : element('aside', { className: 'app-rail', 'aria-label': 'Primary navigation' }, [
      element('a', { className: 'product-mark', href: '#/sessions', 'aria-label': 'Replay Lab sessions' }, [
        element('span', { className: 'product-glyph' }, [icon('layers')]),
        element('span', { className: 'product-name', text: 'Replay Lab' }),
      ]),
      element('nav', {}, [
        element('a', { className: 'rail-link is-active', href: '#/sessions' }, [icon('sessions'), element('span', { text: 'Sessions' })]),
        element('a', { className: 'rail-link', href: './data-acquisition.html' }, [icon('database'), element('span', { text: 'Data acquisition' })]),
      ]),
      element('div', { className: 'rail-footer', dataset: { stateSyncStatus: sync.status } }, [
        element('span', { className: 'foundation-badge', text: sync.badge }),
        element('span', { className: 'local-note', text: sync.note }),
      ]),
    ]),
    element('main', { className: `main-surface${immersive ? ' main-surface-immersive' : ''}` }, [content]),
    stateSyncAlert(stateSync, syncActions),
  ]);
}

/** Render one complete, atomic Session Browser snapshot into its owned root. */
export function renderSessionBrowserSurface(root, model, actions, workstationSettings, stateSync = null) {
  const content = model.screen === 'opened'
    ? openedScreen(model, actions, workstationSettings)
    : listScreen(model, actions, workstationSettings);
  root.replaceChildren(shell(content, {
    immersive: model.screen === 'opened' && model.workspace,
    stateSync,
    syncActions: actions,
  }));
  root.dataset.viewState = model.state;
  root.dataset.screen = model.screen;
}
