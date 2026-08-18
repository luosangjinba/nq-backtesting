function requireAddon(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string'
    || value.id.length === 0 || typeof value.mount !== 'function') {
    throw new TypeError('Pane add-on registration requires an id and mount().');
  }
  return value;
}

/**
 * Expose DOM-only Pane attachment points without giving feature UI access to
 * Chart, Replay, Bar Data, or Pane-set mutation owners.
 */
export function createPaneAddonRegistry() {
  const addons = new Map();
  const panes = new Map();
  let disposed = false;
  let workspaceDisabled = false;

  function mount(addon, pane) {
    const mounted = addon.mount(Object.freeze({
      chartHost: pane.chartHost,
      paneId: pane.paneId,
      shell: pane.shell,
    }));
    const attachment = mounted ?? Object.freeze({});
    if (typeof attachment.dispose !== 'function') {
      throw new TypeError(`Pane add-on ${addon.id} mount() requires dispose().`);
    }
    pane.attachments.set(addon.id, attachment);
    attachment.setWorkspaceDisabled?.(workspaceDisabled);
    if (pane.observation !== null) attachment.setCrosshairObservation?.(pane.observation);
  }

  function detach(pane, addonId) {
    const attachment = pane.attachments.get(addonId);
    if (!attachment) return;
    pane.attachments.delete(addonId);
    attachment.dispose();
  }

  function detachPane(paneId) {
    const pane = panes.get(paneId);
    if (!pane) return;
    for (const addonId of [...pane.attachments.keys()].reverse()) detach(pane, addonId);
    panes.delete(paneId);
  }

  return Object.freeze({
    attachPane({ chartHost, paneId, shell }) {
      if (disposed || panes.has(paneId) || !(chartHost instanceof HTMLElement)
        || !(shell instanceof HTMLElement)) {
        throw new TypeError('Pane add-on attachment point is invalid or duplicated.');
      }
      const pane = {
        attachments: new Map(), chartHost, observation: null, paneId, shell,
      };
      panes.set(paneId, pane);
      try {
        for (const addon of addons.values()) mount(addon, pane);
      } catch (error) {
        for (const addonId of [...pane.attachments.keys()].reverse()) detach(pane, addonId);
        panes.delete(paneId);
        throw error;
      }
    },
    detachPane,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const paneId of [...panes.keys()]) detachPane(paneId);
      addons.clear();
    },
    publishCrosshair(paneId, observation) {
      const pane = panes.get(paneId);
      if (!pane) return;
      pane.observation = observation;
      for (const attachment of pane.attachments.values()) {
        attachment.setCrosshairObservation?.(observation);
      }
    },
    register(value) {
      if (disposed) throw new TypeError('Pane add-on registry is disposed.');
      const addon = requireAddon(value);
      if (addons.has(addon.id)) throw new TypeError(`Pane add-on ${addon.id} is duplicated.`);
      addons.set(addon.id, addon);
      try {
        for (const pane of panes.values()) mount(addon, pane);
      } catch (error) {
        for (const pane of panes.values()) detach(pane, addon.id);
        addons.delete(addon.id);
        throw error;
      }
      let active = true;
      return Object.freeze({
        unregister() {
          if (!active) return;
          active = false;
          for (const pane of panes.values()) detach(pane, addon.id);
          addons.delete(addon.id);
        },
      });
    },
    setWorkspaceDisabled(disabled) {
      workspaceDisabled = disabled === true;
      for (const pane of panes.values()) {
        for (const attachment of pane.attachments.values()) {
          attachment.setWorkspaceDisabled?.(workspaceDisabled);
        }
      }
    },
  });
}
