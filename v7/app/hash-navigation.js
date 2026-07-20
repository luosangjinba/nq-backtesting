/** Browser hash adapter; route state is URL state, never Session persistence. */
export function createHashNavigation(browserWindow) {
  return Object.freeze({
    read: () => browserWindow.location.hash || '#/sessions',
    go(hash) {
      if (browserWindow.location.hash === hash) browserWindow.dispatchEvent(new HashChangeEvent('hashchange'));
      else browserWindow.location.hash = hash;
    },
    subscribe(listener) {
      browserWindow.addEventListener('hashchange', listener);
      return () => browserWindow.removeEventListener('hashchange', listener);
    },
  });
}
