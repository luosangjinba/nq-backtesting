export const CHART_EVENTS = Object.freeze({
  READY: 'chart:ready',
});

function createEmptyState() {
  return {
    bars: [],
  };
}

function renderChartFrame(host, state) {
  host.replaceChildren();
  host.dataset.chartRuntimeMounted = 'true';

  const canvas = document.createElement('div');
  canvas.className = 'chart-runtime-canvas';
  canvas.dataset.chartCanvas = 'true';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Chart runtime canvas');

  const empty = document.createElement('span');
  empty.className = 'chart-empty-state';
  empty.textContent = state.bars.length ? '' : 'Chart runtime ready';
  canvas.append(empty);

  host.append(canvas);
}

export function createChartRuntime() {
  const mountedHosts = new WeakSet();
  const state = createEmptyState();
  let rootElement = null;
  let observer = null;
  let emit = () => {};

  function mountHost(host) {
    if (!host || mountedHosts.has(host)) return;
    mountedHosts.add(host);
    renderChartFrame(host, state);
    emit(CHART_EVENTS.READY, { host });
  }

  function mountAvailableHosts() {
    rootElement
      ?.querySelectorAll('[data-chart-host]')
      .forEach((host) => mountHost(host));
  }

  function start({ root, emitEvent } = {}) {
    rootElement = root;
    emit = emitEvent || emit;
    mountAvailableHosts();

    observer = new MutationObserver(() => {
      mountAvailableHosts();
    });
    observer.observe(rootElement, {
      childList: true,
      subtree: true,
    });
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    rootElement = null;
  }

  return {
    id: 'runtime.chart',
    start,
    stop,
  };
}
