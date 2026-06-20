function clean(value = '') {
  return String(value || '').trim();
}

function normalize(value = '') {
  return clean(value).toLowerCase();
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function orderPrice(order = {}) {
  return numberOrNull(order.fillPrice)
    ?? numberOrNull(order.price)
    ?? numberOrNull(order.stopPrice)
    ?? numberOrNull(order.limitPrice);
}

function orderQuantity(order = {}, fills = []) {
  const direct = numberOrNull(order.quantity ?? order.filledQty ?? order.qty);
  if (direct !== null) return direct;
  const fill = fills.find((candidate) => clean(candidate.orderId) && clean(candidate.orderId) === clean(order.id));
  return numberOrNull(fill?.quantity);
}

function orderFilledQuantity(order = {}, fills = []) {
  const direct = numberOrNull(order.filledQuantity ?? order.filledQty);
  if (direct !== null) return direct;
  if (isFilled(order)) return orderQuantity(order, fills);
  return null;
}

function quantityForSummary(order = {}, fills = []) {
  return orderQuantity(order, fills) ?? 0;
}

function filledQuantityForSummary(order = {}, fills = []) {
  return orderFilledQuantity(order, fills) ?? 0;
}

function isFilled(order = {}) {
  return normalize(order.status) === 'filled';
}

function isCanceled(order = {}) {
  const status = normalize(order.status);
  return status === 'canceled' || status === 'cancelled';
}

function oppositeSide(direction = '') {
  if (direction === 'long') return 'sell';
  if (direction === 'short') return 'buy';
  return '';
}

function sameSide(order = {}, side = '') {
  return !side || normalize(order.side) === side;
}

function distance(left, right) {
  const leftNumber = numberOrNull(left);
  const rightNumber = numberOrNull(right);
  if (leftNumber === null || rightNumber === null) return Number.MAX_SAFE_INTEGER;
  return Math.abs(leftNumber - rightNumber);
}

function findNearestOrder(orders, predicate, timestamp) {
  return orders
    .filter(({ order }) => predicate(order))
    .sort((left, right) => distance(left.order.timestamp, timestamp) - distance(right.order.timestamp, timestamp))[0] || null;
}

function matchingOrders(orders, predicate, role) {
  return orders
    .filter(({ order }) => predicate(order))
    .sort((left, right) => (numberOrNull(left.order.timestamp) ?? 0) - (numberOrNull(right.order.timestamp) ?? 0))
    .map((item) => buildFlowOrder(item, role));
}

function outcomeFromExit(exitOrder, result = {}) {
  const exitType = normalize(result.exitType);
  const status = normalize(result.status);
  const type = normalize(exitOrder?.order?.type);
  if (exitType === 'manualloss' || exitType === 'manual-loss') return 'manualLoss';
  if (type === 'stop') return 'stoppedOut';
  if (type === 'limit') return 'targetHit';
  if (type === 'market') return 'manualExit';
  if (exitType === 'stoploss' || exitType === 'stop-loss') return 'stoppedOut';
  if (exitType === 'profit') return 'targetHit';
  if (exitType === 'breakeven' || status === 'breakeven') return 'breakeven';
  return exitOrder ? 'filledExit' : 'unknown';
}

function outcomeLabel(type) {
  if (type === 'stoppedOut') return 'Stop filled';
  if (type === 'targetHit') return 'Target filled';
  if (type === 'breakeven') return 'Breakeven exit';
  if (type === 'manualLoss') return 'Manual loss exit';
  if (type === 'manualExit') return 'Manual/Market exit';
  if (type === 'filledExit') return 'Filled exit';
  return 'Exit order not matched';
}

function bracketNote(orderItem, exitOrder) {
  if (!orderItem) return 'No bracket order found';
  const status = normalize(orderItem.order.status);
  if (status === 'filled') return 'Filled exit order';
  if (status === 'canceled' || status === 'cancelled') {
    return exitOrder ? 'Canceled after exit' : 'Canceled';
  }
  return status ? status : '';
}

function buildFlowOrder(item, role) {
  if (!item) return null;
  return {
    ...item.order,
    role,
    orderIndex: item.orderIndex,
    price: orderPrice(item.order),
  };
}

function countOrders(orders, predicate) {
  return orders.filter(({ order }) => predicate(order)).length;
}

function sumOrderQuantity(orders, predicate, fills = [], quantityGetter = quantityForSummary) {
  return Number(orders
    .filter(({ order }) => predicate(order))
    .reduce((sum, { order }) => sum + quantityGetter(order, fills), 0)
    .toFixed(2));
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatContracts(quantity) {
  const value = Number(quantity);
  const safe = Number.isFinite(value) ? value : 0;
  const text = Number.isInteger(safe) ? String(safe) : String(Number(safe.toFixed(2)));
  return `${text} ${safe === 1 ? 'contract' : 'contracts'}`;
}

function formatContractsAction(quantity, action) {
  const value = Number(quantity);
  if (!Number.isFinite(value) || value === 0) return `0 ${action}`;
  return `${formatContracts(value)} ${action}`;
}

function orderTimestamp(order = {}) {
  return numberOrNull(order.timestamp) ?? 0;
}

function sortOrderItems(left, right) {
  return orderTimestamp(left.order) - orderTimestamp(right.order);
}

function positionStateLabel(openedQty, closedQty, { unsupportedAddOn = false } = {}) {
  const remainingQty = Number(Math.max(0, openedQty - closedQty).toFixed(2));
  const overClosedQty = Number(Math.max(0, closedQty - openedQty).toFixed(2));
  return {
    remainingQty,
    overClosedQty,
    flat: remainingQty === 0 && openedQty > 0 && !unsupportedAddOn && overClosedQty === 0,
    unsupportedAddOn,
    imbalanced: unsupportedAddOn || overClosedQty > 0,
  };
}

function buildExecutionSummary({ orders, entrySide, exitSide, exitOrder, outcomeType, fills, isManualLossResult = false }) {
  const isEntrySide = (order) => sameSide(order, entrySide);
  const isExitSide = (order) => sameSide(order, exitSide);
  const isStop = (order) => normalize(order.type) === 'stop' && isExitSide(order);
  const isTarget = (order) => normalize(order.type) === 'limit' && isExitSide(order) && !(isManualLossResult && isFilled(order));
  const isManualExit = (order) => {
    const type = normalize(order.type);
    return isFilled(order) && isExitSide(order) && (type === 'market' || (isManualLossResult && type === 'limit'));
  };
  return {
    opened: {
      filled: countOrders(orders, (order) => isFilled(order) && isEntrySide(order)),
      quantity: sumOrderQuantity(orders, (order) => isFilled(order) && isEntrySide(order), fills, filledQuantityForSummary),
    },
    stopLoss: {
      set: countOrders(orders, isStop),
      hit: countOrders(orders, (order) => isStop(order) && isFilled(order)),
      canceled: countOrders(orders, (order) => isStop(order) && isCanceled(order)),
      setQuantity: sumOrderQuantity(orders, isStop, fills),
      hitQuantity: sumOrderQuantity(orders, (order) => isStop(order) && isFilled(order), fills, filledQuantityForSummary),
      canceledQuantity: sumOrderQuantity(orders, (order) => isStop(order) && isCanceled(order), fills),
    },
    target: {
      set: countOrders(orders, isTarget),
      hit: countOrders(orders, (order) => isTarget(order) && isFilled(order)),
      canceled: countOrders(orders, (order) => isTarget(order) && isCanceled(order)),
      setQuantity: sumOrderQuantity(orders, isTarget, fills),
      hitQuantity: sumOrderQuantity(orders, (order) => isTarget(order) && isFilled(order), fills, filledQuantityForSummary),
      canceledQuantity: sumOrderQuantity(orders, (order) => isTarget(order) && isCanceled(order), fills),
    },
    exit: {
      manual: countOrders(orders, isManualExit),
      stopHit: outcomeType === 'stoppedOut' && exitOrder ? 1 : 0,
      targetHit: outcomeType === 'targetHit' && exitOrder ? 1 : 0,
      matched: exitOrder ? 1 : 0,
      manualQuantity: sumOrderQuantity(orders, isManualExit, fills, filledQuantityForSummary),
      matchedQuantity: exitOrder ? filledQuantityForSummary(exitOrder.order, fills) : 0,
    },
  };
}

function formatSummaryParts(parts = []) {
  return parts.filter(Boolean).join(' · ');
}

function buildOrderGroup({ id, label, summary, orders = [], emptyText = '' }) {
  return {
    id,
    label,
    summary,
    orders: orders.filter(Boolean),
    emptyText,
  };
}

function decorateOrder(order, { note = '', quantity = null } = {}) {
  if (!order) return null;
  return {
    ...order,
    note,
    quantity,
  };
}

export function buildLiveRecordExecutionFlow(liveRecord = {}) {
  const execution = liveRecord.execution || {};
  const result = liveRecord.result || {};
  const fills = Array.isArray(execution.fills) ? execution.fills : [];
  const orders = (Array.isArray(execution.orders) ? execution.orders : [])
    .map((order, orderIndex) => ({ order, orderIndex }));
  const direction = normalize(liveRecord.direction);
  const exitSide = oppositeSide(direction);
  const entrySide = direction === 'long' ? 'buy' : direction === 'short' ? 'sell' : '';
  const entryTimestamp = numberOrNull(execution.entry?.timestamp);
  const exitTimestamp = numberOrNull(result.exitTimestamp);
  const isEntrySide = (order) => sameSide(order, entrySide);
  const isExitSide = (order) => sameSide(order, exitSide);
  const isStop = (order) => normalize(order.type) === 'stop' && isExitSide(order);
  const isManualLossResult = normalize(result.exitType) === 'manualloss' || normalize(result.exitType) === 'manual-loss';
  const isTarget = (order) => normalize(order.type) === 'limit' && isExitSide(order) && !(isManualLossResult && isFilled(order));
  const isManualExit = (order) => {
    const type = normalize(order.type);
    return isFilled(order) && isExitSide(order) && (type === 'market' || (isManualLossResult && type === 'limit'));
  };
  const isExitFilled = (order) => isFilled(order) && isExitSide(order);

  const entryOrder = findNearestOrder(
    orders,
    (order) => isFilled(order) && normalize(order.type) === 'market' && isEntrySide(order),
    entryTimestamp
  ) || findNearestOrder(
    orders,
    (order) => isFilled(order) && isEntrySide(order),
    entryTimestamp
  );

  const stopOrder = findNearestOrder(
    orders,
    isStop,
    exitTimestamp ?? entryTimestamp
  );
  const targetOrder = findNearestOrder(
    orders,
    isTarget,
    exitTimestamp ?? entryTimestamp
  );
  const exitOrder = findNearestOrder(
    orders,
    isExitFilled,
    exitTimestamp
  );
  const outcomeType = outcomeFromExit(exitOrder, result);
  const summary = buildExecutionSummary({ orders, entrySide, exitSide, exitOrder, outcomeType, fills, isManualLossResult });
  const entryOrderItems = orders
    .filter(({ order }) => isFilled(order) && isEntrySide(order))
    .sort(sortOrderItems);
  const initialEntryTimestamp = entryOrderItems.length ? orderTimestamp(entryOrderItems[0].order) : null;
  const initialEntryItems = initialEntryTimestamp === null
    ? []
    : entryOrderItems.filter(({ order }) => orderTimestamp(order) === initialEntryTimestamp);
  const addOnEntryItems = initialEntryTimestamp === null
    ? []
    : entryOrderItems.filter(({ order }) => orderTimestamp(order) !== initialEntryTimestamp);
  const entryOrders = initialEntryItems.map((item) => buildFlowOrder(item, 'entry'));
  const addOnOrders = addOnEntryItems.map((item) => buildFlowOrder(item, 'addOnReview'));
  const stopOrders = matchingOrders(orders, isStop, 'stopLoss');
  const targetOrders = matchingOrders(orders, isTarget, 'target');
  const targetExitOrders = matchingOrders(orders, (order) => isTarget(order) && isFilled(order), 'targetExit');
  const manualExitOrders = matchingOrders(orders, isManualExit, 'manualExit');
  const allExitOrders = matchingOrders(orders, isExitFilled, 'exit');
  const openedQty = sumOrderQuantity(initialEntryItems, () => true, fills, filledQuantityForSummary);
  const closedQty = sumOrderQuantity(orders, isExitFilled, fills, filledQuantityForSummary);
  const targetExitQty = sumOrderQuantity(orders, (order) => isTarget(order) && isFilled(order), fills, filledQuantityForSummary);
  const manualExitQty = sumOrderQuantity(orders, isManualExit, fills, filledQuantityForSummary);
  const stopExitQty = sumOrderQuantity(orders, (order) => isStop(order) && isFilled(order), fills, filledQuantityForSummary);
  const addOnQty = sumOrderQuantity(addOnEntryItems, () => true, fills, filledQuantityForSummary);
  const position = {
    openedQty,
    closedQty,
    ...positionStateLabel(openedQty, closedQty, { unsupportedAddOn: addOnEntryItems.length > 0 }),
  };
  const matchedOrderIndexes = new Set(
    [entryOrders, stopOrders, targetOrders, allExitOrders, addOnOrders]
      .flat()
      .map((order) => order.orderIndex)
  );
  const reviewOrders = orders
    .filter((item) => !matchedOrderIndexes.has(item.orderIndex))
    .filter((item) => Array.isArray(item.order.lessonIds) && item.order.lessonIds.length)
    .map((item) => buildFlowOrder(item, 'reviewOrder'));
  const groups = [
    buildOrderGroup({
      id: 'position',
      label: 'Position',
      summary: formatSummaryParts([
        `${formatContracts(position.openedQty)} opened`,
        `${formatContracts(position.closedQty)} closed`,
        position.overClosedQty ? `${formatContracts(position.overClosedQty)} over-closed` : '',
        position.unsupportedAddOn ? 'unsupported add-on' : '',
        position.flat ? 'flat' : `${formatContracts(position.remainingQty)} remaining`,
      ]),
      orders: [],
      emptyText: '',
    }),
    buildOrderGroup({
      id: 'open',
      label: 'Open',
      summary: formatSummaryParts([
        formatContracts(openedQty),
        formatCountLabel(entryOrders.length || 0, 'filled order'),
      ]),
      orders: entryOrders.map((order) => decorateOrder(order, {
        note: 'Entry order filled',
        quantity: orderQuantity(order, fills),
      })),
      emptyText: 'Entry order not matched',
    }),
    buildOrderGroup({
      id: 'targetExits',
      label: 'Target Exits',
      summary: formatSummaryParts([
        formatContractsAction(targetExitQty, 'hit'),
        formatCountLabel(targetOrders.length || 0, 'order'),
        summary.target.canceledQuantity ? formatContractsAction(summary.target.canceledQuantity, 'canceled') : '',
      ]),
      orders: targetOrders.map((order) => decorateOrder(order, {
        note: isFilled(order) ? 'Target exit filled' : bracketNote({ order }, exitOrder),
        quantity: orderQuantity(order, fills),
      })),
      emptyText: 'No target exit order found',
    }),
    buildOrderGroup({
      id: 'manualExits',
      label: 'Manual Exits',
      summary: formatSummaryParts([
        formatContracts(manualExitQty),
        'Manual/Market',
        formatCountLabel(manualExitOrders.length || 0, 'order'),
      ]),
      orders: manualExitOrders.map((order) => decorateOrder(order, {
        note: 'Manual/market exit filled',
        quantity: orderQuantity(order, fills),
      })),
      emptyText: 'No manual/market exit order found',
    }),
    buildOrderGroup({
      id: 'stopLoss',
      label: 'Stop Loss',
      summary: formatSummaryParts([
        formatContractsAction(summary.stopLoss.setQuantity, 'set'),
        formatCountLabel(summary.stopLoss.set || 0, 'order'),
        formatContractsAction(summary.stopLoss.hitQuantity, 'hit'),
        formatContractsAction(summary.stopLoss.canceledQuantity, 'canceled'),
      ]),
      orders: stopOrders.map((order) => decorateOrder(order, {
        note: isFilled(order) ? 'Stop-loss exit filled' : bracketNote({ order }, exitOrder),
        quantity: orderQuantity(order, fills),
      })),
      emptyText: 'No stop-loss order found',
    }),
  ];
  if (addOnOrders.length) {
    groups.push(buildOrderGroup({
      id: 'openReview',
      label: 'Open Review',
      summary: formatSummaryParts([
        `${formatContracts(addOnQty)} same-side filled after entry`,
        'unsupported add-on',
      ]),
      orders: addOnOrders.map((order) => decorateOrder(order, {
        note: 'Unsupported add-on / scale-in order',
        quantity: orderQuantity(order, fills),
      })),
      emptyText: '',
    }));
  }
  if (reviewOrders.length) {
    groups.push(buildOrderGroup({
      id: 'reviewOrders',
      label: 'Review Orders',
      summary: `${reviewOrders.length} tagged`,
      orders: reviewOrders.map((order) => decorateOrder(order, { note: 'Manual review tag' })),
      emptyText: '',
    }));
  }

  return {
    outcome: {
      type: outcomeType,
      label: outcomeLabel(outcomeType),
      status: result.status || '',
      exitType: result.exitType || '',
      pnlText: clean(result.note).match(/P\/L\s+([^;]+)/)?.[1] || '',
    },
    position,
    exitBreakdown: {
      targetQty: targetExitQty,
      manualQty: manualExitQty,
      stopQty: stopExitQty,
    },
    groups,
    rawOrders: orders.map(({ order, orderIndex }) => ({ ...order, orderIndex })),
  };
}
