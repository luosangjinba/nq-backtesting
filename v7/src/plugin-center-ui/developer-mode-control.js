import { element, statusBadge, toggleControl } from './dom-primitives.js';
import {
  localPackageButton,
  localPackageDefinition,
  localPackageErrorCopy,
  localPackageFeedback,
} from './local-package-ui-support.js';

function requirePort(browser) {
  for (const method of [
    'loadUnpacked', 'reload', 'setEnabled', 'snapshot', 'subscribe',
    'unload', 'validatePack',
  ]) {
    if (typeof browser?.[method] !== 'function') {
      throw new TypeError(`Developer Mode requires browser.${method}().`);
    }
  }
}

/** Own the visibly isolated Developer Mode opt-in, prepared generations, and explicit actions. */
export function createDeveloperModeControl({ browser } = {}) {
  requirePort(browser);
  const root = element('section', { className: 'local-plugin-developer-mode' });
  const feedback = localPackageFeedback();
  const body = element('div', { className: 'local-plugin-developer-body' });
  let disposed = false;
  let snapshot = browser.snapshot();
  const toggle = toggleControl({
    checked: snapshot.enabled,
    label: 'Enable device-local Developer Mode',
    onChange(enabled) {
      try {
        browser.setEnabled(enabled);
        feedback.show(enabled
          ? 'Developer Mode enabled on this device. No publisher trust or execution was granted.'
          : 'Developer Mode disabled. All development generations were unloaded.');
      } catch (error) {
        toggle.input.checked = browser.snapshot().enabled;
        feedback.show(localPackageErrorCopy(error), 'error');
      }
    },
  });
  const header = element('header', { className: 'local-plugin-developer-header' }, [
    element('div', {}, [
      element('span', { className: 'core-plugin-eyebrow', text: 'Advanced · device-local' }),
      element('h3', { text: 'Developer Mode' }),
      element('p', {
        text: 'Inspect prepared unpacked candidates only. Source workspaces, automatic reload, execution, and installation stay unavailable.',
      }),
    ]),
    element('div', { className: 'local-plugin-developer-toggle' }, [
      element('span', { text: 'Developer Mode' }), toggle.root,
    ]),
  ]);
  root.append(header, feedback.root, body);

  function restoreActionFocus(label, packageId) {
    const scope = packageId === null ? root : [...root.querySelectorAll(
      '.local-plugin-developer-card',
    )].find((card) => card.dataset.packageId === packageId);
    const replacement = [...(scope?.querySelectorAll('button') ?? [])].find(
      (candidate) => candidate.textContent === label,
    );
    (replacement ?? toggle.input).focus();
  }

  async function action(operation, button, packageId = null) {
    if (snapshot.busy) return;
    const label = button.textContent;
    button.disabled = true;
    try {
      const result = await operation();
      if (result === null) {
        feedback.show('Picker cancelled. No Developer Mode generation changed.');
      } else if (result.saved === false) {
        feedback.show('Save cancelled. No archive or package-store write occurred.');
      } else {
        feedback.show('Prepared candidate action completed. Package remains developer-inactive.', 'success');
      }
    } catch (error) {
      if (!disposed) feedback.show(localPackageErrorCopy(error), 'error');
    } finally {
      if (!disposed) restoreActionFocus(label, packageId);
    }
  }

  function generationCard(generation) {
    const reload = localPackageButton('Reload');
    const pack = localPackageButton('Validate / Pack');
    const unload = localPackageButton('Unload');
    reload.disabled = snapshot.busy;
    pack.disabled = snapshot.busy;
    unload.disabled = snapshot.busy;
    reload.addEventListener('click', () => { void action(
      () => browser.reload(generation.packageId), reload, generation.packageId,
    ); });
    pack.addEventListener('click', () => { void action(
      () => browser.validatePack(generation.packageId), pack, generation.packageId,
    ); });
    unload.addEventListener('click', () => {
      try {
        browser.unload(generation.packageId);
        feedback.show(`${generation.display.name} unloaded. No durable package was uninstalled.`);
        (root.querySelector('.local-plugin-developer-actions button') ?? toggle.input).focus();
      } catch (error) { feedback.show(localPackageErrorCopy(error), 'error'); }
    });
    const card = element('article', { className: 'local-plugin-developer-card' }, [
      element('header', { className: 'core-plugin-detail-header' }, [
        element('div', {}, [
          element('h4', { text: generation.display.name }),
          element('p', { text: `${generation.packageId} @ ${generation.packageVersion}` }),
        ]),
        statusBadge(generation.state),
      ]),
      element('dl', { className: 'core-plugin-identity' }, [
        localPackageDefinition('Directory', [generation.loadedDirectoryName]),
        localPackageDefinition('Publisher', [
          `${generation.publisher.name} · self-asserted · not trusted`,
        ]),
        localPackageDefinition('Snapshot digest', [generation.snapshotDigest]),
        localPackageDefinition('Execution', ['Unavailable · no watcher · no ModuleHost descriptor']),
      ]),
      element('div', { className: 'local-plugin-detail-actions' }, [reload, pack, unload]),
    ]);
    card.dataset.packageId = generation.packageId;
    return card;
  }

  function render() {
    toggle.input.checked = snapshot.enabled;
    toggle.input.disabled = snapshot.busy;
    root.dataset.developerMode = snapshot.enabled ? 'enabled' : 'disabled';
    root.dataset.deviceLocal = String(snapshot.deviceLocal);
    body.replaceChildren();
    if (!snapshot.enabled) {
      body.append(element('div', { className: 'local-plugin-developer-off' }, [
        element('strong', { text: 'Developer Mode is off' }),
        element('p', {
          text: 'No directory handles or development generations are retained. Installed local packages are unchanged.',
        }),
      ]));
      return;
    }
    const marker = element('div', { className: 'local-plugin-developer-marker' }, [
      element('strong', { text: 'DEVELOPER MODE · ON' }),
      element('span', { text: 'Device-local · unsynchronized · no execution authority' }),
    ]);
    marker.setAttribute('role', 'status');
    const load = localPackageButton('Load unpacked', true);
    load.disabled = snapshot.busy;
    load.addEventListener('click', () => { void action(() => browser.loadUnpacked(), load); });
    body.append(
      marker,
      element('p', { className: 'local-plugin-warning', text: 'Choose the root of one Developer Kit unpacked candidate output. Source repositories and arbitrary build folders are rejected.' }),
      element('div', { className: 'local-plugin-developer-actions' }, [load]),
    );
    if (snapshot.diagnostics.length > 0) {
      body.append(element('ul', { className: 'core-plugin-diagnostic' }, snapshot.diagnostics.map(
        ({ code, message }) => element('li', { text: `${code} · ${message}` }),
      )));
    }
    if (snapshot.generations.length === 0) {
      body.append(element('div', {
        className: 'core-plugin-empty',
        text: 'No prepared candidate is loaded. Nothing is watched or executed in the background.',
      }));
    } else {
      snapshot.generations.forEach((generation) => body.append(generationCard(generation)));
    }
  }

  const subscription = browser.subscribe((value) => {
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
    focus() { toggle.input.focus(); },
    root,
  });
}
