import * as viewport from '../../chart/viewport-controller.js';
import { deleteSmtRecord, getSmtRecordById, updateSmtRecord } from '../../smt/smt-store.js';
import { getSmtCalendarDate } from './calendar-object-date.js';

export function createSmtInspectorActionController({
  getSelectedSmtId,
  setSelectedSmtId,
  getInspectorPage,
  getCurrentPanel,
  dailyTimeActions,
  orderReviewActions,
  prepareDetailBackTarget,
  renderSmtSelection,
  renderAfterDetailDeleted,
  renderArchivePanel,
  openSidebar,
  recordInspectorHistory,
} = {}) {
  function handleChange(action, target) {
    if (action !== 'smt-note') return false;
    recordInspectorHistory?.('Update SMT Note', () => (
      updateSmtRecord(target.dataset.smtId, { note: target.value })
    ));
    return true;
  }

  function handleLocate(actionEl) {
    const record = getSmtRecordById(actionEl.dataset.smtId);
    if (record) {
      viewport.locateTimestampRange(
        record.leftTimestamp ?? record.fvgStartTimestamp ?? record.timestamp,
        record.rightTimestamp ?? record.fvgEndTimestamp ?? record.timestamp
      );
    }
    return true;
  }

  function handleDelete(actionEl) {
    const deletedId = actionEl.dataset.smtId;
    recordInspectorHistory?.('Delete SMT', () => deleteSmtRecord(deletedId));
    if (getSelectedSmtId?.() === deletedId) setSelectedSmtId?.(null);
    const page = getInspectorPage?.();
    if (page?.kind === 'detail' && page.objectType === 'smt' && String(page.objectId) === String(deletedId)) {
      renderAfterDetailDeleted?.();
      return true;
    }
    if (getCurrentPanel?.() === 'archive') renderArchivePanel?.();
    return true;
  }

  function handleSelect(actionEl) {
    const record = getSmtRecordById(actionEl.dataset.smtId);
    if (!record) return true;
    if (dailyTimeActions?.isPicking()) {
      setSelectedSmtId?.(record.id);
      dailyTimeActions.handlePickedSmt(record);
      return true;
    }
    if (orderReviewActions?.isReasonRefPicking()) {
      setSelectedSmtId?.(record.id);
      orderReviewActions.handlePickedSmt(record);
      return true;
    }
    prepareDetailBackTarget?.(getSmtCalendarDate(record));
    setSelectedSmtId?.(record.id);
    renderSmtSelection?.();
    openSidebar?.();
    return true;
  }

  function handleClick(action, actionEl) {
    if (action === 'smt-locate') return handleLocate(actionEl);
    if (action === 'smt-delete') return handleDelete(actionEl);
    if (action === 'smt-select') return handleSelect(actionEl);
    return false;
  }

  return { handleChange, handleClick };
}
