import { createSessionBrowser } from '../../../src/session-browser-ui/public.js';

const root = document.querySelector('#root');
let route = '#/sessions';
let subscriber = null;
let unsubscribeCount = 0;

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
    return Object.freeze({ childCount: root.childElementCount, unsubscribeCount });
  },
  snapshot() {
    return Object.freeze({
      childCount: root.childElementCount,
      dialogPresent: root.querySelector('.create-dialog') !== null,
      route,
      unsubscribeCount,
    });
  },
});
root.dataset.scenario = 'ready';
