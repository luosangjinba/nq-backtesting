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

function orderTimestamp(order = {}) {
  return numberOrNull(order.timestamp);
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

function outcomeFromExit(exitOrder, result = {}) {
  const exitType = normalize(result.exitType);
  const status = normalize(result.status);
  const type = normalize(exitOrder?.order?.type);
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

function buildExecutionSummary({ orders, entrySide, exitSide, exitOrder, outcomeType }) {
  const isEntrySide = (order) => sameSide(order, entrySide);
  const isExitSide = (order) => sameSide(order, exitSide);
  const isStop = (order) => normalize(order.type) === 'stop' && isExitSide(order);
  const isTarget = (order) => normalize(order.type) === 'limit' && isExitSide(order);
  const isManualExit = (order) => normalize(order.type) === 'market' && isFilled(order) && isExitSide(order);
  return {
    opened: {
      filled: countOrders(orders, (order) => isFilled(order) && isEntrySide(order)),
    },
    stopLoss: {
      set: countOrders(orders, isStop),
      hit: countOrders(orders, (order) => isStop(order) && isFilled(order)),
      canceled: countOrders(orders, (order) => isStop(order) && isCanceled(order)),
    },
    target: {
      set: countOrders(orders, isTarget),
      hit: countOrders(orders, (order) => isTarget(order) && isFilled(order)),
      canceled: countOrders(orders, (order) => isTarget(order) && isCanceled(order)),
    },
    exit: {
      manual: countOrders(orders, isManualExit),
      stopHit: outcomeType === 'stoppedOut' && exitOrder ? 1 : 0,
      targetHit: outcomeType === 'targetHit' && exitOrder ? 1 : 0,
      matched: exitOrder ? 1 : 0,
    },
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

  const entryOrder = findNearestOrder(
    orders,
    (order) => isFilled(order) && normalize(order.type) === 'market' && sameSide(order, entrySide),
    entryTimestamp
  ) || findNearestOrder(
    orders,
    (order) => isFilled(order) && sameSide(order, entrySide),
    entryTimestamp
  );

  const stopOrder = findNearestOrder(
    orders,
    (order) => normalize(order.type) === 'stop' && sameSide(order, exitSide),
    exitTimestamp ?? entryTimestamp
  );
  const targetOrder = findNearestOrder(
    orders,
    (order) => normalize(order.type) === 'limit' && sameSide(order, exitSide),
    exitTimestamp ?? entryTimestamp
  );
  const exitOrder = findNearestOrder(
    orders,
    (order) => isFilled(order) && sameSide(order, exitSide),
    exitTimestamp
  );
  const outcomeType = outcomeFromExit(exitOrder, result);
  const summary = buildExecutionSummary({ orders, entrySide, exitSide, exitOrder, outcomeType });
  const matchedOrderIndexes = new Set(
    [entryOrder, stopOrder, targetOrder, exitOrder]
      .filter(Boolean)
      .map((item) => item.orderIndex)
  );
  const reviewOrders = orders
    .filter((item) => !matchedOrderIndexes.has(item.orderIndex))
    .filter((item) => Array.isArray(item.order.lessonIds) && item.order.lessonIds.length)
    .map((item) => buildFlowOrder(item, 'reviewOrder'));

  return {
    entry: {
      order: buildFlowOrder(entryOrder, 'entry'),
      element: execution.entry || {},
      quantity: entryOrder ? orderQuantity(entryOrder.order, fills) : null,
      note: entryOrder ? 'Entry order filled' : 'Entry order not matched',
    },
    protection: {
      stopLoss: {
        order: buildFlowOrder(stopOrder, 'stopLoss'),
        element: execution.stopLoss || {},
        note: bracketNote(stopOrder, exitOrder),
      },
      target: {
        order: buildFlowOrder(targetOrder, 'target'),
        element: Array.isArray(execution.targets) ? execution.targets[0] || {} : {},
        note: bracketNote(targetOrder, exitOrder),
      },
    },
    exit: {
      order: buildFlowOrder(exitOrder, 'exit'),
      element: result,
      quantity: exitOrder ? orderQuantity(exitOrder.order, fills) : null,
      note: exitOrder ? 'Exit order filled' : 'Exit order not matched',
    },
    outcome: {
      type: outcomeType,
      label: outcomeLabel(outcomeType),
      status: result.status || '',
      exitType: result.exitType || '',
      pnlText: clean(result.note).match(/P\/L\s+([^;]+)/)?.[1] || '',
    },
    summary,
    reviewOrders,
    rawOrders: orders.map(({ order, orderIndex }) => ({ ...order, orderIndex })),
  };
}
