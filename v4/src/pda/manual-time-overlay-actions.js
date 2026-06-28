import * as bus from '../event-bus.js';
import { recordHistory } from '../history/history-manager.js';
import {
  addKillzone,
  addEventTime,
  clearEventTimes,
  clearKillzones,
  clearKillzoneDraft,
  deleteEventTime,
  deleteKillzone,
  getTimeOverlaySettings,
  normalizeEventTimeValue,
  setKillzoneDraft,
  updateKillzone,
  updateTimeOverlaySettings,
} from '../time-overlays/time-overlay-store.js';

function getBarEventTime(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function getBarEventDate(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEventTimeLabel(time) {
  return normalizeEventTimeValue(time, '').replace(':', '').replace(/^0/, '');
}

function promptKillzoneLabel(defaultLabel = 'Killzone') {
  const value = window.prompt('Killzone name', defaultLabel);
  if (value === null) return null;
  return value.trim() || defaultLabel;
}

export function createManualTimeOverlayController({ getContextBar, hideContextMenu }) {
  function getContextEventTime() {
    return normalizeEventTimeValue(getBarEventTime(getContextBar()), '');
  }

  function getContextEventDate() {
    return getBarEventDate(getContextBar());
  }

  function getEventTimeAtContextBar() {
    const time = getContextEventTime();
    const date = getContextEventDate();
    if (!time || !date) return null;
    return (
      getTimeOverlaySettings().eventTimes.find(
        (eventTime) => eventTime.date === date && eventTime.time === time
      ) || null
    );
  }

  function getKillzoneAtContextBar() {
    const time = getContextEventTime();
    const date = getContextEventDate();
    if (!time || !date) return null;
    return (
      (getTimeOverlaySettings().killzones || []).find((killzone) => {
        if (killzone.date !== date || killzone.enabled === false) return false;
        const start = killzone.startTime <= killzone.endTime ? killzone.startTime : killzone.endTime;
        const end = killzone.startTime <= killzone.endTime ? killzone.endTime : killzone.startTime;
        return time >= start && time <= end;
      }) || null
    );
  }

  function renderMenuItems(bar) {
    const time = normalizeEventTimeValue(getBarEventTime(bar), '');
    const date = getBarEventDate(bar);
    const settings = getTimeOverlaySettings();
    const existingEventTime = time
      ? settings.eventTimes.find(
          (eventTime) => eventTime.date === date && eventTime.time === time
        )
      : null;
    const disabled = time && date ? '' : 'disabled';
    const removeDisabled = existingEventTime ? '' : 'disabled';
    const clearDisabled = settings.eventTimes.length ? '' : 'disabled';
    const label = time ? getEventTimeLabel(time) : '';
    const hitKillzone = getKillzoneAtContextBar();
    const killzoneDraft = settings.killzoneDraft;
    const endDisabled = killzoneDraft && date === killzoneDraft.date && time ? '' : 'disabled';
    const editKillzoneDisabled = hitKillzone ? '' : 'disabled';
    const draftLabel = killzoneDraft ? ` · ${killzoneDraft.date} ${getEventTimeLabel(killzoneDraft.startTime)}` : '';
    return `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Time Overlays</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="time-overlay-add-event" ${disabled}>Add ${label || 'Time'} Line Here</button>
        <button class="pda-menu-item" data-pda-action="time-overlay-delete-event" ${removeDisabled}>Delete ${label || 'Time'} Line</button>
        <button class="pda-menu-item" data-pda-action="time-overlay-clear-events" ${clearDisabled}>Clear Time Lines</button>
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="time-overlay-killzone-start" ${disabled}>Start Killzone Here</button>
        <button class="pda-menu-item" data-pda-action="time-overlay-killzone-end" ${endDisabled}>End Killzone Here${draftLabel}</button>
        <button class="pda-menu-item" data-pda-action="time-overlay-killzone-rename" ${editKillzoneDisabled}>Rename Killzone Here</button>
        <button class="pda-menu-item" data-pda-action="time-overlay-killzone-delete" ${editKillzoneDisabled}>Delete Killzone Here</button>
        </div>
      </div>
    `;
  }

  function renderClearMenuItems() {
    const settings = getTimeOverlaySettings();
    const clearKillzonesDisabled = settings.killzones?.length ? '' : 'disabled';
    return `<button class="pda-menu-item" data-pda-action="time-overlay-killzone-clear" ${clearKillzonesDisabled}>Clear Killzones</button>`;
  }

  async function handleAction(action) {
    if (action === 'time-overlay-add-event') {
      const time = getContextEventTime();
      const date = getContextEventDate();
      if (!time || !date) {
        bus.emit('status:update', { text: '无法添加时间线：没有可用 K 线时间', isError: true });
      } else if (getEventTimeAtContextBar()) {
        updateTimeOverlaySettings({ selectedDate: '' });
        bus.emit('status:update', { text: `${date} ${getEventTimeLabel(time)} 时间线已存在`, isError: false });
      } else {
        recordHistory('Add Time Line', () => {
          updateTimeOverlaySettings({ selectedDate: '' });
          return addEventTime({ date, time, label: getEventTimeLabel(time) });
        });
        bus.emit('status:update', { text: `已添加 ${date} ${getEventTimeLabel(time)} 时间线`, isError: false });
      }
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-delete-event') {
      const eventTime = getEventTimeAtContextBar();
      if (!eventTime) {
        bus.emit('status:update', { text: '当前时间没有可删除的时间线', isError: true });
      } else {
        recordHistory('Delete Time Line', () => deleteEventTime(eventTime.id));
        bus.emit('status:update', {
          text: `已删除 ${eventTime.date} ${eventTime.label || getEventTimeLabel(eventTime.time)} 时间线`,
          isError: false,
        });
      }
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-clear-events') {
      const cleared = await recordHistory('Clear Time Lines', () => clearEventTimes());
      bus.emit('status:update', {
        text: cleared ? '已清除所有时间线' : '没有可清除的时间线',
        isError: false,
      });
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-killzone-start') {
      const time = getContextEventTime();
      const date = getContextEventDate();
      if (!time || !date) {
        bus.emit('status:update', { text: '无法设置 Killzone：没有可用 K 线时间', isError: true });
      } else {
        recordHistory('Start Killzone', () => setKillzoneDraft({ date, startTime: time }));
        bus.emit('status:update', {
          text: `Killzone 起点: ${date} ${getEventTimeLabel(time)}`,
          isError: false,
        });
      }
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-killzone-end') {
      const time = getContextEventTime();
      const date = getContextEventDate();
      const killzoneDraft = getTimeOverlaySettings().killzoneDraft;
      if (!time || !date || !killzoneDraft || killzoneDraft.date !== date) {
        bus.emit('status:update', { text: '无法完成 Killzone：请先在同一天设置起点', isError: true });
      } else if (time === killzoneDraft.startTime) {
        bus.emit('status:update', { text: 'Killzone 起点和终点不能相同', isError: true });
      } else {
        const label = promptKillzoneLabel('Killzone');
        if (label !== null) {
          const killzone = await recordHistory('Create Killzone', () => {
            const nextKillzone = addKillzone({
              date,
              label,
              startTime: killzoneDraft.startTime,
              endTime: time,
            });
            clearKillzoneDraft();
            return nextKillzone;
          });
          bus.emit('status:update', {
            text: killzone
              ? `已创建 Killzone: ${killzone.label} ${date} ${getEventTimeLabel(killzone.startTime)}-${getEventTimeLabel(killzone.endTime)}`
              : 'Killzone 创建失败',
            isError: !killzone,
          });
        }
      }
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-killzone-rename') {
      const killzone = getKillzoneAtContextBar();
      if (!killzone) {
        bus.emit('status:update', { text: '当前位置没有 Killzone', isError: true });
      } else {
        const label = promptKillzoneLabel(killzone.label || 'Killzone');
        if (label !== null) {
          recordHistory('Rename Killzone', () => updateKillzone(killzone.id, { label }));
          bus.emit('status:update', { text: `Killzone 已重命名为 ${label}`, isError: false });
        }
      }
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-killzone-delete') {
      const killzone = getKillzoneAtContextBar();
      const deleted = killzone ? await recordHistory('Delete Killzone', () => deleteKillzone(killzone.id)) : false;
      bus.emit('status:update', {
        text: deleted ? `已删除 Killzone: ${killzone.label}` : '当前位置没有可删除的 Killzone',
        isError: !deleted,
      });
      hideContextMenu();
      return true;
    }

    if (action === 'time-overlay-killzone-clear') {
      const cleared = await recordHistory('Clear Killzones', () => clearKillzones());
      bus.emit('status:update', {
        text: cleared ? 'Killzones 已清除' : '没有可清除的 Killzone',
        isError: false,
      });
      hideContextMenu();
      return true;
    }

    return false;
  }

  function cancelDraftIfActive() {
    if (!getTimeOverlaySettings().killzoneDraft) return false;
    clearKillzoneDraft();
    bus.emit('status:update', { text: 'Killzone 选择已取消', isError: false });
    return true;
  }

  return {
    cancelDraftIfActive,
    clearDraft: clearKillzoneDraft,
    handleAction,
    renderClearMenuItems,
    renderMenuItems,
  };
}
