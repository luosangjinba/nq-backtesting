import { failProjection } from './projection-error.js';
import { createLightweightBarPickerSubscription } from './lightweight-bar-picker-subscription.js';

/** Assemble one internal Bar Picker lease while the shared interaction owner retains arbitration. */
export function beginLightweightBarPickerLease({
  chart,
  handlers,
  isActive,
  leaseRevision,
  nextSequence,
  onActivate,
  onCancel,
  onSelect,
  paneId,
  resolveMarketEpochMs,
  series,
} = {}) {
  const record = {
    handlers,
    kind: 'bar-picker',
    leaseRevision,
    nativeOptions: null,
    nativeRestored: true,
    pointerId: null,
    subscription: null,
  };
  onActivate(record);
  try {
    record.subscription = createLightweightBarPickerSubscription({
      chart,
      handlers,
      nextSequence,
      onFailure: onCancel,
      onSelection: onSelect,
      paneId,
      resolveMarketEpochMs,
      series,
    });
  } catch (cause) {
    if (isActive(record)) onActivate(null);
    failProjection(
      'ANNOTATION_BAR_PICKER_SUBSCRIBE_FAILED',
      'Bar Picker could not subscribe to the Chart interaction surface.',
      { cause },
    );
  }
  return Object.freeze({
    release(reason = 'released') {
      if (isActive(record)) onCancel(reason);
    },
  });
}
