import * as bus from '../../event-bus.js';
import * as store from '../../data/bar-store.js';
import { clearSelection as clearPdaSelection } from '../../pda/pda-selection.js';
import { deleteAnnotation, updateAnnotation } from '../../pda/pda-store.js';
import { buildExtendDisplayPatch } from '../../pda/pda-extend.js';
import { updateFibLevel } from '../../pda/fib-levels.js';
import { getPdaType } from '../../pda/pda-types.js';
import { getPointSetContext, getPointSetReference } from './pda-panel.js';
import { recordHistory } from '../../history/history-manager.js';

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

export function createPdaInspectorActionController({
  getCurrentAnnotation,
  renderEmpty,
}) {
  function removePointFromSet(annotation, pointIndex) {
    if (!Array.isArray(annotation.points) || !Number.isInteger(pointIndex)) return;
    const nextPoints = annotation.points.filter((_, index) => index !== pointIndex);

    if (nextPoints.length < 2) {
      deleteAnnotation(annotation.id);
      clearPdaSelection();
      renderEmpty();
      bus.emit('status:update', {
        text: `${getPdaType(annotation.type)?.label || annotation.type.toUpperCase()} 少于 2 个点，集合已删除`,
        isError: false,
      });
      return;
    }

    const referencePrice = getPointSetReference(annotation.type, nextPoints);
    updateAnnotation(annotation.id, {
      points: nextPoints,
      referencePrice,
      price: referencePrice,
      contexts: [getPointSetContext(annotation, nextPoints)],
    });
  }

  function handlePdaChange(action, target) {
    const annotation = getCurrentAnnotation();
    if (!annotation) return false;

    if (action === 'toggle-current-label') {
      recordInspectorHistory('Toggle PDA Label', () => updateAnnotation(annotation.id, {
        display: {
          ...(annotation.display || {}),
          showLabel: target.checked,
        },
      }));
      return true;
    }

    if (action === 'extend-bars') {
      const parsed = Number(target.value);
      const extendBars = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      recordInspectorHistory('Update PDA Extend', () => updateAnnotation(annotation.id, {
        display: {
          ...(annotation.display || {}),
          ...buildExtendDisplayPatch(extendBars, store.getCurrentTimeframe()),
        },
      }));
      return true;
    }

    if (action === 'note') {
      recordInspectorHistory('Update PDA Note', () => updateAnnotation(annotation.id, { note: target.value }));
      return true;
    }

    if (action === 'toggle-ce') {
      recordInspectorHistory('Toggle PDA CE', () => updateAnnotation(annotation.id, {
        display: {
          ...(annotation.display || {}),
          showCe: target.checked,
        },
      }));
      return true;
    }

    if (action === 'fib-level-visible') {
      recordInspectorHistory('Toggle Fib Level', () => updateAnnotation(annotation.id, {
        levels: updateFibLevel(annotation.levels, Number(target.dataset.fibLevelIndex), {
          visible: target.checked,
        }),
      }));
      return true;
    }

    if (action === 'fib-level-value') {
      const parsed = Number(target.value);
      if (!Number.isFinite(parsed)) return true;
      recordInspectorHistory('Update Fib Level', () => updateAnnotation(annotation.id, {
        levels: updateFibLevel(annotation.levels, Number(target.dataset.fibLevelIndex), {
          value: parsed,
        }),
      }));
      return true;
    }

    if (action === 'fib-level-color') {
      recordInspectorHistory('Update Fib Level Color', () => updateAnnotation(annotation.id, {
        levels: updateFibLevel(annotation.levels, Number(target.dataset.fibLevelIndex), {
          color: target.value,
        }),
      }));
      return true;
    }

    return false;
  }

  function handlePdaClick(action, actionEl) {
    const annotation = getCurrentAnnotation();
    if (!annotation) return false;

    if (action === 'delete') {
      recordInspectorHistory('Delete PDA', () => deleteAnnotation(annotation.id));
      clearPdaSelection();
      renderEmpty();
      return true;
    }

    if (action === 'remove-point') {
      recordInspectorHistory('Remove Point From Set', () =>
        removePointFromSet(annotation, Number(actionEl.dataset.pointIndex))
      );
      return true;
    }

    return false;
  }

  return {
    handlePdaChange,
    handlePdaClick,
  };
}
