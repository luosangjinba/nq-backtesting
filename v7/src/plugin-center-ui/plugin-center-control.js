import {
  element,
  parameterControl,
  statusBadge,
  toggleControl,
} from './dom-primitives.js';

function requirePorts({ confirmDependencyImpact, onRestart, profile }) {
  for (const method of [
    'discardPending', 'prepare', 'restartReceipt', 'snapshot', 'stage', 'subscribe',
    'validateRestartReceipt',
  ]) {
    if (typeof profile?.[method] !== 'function') {
      throw new TypeError(`Plugin Center requires profile.${method}().`);
    }
  }
  if (typeof confirmDependencyImpact !== 'function' || typeof onRestart !== 'function') {
    throw new TypeError('Plugin Center requires confirmation and restart command ports.');
  }
}

function searchMatches(plugin, query) {
  const searchable = [
    plugin.name,
    plugin.description,
    plugin.packageId,
    ...plugin.contributions.map(({ displayName }) => displayName),
  ].join(' ').toLowerCase();
  return searchable.includes(query.trim().toLowerCase());
}

function definitionList(title, values, empty = 'None') {
  const root = element('div', { className: 'core-plugin-definition-list' }, [
    element('dt', { text: title }),
  ]);
  const entries = values.length === 0 ? [empty] : values;
  for (const value of entries) root.append(element('dd', { text: value }));
  return root;
}

function capabilityLines(plugin) {
  return [
    ...plugin.capabilities.provides.map(({ id, version }) => `Provides · ${id} @ ${version}`),
    ...plugin.capabilities.requires.map(({ id, range }) => `Requires · ${id} ${range}`),
    ...plugin.capabilities.extends.map(({ id, range }) => `Extends · ${id} ${range}`),
  ];
}

function errorCopy(error) {
  const code = typeof error?.code === 'string' ? `${error.code} · ` : '';
  return `${code}${error?.message ?? 'Plugin Center command failed.'}`;
}

/** Own one host-rendered Core Plugins subtree over immutable profile snapshots and commands. */
export function createCorePluginCenterControl({
  confirmDependencyImpact = (impact) => globalThis.confirm(
    `This change also affects: ${impact.dependencyCascadePackageIds.join(', ')}. Continue?`,
  ),
  onRestart,
  profile,
} = {}) {
  requirePorts({ confirmDependencyImpact, onRestart, profile });
  const root = element('section', { className: 'core-plugin-center' });
  const search = element('input', { className: 'core-plugin-search' });
  search.type = 'search';
  search.placeholder = 'Search Core plugins';
  search.setAttribute('aria-label', 'Search Core plugins');
  const enabledOnly = element('input');
  enabledOnly.type = 'checkbox';
  const enabledFilter = element('label', { className: 'core-plugin-enabled-filter' }, [
    enabledOnly, element('span', { text: 'Enabled only' }),
  ]);
  const banner = element('div', { className: 'core-plugin-pending-banner' });
  const list = element('div', { className: 'core-plugin-list' });
  list.setAttribute('role', 'list');
  const detail = element('article', { className: 'core-plugin-detail' });
  const feedback = element('p', { className: 'core-plugin-feedback' });
  feedback.hidden = true;
  const resetProfile = element('button', {
    className: 'core-plugin-secondary-button', text: 'Reset Core profile', type: 'button',
  });
  root.append(
    element('header', { className: 'core-plugin-center-header' }, [
      element('div', {}, [
        element('span', { className: 'core-plugin-eyebrow', text: 'Trusted build' }),
        element('h3', { text: 'Core Plugins' }),
        element('p', { text: 'First-party capabilities included with this V7 build.' }),
      ]),
      resetProfile,
    ]),
    element('div', { className: 'core-plugin-tools' }, [search, enabledFilter]),
    banner,
    feedback,
    element('div', { className: 'core-plugin-layout' }, [list, detail]),
  );
  let selectedPackageId = null;
  let snapshot = profile.snapshot();
  let disposed = false;
  const settingScopes = new Map();

  function showFeedback(message, kind = 'info') {
    feedback.textContent = message;
    feedback.dataset.kind = kind;
    feedback.hidden = message.length === 0;
  }

  function prepareAndStage(intent) {
    const prepared = profile.prepare({ ...intent, expectedRevision: snapshot.revision });
    const { confirmationId } = prepared.impact;
    if (confirmationId !== null && !confirmDependencyImpact(prepared.impact)) return false;
    profile.stage(prepared, { confirmationId });
    showFeedback('Change staged. Restart when you are ready.', 'success');
    return true;
  }

  function renderBanner() {
    banner.replaceChildren();
    banner.hidden = !snapshot.restartRequired && snapshot.lastFailure === null
      && snapshot.recoveryCode === null;
    if (banner.hidden) return;
    const copy = snapshot.restartRequired
      ? 'Pending Core Plugin changes are durable. The running generation is unchanged.'
      : snapshot.lastFailure !== null
        ? `Recovery active · ${snapshot.lastFailure.code} during ${snapshot.lastFailure.phase}.`
        : 'Stored profile recovery is active. Review and explicitly save a new profile.';
    const actions = element('div', { className: 'core-plugin-banner-actions' });
    if (snapshot.restartRequired) {
      const restart = element('button', {
        className: 'core-plugin-primary-button', text: snapshot.lastFailure ? 'Retry restart' : 'Restart now', type: 'button',
      });
      restart.addEventListener('click', () => {
        try {
          const receipt = profile.restartReceipt({ expectedRevision: snapshot.revision });
          onRestart(profile.validateRestartReceipt(receipt));
        } catch (error) { showFeedback(errorCopy(error), 'error'); }
      });
      const later = element('button', {
        className: 'core-plugin-secondary-button', text: 'Later', type: 'button',
      });
      later.addEventListener('click', () => showFeedback('Pending changes will remain until restart or discard.'));
      const discard = element('button', {
        className: 'core-plugin-secondary-button', text: 'Discard', type: 'button',
      });
      discard.addEventListener('click', () => {
        try { profile.discardPending({ expectedRevision: snapshot.revision }); } catch (error) {
          showFeedback(errorCopy(error), 'error');
        }
      });
      actions.append(restart, later, discard);
    }
    banner.append(element('div', {}, [
      element('strong', { text: snapshot.restartRequired ? 'Restart required' : 'Recovery state' }),
      element('span', { text: copy }),
    ]), actions);
  }

  function togglePackage(plugin, enabled) {
    try {
      prepareAndStage({ enabled, kind: 'toggle-package', packageId: plugin.packageId });
    } catch (error) { showFeedback(errorCopy(error), 'error'); render(); }
  }

  function packageRow(plugin) {
    const select = element('button', { className: 'core-plugin-row-main', type: 'button' }, [
      element('span', { className: 'core-plugin-row-title' }, [
        element('strong', { text: plugin.name }),
        element('small', { text: `v${plugin.packageVersion}` }),
      ]),
      element('span', { className: 'core-plugin-row-description', text: plugin.description }),
      element('span', { className: 'core-plugin-row-meta' }, [
        statusBadge(plugin.runtimeState),
        plugin.changeState === 'clean' ? null : statusBadge(plugin.changeState),
      ]),
    ]);
    select.setAttribute('aria-pressed', String(plugin.packageId === selectedPackageId));
    select.addEventListener('click', () => {
      selectedPackageId = plugin.packageId;
      renderList();
      renderDetail();
    });
    const toggle = toggleControl({
      checked: plugin.pendingEnabled,
      label: `${plugin.pendingEnabled ? 'Disable' : 'Enable'} ${plugin.name} after restart`,
      onChange: (enabled) => togglePackage(plugin, enabled),
    });
    const rootRow = element('div', { className: 'core-plugin-row' }, [select, toggle.root]);
    rootRow.dataset.packageId = plugin.packageId;
    rootRow.dataset.runtimeState = plugin.runtimeState;
    rootRow.setAttribute('role', 'listitem');
    return rootRow;
  }

  function visiblePackages() {
    return snapshot.packages.filter((plugin) => (
      searchMatches(plugin, search.value) && (!enabledOnly.checked || plugin.pendingEnabled)
    ));
  }

  function renderList() {
    const packages = visiblePackages();
    list.replaceChildren();
    if (packages.length === 0) {
      list.append(element('div', { className: 'core-plugin-empty', text: 'No Core plugins match this filter.' }));
      return;
    }
    if (!snapshot.packages.some(({ packageId }) => packageId === selectedPackageId)) {
      selectedPackageId = packages[0].packageId;
    }
    for (const plugin of packages) list.append(packageRow(plugin));
  }

  function applySettings(plugin, setting, scope, controls) {
    const values = Object.fromEntries(controls
      .filter(({ field }) => field.scopes.includes(scope))
      .map(({ control, field }) => [field.id, control.read()]));
    prepareAndStage({
      contributionId: setting.contributionId,
      kind: 'replace-settings',
      packageId: plugin.packageId,
      scope,
      values,
    });
  }

  function settingsSection(plugin) {
    if (!plugin.hasSettings) {
      return element('section', { className: 'core-plugin-detail-section core-plugin-no-settings' }, [
        element('h4', { text: 'Settings' }),
        element('p', { text: 'This Core Plugin has no package or profile settings. Artifact Inputs, Evidence, and History stay in the Inspector.' }),
      ]);
    }
    const section = element('section', { className: 'core-plugin-detail-section' }, [
      element('h4', { text: 'Settings' }),
    ]);
    for (const setting of plugin.settings) {
      const scopeKey = `${plugin.packageId}:${setting.contributionId}`;
      const scope = settingScopes.get(scopeKey) ?? 'profile';
      const scopeSelect = element('select', { className: 'core-plugin-scope' });
      for (const value of ['profile', 'package']) {
        const option = element('option', { text: value === 'profile' ? 'Profile default' : 'Package default' });
        option.value = value;
        scopeSelect.append(option);
      }
      scopeSelect.value = scope;
      scopeSelect.addEventListener('change', () => {
        settingScopes.set(scopeKey, scopeSelect.value);
        renderDetail();
      });
      const controls = [];
      const body = element('div', { className: 'core-plugin-setting-body' });
      for (const tab of setting.tabs) {
        body.append(element('span', { className: 'core-plugin-setting-tab', text: tab.id }));
        for (const field of tab.fields) {
          const overrides = scope === 'profile' ? setting.profileValues : setting.packageValues;
          const control = parameterControl(field, Object.hasOwn(overrides, field.id)
            ? overrides[field.id] : field.value);
          control.input.disabled = !field.scopes.includes(scope);
          controls.push({ control, field });
          body.append(element('label', { className: 'core-plugin-setting-row' }, [
            element('span', {}, [
              element('strong', { text: field.label }),
              element('small', { text: `Effective source · ${field.source}` }),
            ]),
            control.input,
          ]));
        }
      }
      const apply = element('button', { className: 'core-plugin-primary-button', text: 'Apply', type: 'button' });
      apply.addEventListener('click', () => {
        try { applySettings(plugin, setting, scope, controls); } catch (error) {
          showFeedback(errorCopy(error), 'error'); render();
        }
      });
      const reset = element('button', { className: 'core-plugin-secondary-button', text: 'Reset', type: 'button' });
      reset.addEventListener('click', () => {
        try {
          prepareAndStage({
            contributionId: setting.contributionId,
            kind: 'replace-settings',
            packageId: plugin.packageId,
            scope,
            values: {},
          });
        } catch (error) { showFeedback(errorCopy(error), 'error'); render(); }
      });
      section.append(element('div', { className: 'core-plugin-setting-card' }, [
        element('div', { className: 'core-plugin-setting-head' }, [
          element('strong', { text: setting.displayName }), scopeSelect,
        ]),
        body,
        element('div', { className: 'core-plugin-setting-actions' }, [reset, apply]),
      ]));
    }
    return section;
  }

  function renderDetail() {
    const plugin = snapshot.packages.find(({ packageId }) => packageId === selectedPackageId);
    detail.replaceChildren();
    if (!plugin) {
      detail.append(element('div', { className: 'core-plugin-empty', text: 'Select a Core Plugin to inspect it.' }));
      return;
    }
    detail.dataset.packageId = plugin.packageId;
    detail.append(
      element('header', { className: 'core-plugin-detail-header' }, [
        element('div', {}, [
          element('span', { className: 'core-plugin-eyebrow', text: 'Core Plugin · first-party' }),
          element('h3', { text: plugin.name }),
          element('p', { text: plugin.description }),
        ]),
        statusBadge(plugin.runtimeState),
      ]),
      element('dl', { className: 'core-plugin-identity' }, [
        definitionList('Package', [`${plugin.packageId} @ ${plugin.packageVersion}`]),
        definitionList('Module', [`${plugin.moduleId} @ ${plugin.moduleVersion}`]),
        definitionList('Publisher', [plugin.distribution.publisherId]),
      ]),
      element('section', { className: 'core-plugin-detail-section' }, [
        element('h4', { text: 'Relationships' }),
        element('dl', { className: 'core-plugin-definition-grid' }, [
          definitionList('Dependencies', plugin.dependencyPackageIds),
          definitionList('Dependents', plugin.dependentPackageIds),
          definitionList('Contributions', plugin.contributions.map(({ displayName, kind }) => `${displayName} · ${kind}`)),
        ]),
      ]),
      element('section', { className: 'core-plugin-detail-section' }, [
        element('h4', { text: 'Capabilities' }),
        element('ul', { className: 'core-plugin-capabilities' }, capabilityLines(plugin)
          .map((line) => element('li', { text: line }))),
      ]),
      settingsSection(plugin),
      element('section', { className: 'core-plugin-retention-note' }, [
        element('strong', { text: 'Data is retained when disabled' }),
        element('p', { text: 'Artifacts, provenance, history, and package/profile settings are preserved. Re-enabling the compatible package restores resolution without creating a new Artifact revision.' }),
      ]),
    );
    if (plugin.diagnostic) {
      detail.prepend(element('p', {
        className: 'core-plugin-diagnostic',
        text: `${plugin.diagnostic.code} · ${plugin.diagnostic.phase} · ${plugin.diagnostic.moduleId ?? 'generation'}`,
      }));
    }
  }

  function render() {
    snapshot = profile.snapshot();
    renderBanner();
    renderList();
    renderDetail();
    root.dataset.recovery = snapshot.recoveryCode ?? '';
    root.dataset.restartRequired = String(snapshot.restartRequired);
  }

  search.addEventListener('input', () => { renderList(); renderDetail(); });
  enabledOnly.addEventListener('change', () => { renderList(); renderDetail(); });
  resetProfile.addEventListener('click', () => {
    try {
      const accepted = confirmDependencyImpact({
        changedPackageIds: snapshot.packages.map(({ packageId }) => packageId),
        dependencyCascadePackageIds: snapshot.packages.map(({ packageId }) => packageId),
        reset: true,
      });
      if (accepted) prepareAndStage({ kind: 'reset-profile' });
    } catch (error) { showFeedback(errorCopy(error), 'error'); render(); }
  });
  const subscription = profile.subscribe((value) => {
    snapshot = value;
    if (!disposed) render();
  });
  render();

  return Object.freeze({
    dispose() {
      disposed = true;
      subscription.unsubscribe();
      root.remove();
    },
    focus() { search.focus(); },
    root,
  });
}
