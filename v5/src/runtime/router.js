export function createRouter({ root, outlet, routes, fallbackRouteId }) {
  if (!outlet) {
    throw new Error('Router outlet is required.');
  }

  const routeMap = new Map(routes.map((route) => [route.id, route]));
  if (!routeMap.has(fallbackRouteId)) {
    throw new Error(`Fallback route "${fallbackRouteId}" is not registered.`);
  }

  let currentRouteId = null;
  let currentParams = {};
  let currentElement = null;
  const routeLinkRoot = root || outlet;

  function render(routeId, params = {}) {
    const route = routeMap.get(routeId) || routeMap.get(fallbackRouteId);
    currentElement?.dispose?.();
    currentRouteId = route.id;
    currentParams = { ...params };
    currentElement = route.render({ params: currentParams });
    if (routeLinkRoot?.dataset) {
      routeLinkRoot.dataset.currentRoute = currentRouteId;
    }
    outlet.replaceChildren(currentElement);
    routeLinkRoot.querySelectorAll?.('[data-route-link]').forEach((button) => {
      button.toggleAttribute('aria-current', button.dataset.routeLink === currentRouteId);
    });
  }

  return {
    start() {
      render(fallbackRouteId);
    },
    navigate(routeId, params = {}) {
      render(routeId, params);
      return { routeId: currentRouteId, params: { ...currentParams } };
    },
    getCurrentRouteId() {
      return currentRouteId;
    },
    getCurrentParams() {
      return { ...currentParams };
    },
  };
}
