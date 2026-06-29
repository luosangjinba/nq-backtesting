export function createRouter({ outlet, routes, fallbackRouteId }) {
  if (!outlet) {
    throw new Error('Router outlet is required.');
  }

  const routeMap = new Map(routes.map((route) => [route.id, route]));
  if (!routeMap.has(fallbackRouteId)) {
    throw new Error(`Fallback route "${fallbackRouteId}" is not registered.`);
  }

  let currentRouteId = null;

  function render(routeId) {
    const route = routeMap.get(routeId) || routeMap.get(fallbackRouteId);
    currentRouteId = route.id;
    outlet.replaceChildren(route.render());
    document.querySelectorAll('[data-route-link]').forEach((button) => {
      button.toggleAttribute('aria-current', button.dataset.routeLink === currentRouteId);
    });
  }

  return {
    start() {
      render(fallbackRouteId);
    },
    navigate(routeId) {
      render(routeId);
      return { routeId: currentRouteId };
    },
    getCurrentRouteId() {
      return currentRouteId;
    },
  };
}
