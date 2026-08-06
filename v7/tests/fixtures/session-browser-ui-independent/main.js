import { createSessionBrowser } from '../../../src/session-browser-ui/public.js';

const root = document.querySelector('#root');
let route = '#/sessions';
let subscriber = null;
let unsubscribeCount = 0;
let syncSubscriber = null;
let stateSyncUnsubscribeCount = 0;
let retryCount = 0;
let resolvedStrategy = null;
let syncSnapshot = Object.freeze({
  message: 'Saved on this device; server sync is offline.',
  revision: null,
  status: 'offline',
  userId: null,
});

function publishSync(next) {
  syncSnapshot = Object.freeze({ ...syncSnapshot, ...next });
  syncSubscriber?.(syncSnapshot);
}

const browser = createSessionBrowser({
  dateAvailability: {
    loadAvailableDates: async () => Object.freeze({}),
  },
  idFactory: () => 'independent-session',
  instruments: [
    { id: 'instrument.cme.nq', label: 'NQ' },
    { id: 'instrument.cme.es', label: 'ES' },
  ],
  navigation: {
    go(nextRoute) {
      route = nextRoute;
      subscriber?.();
    },
    read: () => route,
    subscribe(callback) {
      subscriber = callback;
      return () => {
        unsubscribeCount += 1;
        subscriber = null;
      };
    },
  },
  root,
  schedule: (task) => task(),
  stateSync: {
    async resolveConflict(strategy) {
      resolvedStrategy = strategy;
      publishSync({ message: 'Synced as reviewer', status: 'synced', userId: 'reviewer' });
      return true;
    },
    async retry() {
      retryCount += 1;
      publishSync({ message: 'Synced as reviewer', status: 'synced', userId: 'reviewer' });
      return syncSnapshot;
    },
    snapshot: () => syncSnapshot,
    subscribe(callback) {
      syncSubscriber = callback;
      return () => {
        stateSyncUnsubscribeCount += 1;
        syncSubscriber = null;
      };
    },
  },
  store: {
    listSessions: () => Object.freeze([]),
  },
  unavailableMessage: null,
});

browser.start();
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

globalThis.__sessionBrowserIndependent = Object.freeze({
  dispose() {
    browser.dispose();
    return Object.freeze({
      childCount: root.childElementCount,
      stateSyncUnsubscribeCount,
      unsubscribeCount,
    });
  },
  showConflict() {
    publishSync({
      message: 'This device and the server contain different saved state.',
      revision: 2,
      status: 'conflict',
      userId: 'reviewer',
    });
  },
  snapshot() {
    return Object.freeze({
      childCount: root.childElementCount,
      dialogPresent: root.querySelector('.create-dialog') !== null,
      resolvedStrategy,
      retryCount,
      route,
      stateSyncAlertHidden: root.querySelector('[data-state-sync-alert]')?.hidden ?? null,
      stateSyncStatus: root.querySelector('[data-state-sync-status]')?.dataset.stateSyncStatus ?? null,
      stateSyncTitle: root.querySelector('[data-state-sync-alert-title]')?.textContent ?? null,
      stateSyncUnsubscribeCount,
      unsubscribeCount,
    });
  },
});
root.dataset.scenario = 'ready';
