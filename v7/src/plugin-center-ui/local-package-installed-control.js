import { element, statusBadge } from './dom-primitives.js';
import { renderLocalPluginPackageDetail } from './local-package-detail.js';
import { createLocalPackageInstallReview } from './local-package-review.js';
import {
  localPackageButton,
  localPackageErrorCopy,
  localPackageFeedback,
} from './local-package-ui-support.js';

function requirePorts({ browser, idFactory, store }) {
  for (const method of [
    'commitPrepared', 'describePreparation', 'exportDiagnostics', 'prepareInstall',
    'prepareQuarantine', 'prepareRollback', 'prepareSettingsApply',
    'prepareSettingsReset', 'prepareUninstall', 'removeRestrictedInventory',
    'retryRecovery', 'snapshot', 'subscribe',
  ]) {
    if (typeof store?.[method] !== 'function') {
      throw new TypeError(`Local Plugin Center requires packageStore.${method}().`);
    }
  }
  if (typeof browser?.inspectArchiveSelection !== 'function' || typeof idFactory !== 'function') {
    throw new TypeError('Local Plugin Center requires browser inspection and command identity ports.');
  }
}

function defaultExport(value) {
  const href = URL.createObjectURL(new Blob([
    `${JSON.stringify(value, null, 2)}\n`,
  ], { type: 'application/json' }));
  const link = element('a');
  link.href = href;
  link.download = 'v7-plugin-package-diagnostics.json';
  link.click();
  queueMicrotask(() => URL.revokeObjectURL(href));
}

function allPackages(snapshot) {
  if (snapshot.mode !== 'normal') return [];
  return [...snapshot.installed, ...snapshot.quarantined]
    .sort((left, right) => left.packageId.localeCompare(right.packageId));
}

/** Own Installed-local DOM drafts over the sole package-store command/snapshot surface. */
export function createLocalPluginInstalledControl({
  browser,
  confirmPlan = (plan) => globalThis.confirm(
    `${plan.operation} ${plan.packageId} @ ${plan.packageVersion}?\n\n${plan.requiredReviews.join('\n')}`,
  ),
  idFactory = () => globalThis.crypto.randomUUID(),
  onExportDiagnostics = defaultExport,
  store,
} = {}) {
  requirePorts({ browser, idFactory, store });
  const root = element('section', { className: 'local-plugin-installed' });
  const install = localPackageButton('Install from file', true);
  const feedback = localPackageFeedback();
  const recovery = element('section', { className: 'local-plugin-recovery' });
  const list = element('div', { className: 'core-plugin-list local-plugin-list' });
  list.setAttribute('aria-label', 'Installed local packages');
  list.setAttribute('role', 'list');
  const detailHost = element('div', { className: 'local-plugin-detail-host' });
  let pendingReview = null;
  const review = createLocalPackageInstallReview({
    onCancel() {
      pendingReview = null;
      feedback.show('Install cancelled. No package-store write occurred.');
    },
    onConfirm: (_plan, button) => { void commitReview(button); },
  });
  root.append(
    element('header', { className: 'core-plugin-center-header' }, [
      element('div', {}, [
        element('span', { className: 'core-plugin-eyebrow', text: 'Device-local inventory' }),
        element('h3', { text: 'Local packages' }),
        element('p', { text: 'Validated local archives remain inactive and never update automatically.' }),
      ]),
      install,
    ]),
    feedback.root,
    recovery,
    review.root,
    element('div', { className: 'core-plugin-layout local-plugin-layout' }, [list, detailHost]),
  );
  let busy = false;
  let disposed = false;
  let selectedPackageId = null;
  let snapshot = store.snapshot();
  let operationEpoch = 0;

  function focusSelectedRow() {
    const row = [...list.querySelectorAll('.local-plugin-row')].find(
      (candidate) => candidate.dataset.packageId === selectedPackageId,
    );
    (row?.querySelector('button') ?? install).focus();
  }

  function restoreInventoryFocus() {
    if (snapshot.mode === 'restricted') {
      (recovery.querySelector('button') ?? install).focus();
    } else {
      focusSelectedRow();
    }
  }

  function setBusy(next) {
    busy = next;
    install.disabled = next || snapshot.mode !== 'normal';
    root.setAttribute('aria-busy', String(next));
  }

  async function guarded(action, returnFocus = null) {
    if (busy || disposed) return null;
    const epoch = ++operationEpoch;
    setBusy(true);
    try {
      const result = await action();
      if (!disposed && epoch === operationEpoch) return result;
      return null;
    } catch (error) {
      if (!disposed && epoch === operationEpoch) {
        feedback.show(localPackageErrorCopy(error), 'error');
        returnFocus?.focus();
      }
      return null;
    } finally {
      if (!disposed && epoch === operationEpoch) setBusy(false);
    }
  }

  function packageRow(plugin) {
    const button = element('button', { className: 'core-plugin-row-main', type: 'button' }, [
      element('span', { className: 'core-plugin-row-title' }, [
        element('strong', { text: plugin.display.name }),
        element('small', { text: `v${plugin.packageVersion}` }),
      ]),
      element('span', { className: 'core-plugin-row-description', text: plugin.display.description }),
      element('span', { className: 'core-plugin-row-meta' }, [
        statusBadge(plugin.state),
        element('small', { text: 'local · unverified' }),
      ]),
    ]);
    button.setAttribute('aria-pressed', String(plugin.packageId === selectedPackageId));
    button.addEventListener('click', () => {
      selectedPackageId = plugin.packageId;
      renderList();
      renderDetail();
      focusSelectedRow();
    });
    const row = element('div', { className: 'core-plugin-row local-plugin-row' }, [button]);
    row.dataset.packageId = plugin.packageId;
    row.dataset.packageState = plugin.state;
    row.setAttribute('role', 'listitem');
    return row;
  }

  function renderList() {
    const packages = allPackages(snapshot);
    list.replaceChildren();
    if (packages.length === 0) {
      list.append(element('div', {
        className: 'core-plugin-empty',
        text: 'No local packages are installed or quarantined on this device.',
      }));
      selectedPackageId = null;
      return;
    }
    if (!packages.some(({ packageId }) => packageId === selectedPackageId)) {
      selectedPackageId = packages[0].packageId;
    }
    packages.forEach((plugin) => list.append(packageRow(plugin)));
  }

  async function commitPrepared(preparation, plan) {
    const result = await store.commitPrepared(preparation, {
      commandId: idFactory(),
      confirmationId: plan.confirmationId,
    });
    feedback.show(`${plan.operation} committed at inventory revision ${result.snapshot.revision}. Package remains inactive.`, 'success');
    return result;
  }

  async function commitReview(button) {
    if (pendingReview === null) return;
    const current = pendingReview;
    button.disabled = true;
    const result = await guarded(
      () => commitPrepared(current.preparation, current.plan),
      button,
    );
    if (result !== null) {
      pendingReview = null;
      review.close({ restoreFocus: true });
    } else if (!disposed) button.disabled = false;
  }

  async function beginInstall() {
    feedback.clear();
    const inspected = await guarded(() => browser.inspectArchiveSelection(), install);
    if (inspected === null || disposed) return;
    const preparation = await guarded(() => store.prepareInstall({
      archiveBytes: inspected.archiveBytes,
      candidate: inspected.candidate,
      expectedRevision: snapshot.revision,
      manifest: inspected.manifest,
    }), install);
    if (preparation === null || disposed) return;
    const plan = store.describePreparation(preparation);
    pendingReview = Object.freeze({ plan, preparation });
    review.open(plan, install);
  }

  async function detailAction(kind, input, button) {
    const plugin = allPackages(snapshot).find(({ packageId }) => packageId === selectedPackageId);
    if (!plugin) return;
    const result = await guarded(async () => {
      const exact = {
        expectedGenerationId: plugin.generationId,
        expectedRevision: snapshot.revision,
        packageId: plugin.packageId,
      };
      let preparation;
      if (kind === 'settings-apply') {
        preparation = await store.prepareSettingsApply({ ...exact, ...input });
      } else if (kind === 'settings-reset') {
        preparation = await store.prepareSettingsReset({ ...exact, ...input });
      } else if (kind === 'rollback') {
        preparation = await store.prepareRollback(exact);
      } else if (kind === 'quarantine') {
        preparation = await store.prepareQuarantine({
          ...exact, diagnosticCode: 'V7DK_USER_QUARANTINE',
        });
      } else if (kind === 'uninstall') {
        preparation = await store.prepareUninstall(exact);
      } else {
        throw new TypeError('Unknown local package detail action.');
      }
      const plan = store.describePreparation(preparation);
      if (plan.confirmationId !== null && !confirmPlan(plan)) {
        feedback.show(`${plan.operation} cancelled. Inventory revision ${snapshot.revision} is unchanged.`);
        return null;
      }
      return commitPrepared(preparation, plan);
    }, button);
    if (!disposed && (result !== null || !button.isConnected)) focusSelectedRow();
  }

  function renderDetail() {
    const plugin = allPackages(snapshot).find(({ packageId }) => packageId === selectedPackageId);
    detailHost.replaceChildren(renderLocalPluginPackageDetail(
      plugin,
      (kind, input, button) => { void detailAction(kind, input, button); },
    ));
  }

  function renderRecovery() {
    recovery.replaceChildren();
    recovery.hidden = snapshot.mode !== 'restricted';
    if (recovery.hidden) return;
    const retry = localPackageButton('Retry recovery', true);
    const exportButton = localPackageButton('Export diagnostics');
    const remove = localPackageButton('Remove restricted inventory');
    retry.addEventListener('click', () => { void guarded(
      () => store.retryRecovery(), retry,
    ).then(() => { if (!disposed && !retry.isConnected) restoreInventoryFocus(); }); });
    exportButton.addEventListener('click', () => onExportDiagnostics(store.exportDiagnostics()));
    remove.addEventListener('click', () => {
      if (!globalThis.confirm('Remove the unreadable local package inventory? Installed package bytes will be deleted.')) return;
      void guarded(() => store.removeRestrictedInventory({
        confirmationToken: snapshot.recoveryToken,
      }), remove).then(() => { if (!disposed && !remove.isConnected) restoreInventoryFocus(); });
    });
    recovery.append(
      element('strong', { text: 'Restricted Mode' }),
      element('p', {
        text: 'External packages are excluded. Kernel and trusted-build Core behavior remain available.',
      }),
      element('ul', {}, snapshot.diagnostics.map(({ code, message }) => (
        element('li', { text: `${code} · ${message}` })
      ))),
      element('div', { className: 'local-plugin-detail-actions' }, [retry, exportButton, remove]),
    );
  }

  function render() {
    renderRecovery();
    renderList();
    renderDetail();
    root.dataset.inventoryMode = snapshot.mode;
    root.dataset.inventoryRevision = String(snapshot.revision ?? '');
    install.disabled = busy || snapshot.mode !== 'normal';
  }

  install.addEventListener('click', () => { void beginInstall(); });
  const subscription = store.subscribe((value) => {
    snapshot = value;
    if (!disposed) render();
  });
  render();

  return Object.freeze({
    dispose() {
      disposed = true;
      operationEpoch += 1;
      pendingReview = null;
      subscription.unsubscribe();
      root.remove();
    },
    focus() { install.focus(); },
    root,
  });
}
