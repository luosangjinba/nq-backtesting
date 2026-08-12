import { element, statusBadge } from './dom-primitives.js';
import {
  inactiveDisclosure,
  localPackageButton,
  localPackageDefinition,
} from './local-package-ui-support.js';

/** Render one exact install plan and keep commit/cancel as explicit host actions. */
export function createLocalPackageInstallReview({ onCancel, onConfirm }) {
  const root = element('section', { className: 'local-plugin-review' });
  root.hidden = true;
  root.setAttribute('aria-label', 'Local package install review');
  root.setAttribute('role', 'dialog');
  let plan = null;
  let focusReturn = null;

  function close({ restoreFocus = true } = {}) {
    root.hidden = true;
    root.replaceChildren();
    plan = null;
    if (restoreFocus) focusReturn?.focus();
    focusReturn = null;
  }

  function open(candidatePlan, returnControl) {
    plan = candidatePlan;
    focusReturn = returnControl;
    const cancel = localPackageButton('Cancel');
    const confirm = localPackageButton(
      candidatePlan.operation === 'install' ? 'Install inactive package' : `Confirm ${candidatePlan.operation}`,
      true,
    );
    cancel.addEventListener('click', () => { onCancel(plan); close(); });
    confirm.addEventListener('click', () => onConfirm(plan, confirm));
    root.replaceChildren(
      element('header', { className: 'local-plugin-review-header' }, [
        element('div', {}, [
          element('span', { className: 'core-plugin-eyebrow', text: 'Unverified local source' }),
          element('h3', { text: candidatePlan.display.name }),
          element('p', { text: candidatePlan.display.description }),
        ]),
        statusBadge('candidate'),
      ]),
      element('div', { className: 'local-plugin-warning-stack' }, [
        element('p', {
          className: 'local-plugin-warning',
          text: 'Publisher identity is self-asserted. No signature applies and V7 does not trust this publisher.',
        }),
        element('p', {
          className: 'local-plugin-warning',
          text: 'Integrity was checked against the exact archive index and current Developer Kit receipts; this is not a code-safety claim.',
        }),
      ]),
      element('dl', { className: 'core-plugin-identity' }, [
        localPackageDefinition('Package', [`${candidatePlan.packageId} @ ${candidatePlan.packageVersion}`]),
        localPackageDefinition('Publisher', [
          `${candidatePlan.publisher.name} · ${candidatePlan.publisher.id} · self-asserted`,
        ]),
        localPackageDefinition('Source', [
          `${candidatePlan.source.kind} · ${candidatePlan.source.trust} · signature not applicable`,
        ]),
        localPackageDefinition('Archive digest', [candidatePlan.source.digest]),
        localPackageDefinition('Change', [
          `${candidatePlan.operation} from inventory revision ${candidatePlan.baseRevision}`,
        ]),
        localPackageDefinition('Retention', [candidatePlan.retention]),
        localPackageDefinition('Required review', candidatePlan.requiredReviews),
      ]),
      inactiveDisclosure(),
      element('div', { className: 'local-plugin-review-actions' }, [cancel, confirm]),
    );
    root.hidden = false;
    confirm.focus();
  }

  return Object.freeze({ close, open, root });
}
