import { element, parameterControl, statusBadge } from './dom-primitives.js';
import {
  inactiveDisclosure,
  localPackageButton,
  localPackageDefinition,
} from './local-package-ui-support.js';

function effectiveValue(plugin, field) {
  return plugin.settings.effective.find(({ fieldId }) => fieldId === field.id)?.value
    ?? field.defaultValue;
}

function settingsSection(plugin, onAction) {
  const definition = plugin.settings.definition;
  if (definition === null) {
    return element('section', { className: 'core-plugin-detail-section core-plugin-no-settings' }, [
      element('h4', { text: 'Settings' }),
      element('p', { text: 'This local package declares no package or profile settings.' }),
    ]);
  }
  const packageValues = { ...plugin.settings.packageValues };
  const profileValues = { ...plugin.settings.profileValues };
  const controls = [];
  const apply = localPackageButton('Apply settings', true);
  apply.disabled = true;
  function updateApplyState() {
    apply.disabled = !controls.some(({ control, initialValue }) => (
      !Object.is(control.read(), initialValue)
    ));
  }
  const section = element('section', { className: 'core-plugin-detail-section' }, [
    element('h4', { text: 'Host-rendered settings' }),
    element('p', {
      text: 'Values are validated and stored by V7. Package payload cannot render or read this form in P1b.',
    }),
  ]);
  for (const tab of definition.tabs) {
    const card = element('div', { className: 'core-plugin-setting-card' }, [
      element('strong', { text: tab.id }),
    ]);
    for (const field of tab.source.fields) {
      for (const scope of field.scopes) {
        const values = scope === 'package' ? packageValues : profileValues;
        const value = Object.hasOwn(values, field.id) ? values[field.id] : effectiveValue(plugin, field);
        const control = parameterControl(field, value);
        control.input.setAttribute('aria-label', `${field.label} · ${scope}`);
        controls.push({ control, field, initialValue: value, scope });
        control.input.addEventListener('change', updateApplyState);
        control.input.addEventListener('input', updateApplyState);
        const reset = localPackageButton(`Reset ${scope}`);
        reset.disabled = !Object.hasOwn(values, field.id);
        reset.addEventListener('click', () => onAction('settings-reset', {
          fieldId: field.id, scope,
        }, reset));
        card.append(element('label', { className: 'core-plugin-setting-row' }, [
          element('span', {}, [
            element('strong', { text: `${field.label} · ${scope}` }),
            element('small', {
              text: `Effective source · ${plugin.settings.effective.find(
                ({ fieldId }) => fieldId === field.id,
              )?.source ?? 'definition-default'}`,
            }),
          ]),
          element('span', { className: 'local-plugin-setting-control' }, [control.input, reset]),
        ]));
      }
    }
    section.append(card);
  }
  apply.addEventListener('click', () => {
    const nextPackage = { ...packageValues };
    const nextProfile = { ...profileValues };
    for (const { control, field, initialValue, scope } of controls) {
      const value = control.read();
      if (!Object.is(value, initialValue)) {
        (scope === 'package' ? nextPackage : nextProfile)[field.id] = value;
      }
    }
    onAction('settings-apply', {
      packageValues: nextPackage,
      profileValues: nextProfile,
    }, apply);
  });
  section.append(element('div', { className: 'core-plugin-setting-actions' }, [apply]));
  return section;
}

function actionSection(plugin, onAction) {
  const actions = [];
  if (plugin.state === 'installed-inactive' && plugin.retainedPrior !== null) {
    const rollback = localPackageButton('Rollback');
    rollback.addEventListener('click', () => onAction('rollback', {}, rollback));
    actions.push(rollback);
  }
  if (plugin.state === 'installed-inactive') {
    const quarantine = localPackageButton('Quarantine');
    quarantine.addEventListener('click', () => onAction('quarantine', {}, quarantine));
    actions.push(quarantine);
  }
  const uninstall = localPackageButton('Uninstall');
  uninstall.addEventListener('click', () => onAction('uninstall', {}, uninstall));
  actions.push(uninstall);
  return element('section', { className: 'core-plugin-detail-section' }, [
    element('h4', { text: 'Recovery and removal' }),
    element('p', {
      text: 'Every action is prepared against this exact generation. Uninstall preserves package-owned settings and host evidence.',
    }),
    element('div', { className: 'local-plugin-detail-actions' }, actions),
  ]);
}

/** Render one byte-free local-package snapshot as safe host-owned text and controls. */
export function renderLocalPluginPackageDetail(plugin, onAction) {
  if (!plugin) {
    return element('div', {
      className: 'core-plugin-empty',
      text: 'Select an installed or quarantined local package to inspect it.',
    });
  }
  const migrations = plugin.persistence.migrations.map((migration) => (
    `${migration.fromSchemaVersion} → ${migration.toSchemaVersion} · ${migration.operations.length} host operation(s)`
  ));
  const detail = element('article', { className: 'core-plugin-detail local-plugin-detail' }, [
    element('header', { className: 'core-plugin-detail-header' }, [
      element('div', {}, [
        element('span', { className: 'core-plugin-eyebrow', text: 'Local package · self-asserted publisher' }),
        element('h3', { text: plugin.display.name }),
        element('p', { text: plugin.display.description }),
      ]),
      statusBadge(plugin.state),
    ]),
    element('dl', { className: 'core-plugin-identity' }, [
      localPackageDefinition('Package', [`${plugin.packageId} @ ${plugin.packageVersion}`]),
      localPackageDefinition('Publisher', [
        `${plugin.publisher.name} · ${plugin.publisher.id} · ${plugin.publisher.verification}`,
      ]),
      localPackageDefinition('Source', [
        `${plugin.source.kind} · ${plugin.source.trust} · signature ${plugin.source.signature}`,
      ]),
      localPackageDefinition('Candidate digest', [plugin.candidateDigest]),
      localPackageDefinition('Compatibility', [
        `${plugin.compatibility.status} · host API ${plugin.compatibility.hostApiVersion}`,
      ]),
      localPackageDefinition('Execution', ['Unavailable · not active · no ModuleHost descriptor']),
    ]),
    inactiveDisclosure(),
    element('section', { className: 'core-plugin-detail-section' }, [
      element('h4', { text: 'Persistence and retention' }),
      element('dl', { className: 'core-plugin-definition-grid' }, [
        localPackageDefinition('Schema', [`version ${plugin.persistence.schemaVersion}`]),
        localPackageDefinition('Migrations', migrations),
        localPackageDefinition('Retention', [plugin.persistence.retention]),
        localPackageDefinition('Prior generation', [plugin.retainedPrior?.generationId ?? 'None']),
      ]),
    ]),
    plugin.state === 'installed-inactive' ? settingsSection(plugin, onAction) : element('section', {
      className: 'local-plugin-warning',
      text: `Settings are read-only while this generation is ${plugin.state}.`,
    }),
    actionSection(plugin, onAction),
  ]);
  detail.dataset.packageId = plugin.packageId;
  detail.dataset.packageState = plugin.state;
  if (plugin.diagnosticCode) {
    detail.prepend(element('p', {
      className: 'core-plugin-diagnostic',
      text: `${plugin.diagnosticCode} · generation excluded from contribution selection`,
    }));
  }
  return detail;
}
