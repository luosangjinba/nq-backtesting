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
  const isTarget = (order) => normalize(order.type) === 'limit' && isExitSide(order);
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
  const summary = buildExecutionSummary({ orders, entrySide, exitSide, exitOrder, outcomeType });
  const entryOrders = matchingOrders(orders, (order) => isFilled(order) && isEntrySide(order), 'entry');
  const stopOrders = matchingOrders(orders, isStop, 'stopLoss');
  const targetOrders = matchingOrders(orders, isTarget, 'target');
  const exitOrders = matchingOrders(orders, isExitFilled, 'exit');
  const matchedOrderIndexes = new Set(
    [entryOrders, stopOrders, targetOrders, exitOrders]
      .flat()
      .map((order) => order.orderIndex)
  );
  const reviewOrders = orders
    .filter((item) => !matchedOrderIndexes.has(item.orderIndex))
    .filter((item) => Array.isArray(item.order.lessonIds) && item.order.lessonIds.length)
    .map((item) => buildFlowOrder(item, 'reviewOrder'));
  const exitParts = [];
  if (summary.exit.manual) exitParts.push(`Manual/Market ${summary.exit.manual}`);
  if (summary.exit.stopHit) exitParts.push(`Stop hit ${summary.exit.stopHit}`);
  if (summary.exit.targetHit) exitParts.push(`Target hit ${summary.exit.targetHit}`);
  if (!exitParts.length && summary.exit.matched) exitParts.push(`Matched ${summary.exit.matched}`);
  if (!exitParts.length) exitParts.push(outcomeLabel(outcomeType));
  const groups = [
    buildOrderGroup({
      id: 'open',
      label: 'Open',
      summary: `${summary.opened.filled || 0} filled`,
      orders: entryOrders.map((order) => decorateOrder(order, {
        note: 'Entry order filled',
        quantity: orderQuantity(order, fills),
      })),
      emptyText: 'Entry order not matched',
    }),
    buildOrderGroup({
      id: 'stopLoss',
      label: 'Stop Loss',
      summary: formatSummaryParts([
        `${summary.stopLoss.set || 0} set`,
        `${summary.stopLoss.hit || 0} hit`,
        `${summary.stopLoss.canceled || 0} canceled`,
      ]),
      orders: stopOrders.map((order) => decorateOrder(order, {
        note: bracketNote({ order }, exitOrder),
      })),
      emptyText: 'No stop-loss order found',
    }),
    buildOrderGroup({
      id: 'target',
      label: 'Target',
      summary: formatSummaryParts([
        `${summary.target.set || 0} set`,
        `${summary.target.hit || 0} hit`,
        `${summary.target.canceled || 0} canceled`,
      ]),
      orders: targetOrders.map((order) => decorateOrder(order, {
        note: bracketNote({ order }, exitOrder),
      })),
      emptyText: 'No target order found',
    }),
    buildOrderGroup({
      id: 'exit',
      label: 'Exit',
      summary: formatSummaryParts(exitParts),
      orders: exitOrders.map((order) => decorateOrder(order, {
        note: 'Exit order filled',
        quantity: orderQuantity(order, fills),
      })),
      emptyText: 'Exit order not matched',
    }),
  ];
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
    groups,
    rawOrders: orders.map(({ order, orderIndex }) => ({ ...order, orderIndex })),
  };
}
