import { createSessionId, serializeSessionId } from '../session-identity/public.js';
import { createSessionDialog } from './create-dialog.js';
import { renderSessionBrowserSurface } from './surface.js';
import { createOpenedSessionViewModel, createSessionListViewModel } from './view-model.js';

function readRoute(hash) {
  const match = /^#\/session\/([^/]+)$/.exec(hash);
  if (!match) return Object.freeze({ screen: 'list', token: null });
  try {
    return Object.freeze({ screen: 'opened', token: decodeURIComponent(match[1]) });
  } catch {
    return Object.freeze({ screen: 'opened', token: '' });
  }
}

function requirePort(value, methods, name) {
  for (const method of methods) {
    if (typeof value?.[method] !== 'function') throw new TypeError(`${name} requires ${method}().`);
  }
  return value;
}

class SessionBrowserController {
  constructor(options) {
    this.root = options.root;
    this.store = options.store;
    this.navigation = requirePort(options.navigation, ['read', 'go', 'subscribe'], 'Navigation port');
    this.instruments = options.instruments;
    this.labels = Object.freeze(Object.fromEntries(options.instruments.map((item) => [item.id, item.label])));
    this.idFactory = options.idFactory;
    this.now = options.now;
    this.schedule = options.schedule;
    this.openedSessionSurface = options.openedSessionSurface ?? null;
    this.replayNavigationPreferences = options.replayNavigationPreferences ?? null;
    this.workstationSettings = options.workstationSettings ?? null;
    this.colorHistory = options.colorHistory ?? null;
    this.unavailableMessage = options.unavailableMessage;
    this.records = [];
    this.stopped = false;
    this.unsubscribe = null;
    this.dialog = createSessionDialog({
      dateAvailability: options.dateAvailability,
      instruments: this.instruments,
      onSubmit: (intent) => this.createSession(intent),
    });
    this.actions = Object.freeze({
      onCreate: () => this.dialog.open(),
      onOpen: (token) => this.navigation.go(`#\/session\/${encodeURIComponent(token)}`),
      onDelete: (token) => this.deleteSession(token),
      onBack: () => this.navigation.go('#/sessions'),
      onRetry: () => this.applyRoute(),
    });
  }

  commit(model) {
    if (this.stopped) return;
    this.openedSessionSurface?.unmount();
    renderSessionBrowserSurface(
      this.root,
      model,
      this.actions,
      this.workstationSettings?.snapshot().settings,
    );
    this.root.append(this.dialog.element);
  }

  renderList(state, message = null) {
    this.commit(createSessionListViewModel({
      state, records: this.records, instrumentLabels: this.labels, message,
    }));
  }

  refreshList() {
    try {
      this.records = this.store.listSessions();
      this.renderList('ready');
    } catch (error) {
      this.renderList('error', error.message);
    }
  }

  createSession(intent) {
    this.dialog.close();
    this.renderList('stale');
    this.schedule(() => {
      if (this.stopped) return;
      try {
        const record = this.store.createSession({
          ...intent,
          sessionId: createSessionId(this.idFactory()),
          nowEpochMs: this.now(),
        });
        const token = serializeSessionId(record.sessionId).value;
        this.navigation.go(`#\/session\/${encodeURIComponent(token)}`);
      } catch (error) {
        this.renderList('error', error.message);
      }
    });
  }

  deleteSession(token) {
    this.renderList('stale');
    this.schedule(() => {
      if (this.stopped) return;
      try {
        this.store.deleteSession(createSessionId(token));
        this.records = this.store.listSessions();
        this.renderList('ready');
      } catch (error) {
        this.renderList('error', error.message);
      }
    });
  }

  openSession(token) {
    this.commit(createOpenedSessionViewModel({ state: 'loading', record: null, instrumentLabels: this.labels }));
    this.schedule(() => {
      if (this.stopped) return;
      try {
        const record = this.store.activateSession(createSessionId(token), { nowEpochMs: this.now() });
        this.records = this.store.listSessions();
        const workspace = this.openedSessionSurface?.supports(record) === true;
        this.commit(createOpenedSessionViewModel({
          state: 'ready', record, instrumentLabels: this.labels, workspace,
        }));
        if (workspace) {
          this.openedSessionSurface.mount({
            initialNavigationSettings: this.replayNavigationPreferences.snapshot(),
            onBack: this.actions.onBack,
            onPersistWorkspaceCheckpoint: ({ checkpoint, layout, layoutSync }) => (
              this.store.saveWorkspaceCheckpoint(record.sessionId, {
                checkpoint,
                layout,
                layoutSync,
                nowEpochMs: this.now(),
              })
            ),
            onPersistReplayNavigationSettings: (settings) => this.replayNavigationPreferences.save(settings),
            record,
            root: this.root.querySelector('.replay-workspace-slot'),
            workstationSettings: this.workstationSettings,
            colorHistory: this.colorHistory,
          });
        }
      } catch {
        this.commit(createOpenedSessionViewModel({
          state: 'error', record: null, instrumentLabels: this.labels,
          message: 'This Session could not be opened. Return to the Session list and try again.',
        }));
      }
    });
  }

  applyRoute() {
    if (!this.store) {
      this.commit(createSessionListViewModel({
        state: 'unavailable', records: [], instrumentLabels: this.labels,
        message: this.unavailableMessage,
      }));
      return;
    }
    const route = readRoute(this.navigation.read());
    if (route.screen === 'opened') this.openSession(route.token);
    else this.refreshList();
  }

  start() {
    if (this.stopped || this.unsubscribe) return;
    this.commit(createSessionListViewModel({ state: 'loading', instrumentLabels: this.labels }));
    this.unsubscribe = this.navigation.subscribe(() => this.applyRoute());
    this.schedule(() => this.applyRoute());
  }

  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.openedSessionSurface?.unmount();
    this.dialog.dispose();
    this.root.replaceChildren();
  }
}

/**
 * Owner: session-store UI adapter.
 * Purpose: translate Session Browser DOM intents into explicit Session Store
 * commands while rendering only immutable view models.
 * Inputs: owned root, Session Store, navigation, identity/time/config ports.
 * Outputs: start/dispose controller API.
 * Side effects: owns DOM under root and one navigation subscription.
 * Errors: operation failures become visible error/unavailable states.
 */
export function createSessionBrowser(options) {
  if (!(options.root instanceof HTMLElement)) throw new TypeError('Session Browser requires an HTMLElement root.');
  requirePort(options.dateAvailability, ['loadAvailableDates'], 'Market date availability');
  if (options.openedSessionSurface) {
    requirePort(options.openedSessionSurface, ['mount', 'supports', 'unmount'], 'Opened Session surface');
    requirePort(options.replayNavigationPreferences, ['save', 'snapshot'], 'Replay navigation preferences');
    requirePort(
      options.workstationSettings,
      ['registerConsumer', 'save', 'snapshot'],
      'Workstation Settings',
    );
    requirePort(options.colorHistory, ['record', 'snapshot'], 'Color history');
  }
  const controller = new SessionBrowserController({
    ...options,
    now: options.now ?? (() => Date.now()),
    schedule: options.schedule ?? ((task) => queueMicrotask(task)),
  });
  return Object.freeze({
    start: () => controller.start(),
    dispose: () => controller.dispose(),
  });
}
