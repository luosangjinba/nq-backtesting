import { LAYOUT_COMMANDS, LAYOUT_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

const DEFAULT_VARIANT_BY_MODE = Object.freeze({
  single: 'single',
  triple: 'triple-columns',
  twice: 'twice-vertical',
});

function normalizeMode(mode = 'single') {
  const normalized = String(mode || 'single').trim();
  if (!Object.hasOwn(DEFAULT_VARIANT_BY_MODE, normalized)) {
    throw new Error(`Layout menu mode is unsupported: ${mode}`);
  }
  return normalized;
}

function readVariant(option, mode) {
  return String(option?.dataset?.v6LayoutVariant || DEFAULT_VARIANT_BY_MODE[mode] || '').trim();
}

function syncRootDataset(root, snapshot = {}) {
  root.dataset.layoutMode = normalizeMode(snapshot.mode);
  root.dataset.layoutVariant = readVariant({ dataset: { v6LayoutVariant: snapshot.variant } }, snapshot.mode);
  Object.entries(snapshot.sync || {}).forEach(([key, value]) => {
    root.dataset[`layoutSync${key[0].toUpperCase()}${key.slice(1)}`] = String(Boolean(value));
  });
}

export function mountLayoutMenuControl(root, {
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Layout menu control root is required.');
  }
  const options = [...root.querySelectorAll('[data-v6-layout-mode]')];
  const syncInputs = [...root.querySelectorAll('[data-v6-layout-sync]')];
  const details = root.querySelector('[data-v6-layout-menu-details]');
  if (!options.length || !syncInputs.length) {
    throw new Error('Layout menu control requires layout options and sync inputs.');
  }

  const abortController = new AbortController();
  const signal = abortController.signal;
  const unsubscribeCallbacks = [];
  const selectedVariantByMode = { ...DEFAULT_VARIANT_BY_MODE };
  let snapshot = null;

  function render(nextSnapshot = snapshot) {
    if (!nextSnapshot) return;
    snapshot = {
      ...nextSnapshot,
      sync: { ...(nextSnapshot.sync || {}) },
    };
    const currentMode = normalizeMode(snapshot.mode);
    const currentVariant = snapshot.variant || selectedVariantByMode[currentMode];
    selectedVariantByMode[currentMode] = currentVariant;
    syncRootDataset(root, snapshot);
    options.forEach((option) => {
      const mode = normalizeMode(option.dataset.v6LayoutMode);
      const selected = mode === currentMode && readVariant(option, mode) === currentVariant;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-checked', String(selected));
    });
    syncInputs.forEach((input) => {
      const key = input.dataset.v6LayoutSync;
      input.checked = Boolean(snapshot.sync?.[key]);
    });
  }

  async function refresh() {
    render(await dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT));
  }

  function closeDetails() {
    if (details) {
      details.open = false;
    }
  }

  function closeDetailsOnExternalTarget(target) {
    if (!details?.open || !target || details.contains?.(target)) {
      return;
    }
    closeDetails();
  }

  const ownerDocument = root.ownerDocument || details?.ownerDocument || globalThis.document;
  if (ownerDocument?.addEventListener && details) {
    ownerDocument.addEventListener('pointerdown', (event) => closeDetailsOnExternalTarget(event.target), { signal });
    ownerDocument.addEventListener('focusin', (event) => closeDetailsOnExternalTarget(event.target), { signal });
  }

  options.forEach((option) => {
    option.disabled = false;
    option.addEventListener('click', async () => {
      const mode = normalizeMode(option.dataset.v6LayoutMode);
      selectedVariantByMode[mode] = readVariant(option, mode);
      render({
        ...(snapshot || {}),
        mode,
        variant: selectedVariantByMode[mode],
        sync: snapshot?.sync || {},
      });
      closeDetails();
      try {
        render(await dispatchCommand(LAYOUT_COMMANDS.SET_MODE, {
          mode,
          variant: selectedVariantByMode[mode],
        }));
      } catch (error) {
        root.dataset.layoutMenuError = error?.message || String(error);
        await refresh().catch(() => null);
      }
    }, { signal });
  });

  syncInputs.forEach((input) => {
    input.disabled = false;
    input.addEventListener('change', async () => {
      const key = input.dataset.v6LayoutSync;
      const value = Boolean(input.checked);
      render({
        ...(snapshot || {}),
        mode: snapshot?.mode || 'single',
        sync: {
          ...(snapshot?.sync || {}),
          [key]: value,
        },
      });
      try {
        render(await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key, value }));
      } catch (error) {
        root.dataset.layoutMenuError = error?.message || String(error);
        await refresh().catch(() => null);
      }
    }, { signal });
  });

  if (typeof subscribeEvent === 'function') {
    unsubscribeCallbacks.push(
      subscribeEvent(LAYOUT_EVENTS.MODE_CHANGED, render),
      subscribeEvent(LAYOUT_EVENTS.SYNC_CHANGED, render),
      subscribeEvent(LAYOUT_EVENTS.ACTIVE_PANE_CHANGED, render),
    );
  }

  refresh().catch((error) => {
    root.dataset.layoutMenuError = error?.message || String(error);
  });

  return Object.freeze({
    destroy() {
      abortController.abort();
      while (unsubscribeCallbacks.length) {
        unsubscribeCallbacks.pop()();
      }
    },
    getState() {
      return snapshot ? {
        ...snapshot,
        sync: { ...(snapshot.sync || {}) },
      } : null;
    },
  });
}
