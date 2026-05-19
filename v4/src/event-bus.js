// 发布/订阅事件系统 — 解耦模块间通信

const listeners = {};

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
}

export function off(event, fn) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter((f) => f !== fn);
}

export function emit(event, payload) {
  if (!listeners[event]) return;
  listeners[event].forEach((fn) => {
    try {
      fn(payload);
    } catch (e) {
      console.error(`[event-bus] Error in handler for "${event}":`, e);
    }
  });
}