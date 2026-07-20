import { element, icon } from './dom-primitives.js';
import {
  createDecadePage,
  createLocalDate,
  createMonthGrid,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from './date-time-calendar-model.js';

const PRECISION_LENGTH = Object.freeze({ minute: 16, second: 19 });
const VIEW = Object.freeze({ DAYS: 'days', MONTHS: 'months', YEARS: 'years' });

function pad(value) {
  return String(value).padStart(2, '0');
}

function replaceChildren(node, children) {
  node.replaceChildren(...children);
}

function formatTrigger(date, precision) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    second: precision === 'second' ? '2-digit' : undefined,
  }).format(date);
}

/**
 * Owner: session-browser UI adapter.
 * Purpose: convert an epoch into the local, zone-free value consumed by a
 * date-time control without leaking presentation formatting into its caller.
 * Inputs: finite epoch milliseconds and minute/second display precision.
 * Outputs: a `datetime-local` compatible string.
 * Side effects: none.
 * Errors: rejects non-finite epochs and unsupported precision values.
 */
export function formatLocalDateTimeValue(epochMs, precision = 'minute') {
  if (!Number.isFinite(epochMs)) throw new TypeError('Date-time epoch must be finite.');
  if (!Object.hasOwn(PRECISION_LENGTH, precision)) throw new TypeError('Date-time precision is unsupported.');
  const date = new Date(epochMs);
  const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return value.slice(0, PRECISION_LENGTH[precision]);
}

/**
 * Owner: session-browser UI adapter.
 * Purpose: normalize the local wall-time value emitted by a conforming
 * date-time adapter into the Session creation epoch contract.
 * Inputs: empty or local date-time string.
 * Outputs: epoch milliseconds, or NaN when empty/invalid.
 * Side effects: none.
 */
export function parseLocalDateTimeValue(value) {
  if (typeof value !== 'string' || value.length === 0) return Number.NaN;
  return new Date(value).getTime();
}

function createStructure(name, label) {
  const hiddenInput = element('input', { name, type: 'hidden' });
  const triggerText = element('span', { className: 'date-time-trigger-text', text: 'Select date and time' });
  const trigger = element('button', {
    className: 'date-time-trigger', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    'aria-label': `Choose ${label} date and time`,
  }, [triggerText, icon('calendar')]);
  const heading = element('div', { className: 'date-time-heading' });
  const body = element('div', { className: 'date-time-body' });
  const popover = element('div', {
    className: 'date-time-popover', role: 'dialog', 'aria-label': `Choose ${label} date and time`, hidden: '',
  }, [
    element('div', { className: 'date-time-nav' }, [
      element('button', { className: 'date-time-nav-button date-time-previous', type: 'button', 'aria-label': 'Previous' }, [icon('chevronLeft')]),
      heading,
      element('button', { className: 'date-time-nav-button date-time-next', type: 'button', 'aria-label': 'Next' }, [icon('chevronRight')]),
    ]),
    body,
    element('div', { className: 'date-time-actions' }, [
      element('button', { className: 'date-time-action date-time-today', type: 'button', text: 'Today' }),
      element('button', { className: 'date-time-action date-time-clear', type: 'button', text: 'Clear' }),
    ]),
  ]);
  const root = element('div', { className: 'date-time-control' }, [hiddenInput, trigger, popover]);
  return { root, hiddenInput, trigger, triggerText, heading, body, popover };
}

class DateTimeControl {
  constructor({ name, label, precision, now }) {
    this.precision = precision;
    this.now = now;
    this.nodes = createStructure(name, label);
    this.selected = null;
    const today = new Date(this.now());
    this.displayYear = today.getFullYear();
    this.displayMonth = today.getMonth();
    this.view = VIEW.DAYS;
    this.bind();
    this.render();
  }

  bind() {
    const { trigger, popover } = this.nodes;
    trigger.addEventListener('click', () => (this.isOpen() ? this.close() : this.open()));
    popover.querySelector('.date-time-previous').addEventListener('click', () => this.navigate(-1));
    popover.querySelector('.date-time-next').addEventListener('click', () => this.navigate(1));
    popover.querySelector('.date-time-today').addEventListener('click', () => this.select(new Date(this.now())));
    popover.querySelector('.date-time-clear').addEventListener('click', () => this.clear());
    this.nodes.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.isOpen()) return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
      trigger.focus();
    });
  }

  open() {
    this.nodes.popover.hidden = false;
    this.nodes.trigger.setAttribute('aria-expanded', 'true');
    this.render();
  }

  close() {
    this.nodes.popover.hidden = true;
    this.nodes.trigger.setAttribute('aria-expanded', 'false');
    this.view = VIEW.DAYS;
  }

  isOpen() {
    return !this.nodes.popover.hidden;
  }

  reset() {
    this.selected = null;
    this.nodes.hiddenInput.value = '';
    this.nodes.triggerText.textContent = 'Select date and time';
    const today = new Date(this.now());
    this.displayYear = today.getFullYear();
    this.displayMonth = today.getMonth();
    this.close();
    this.render();
  }

  clear() {
    this.reset();
    this.nodes.trigger.focus();
  }

  select(date) {
    this.selected = new Date(date.getTime());
    this.displayYear = date.getFullYear();
    this.displayMonth = date.getMonth();
    this.nodes.hiddenInput.value = formatLocalDateTimeValue(date.getTime(), this.precision);
    this.nodes.triggerText.textContent = formatTrigger(date, this.precision);
    this.view = VIEW.DAYS;
    this.render();
  }

  setTimePart(part, delta) {
    const base = this.selected ?? new Date(this.displayYear, this.displayMonth, 1, 0, 0, 0, 0);
    const next = new Date(base.getTime());
    if (part === 'hour') next.setHours((next.getHours() + delta + 24) % 24);
    if (part === 'minute') next.setMinutes((next.getMinutes() + delta + 60) % 60);
    if (part === 'second') next.setSeconds((next.getSeconds() + delta + 60) % 60);
    this.select(next);
  }

  navigate(delta) {
    if (this.view === VIEW.YEARS) this.displayYear += delta * 10;
    else if (this.view === VIEW.MONTHS) this.displayYear += delta;
    else {
      const next = new Date(this.displayYear, this.displayMonth + delta, 1);
      this.displayYear = next.getFullYear();
      this.displayMonth = next.getMonth();
    }
    this.render();
  }

  renderHeading() {
    const { heading } = this.nodes;
    if (this.view === VIEW.YEARS) {
      const decade = createDecadePage(this.displayYear);
      replaceChildren(heading, [element('span', { className: 'date-time-heading-static', text: `${decade.start} – ${decade.end}` })]);
      return;
    }
    if (this.view === VIEW.MONTHS) {
      replaceChildren(heading, [element('button', {
        className: 'date-time-heading-button', type: 'button', text: String(this.displayYear),
        onClick: () => { this.view = VIEW.YEARS; this.render(); },
      })]);
      return;
    }
    replaceChildren(heading, [
      element('button', {
        className: 'date-time-heading-button', type: 'button', text: MONTH_LABELS[this.displayMonth],
        onClick: () => { this.view = VIEW.MONTHS; this.render(); },
      }),
      element('button', {
        className: 'date-time-heading-button', type: 'button', text: String(this.displayYear),
        onClick: () => { this.view = VIEW.YEARS; this.render(); },
      }),
    ]);
  }

  renderDays() {
    const weekdays = WEEKDAY_LABELS.map((label) => element('span', { className: 'date-time-weekday', text: label }));
    const days = createMonthGrid({
      year: this.displayYear, month: this.displayMonth, selected: this.selected, today: new Date(this.now()),
    }).map((item) => element('button', {
      className: `date-time-day${item.outside ? ' is-outside' : ''}${item.selected ? ' is-selected' : ''}${item.today ? ' is-today' : ''}`,
      type: 'button', text: String(item.day), 'aria-label': `${MONTH_LABELS[item.month]} ${item.day}, ${item.year}`,
      onClick: () => {
        const time = this.selected ?? new Date(this.now());
        this.select(createLocalDate({
          ...item, hour: time.getHours(), minute: time.getMinutes(), second: time.getSeconds(),
        }));
      },
    }));
    return element('div', { className: 'date-time-calendar' }, [...weekdays, ...days]);
  }

  renderTime() {
    const parts = ['hour', 'minute', ...(this.precision === 'second' ? ['second'] : [])];
    const date = this.selected ?? new Date(this.now());
    const values = { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };
    const children = [];
    parts.forEach((part, index) => {
      if (index > 0) children.push(element('span', { className: 'date-time-separator', text: ':' }));
      children.push(element('div', { className: 'date-time-stepper' }, [
        element('button', {
          className: 'date-time-step', type: 'button', 'aria-label': `Increase ${part}`,
          onClick: () => this.setTimePart(part, 1),
        }, [icon('chevronUp')]),
        element('span', { className: 'date-time-number', text: pad(values[part]) }),
        element('button', {
          className: 'date-time-step', type: 'button', 'aria-label': `Decrease ${part}`,
          onClick: () => this.setTimePart(part, -1),
        }, [icon('chevronDown')]),
      ]));
    });
    return element('div', { className: 'date-time-clock', 'aria-label': 'Time' }, children);
  }

  renderMonths() {
    return element('div', { className: 'date-time-choice-grid date-time-months' }, MONTH_LABELS.map((label, month) => element('button', {
      className: `date-time-choice${month === this.displayMonth ? ' is-current' : ''}`,
      type: 'button', text: label.slice(0, 3),
      onClick: () => { this.displayMonth = month; this.view = VIEW.DAYS; this.render(); },
    })));
  }

  renderYears() {
    const decade = createDecadePage(this.displayYear);
    return element('div', { className: 'date-time-choice-grid date-time-years' }, decade.years.map((year) => element('button', {
      className: `date-time-choice${year === this.displayYear ? ' is-current' : ''}`,
      type: 'button', text: String(year),
      onClick: () => { this.displayYear = year; this.view = VIEW.MONTHS; this.render(); },
    })));
  }

  render() {
    this.renderHeading();
    if (this.view === VIEW.MONTHS) replaceChildren(this.nodes.body, [this.renderMonths()]);
    else if (this.view === VIEW.YEARS) replaceChildren(this.nodes.body, [this.renderYears()]);
    else replaceChildren(this.nodes.body, [this.renderDays(), this.renderTime()]);
  }
}

/**
 * Owner: session-browser UI adapter.
 * Purpose: create the replaceable professional date-time-control contract.
 * Inputs: form name, minute/second precision, and injectable wall clock.
 * Outputs: owned element plus reset/read/set/open-state methods.
 * Side effects: owns only its DOM subtree and scoped event listeners.
 * Errors: invalid epochs/precision are rejected before mutating the control.
 * Protected invariant: Session creation reads date-times only through this
 * boundary, so presentation replacement cannot fork creation semantics.
 */
export function createDateTimeControl({ name, label = name, precision = 'minute', now = () => Date.now() }) {
  if (!Object.hasOwn(PRECISION_LENGTH, precision)) throw new TypeError('Date-time precision is unsupported.');
  const controller = new DateTimeControl({ name, label, precision, now });
  return Object.freeze({
    element: controller.nodes.root,
    reset: () => controller.reset(),
    readEpochMs: () => parseLocalDateTimeValue(controller.nodes.hiddenInput.value),
    setEpochMs(epochMs) {
      const value = formatLocalDateTimeValue(epochMs, precision);
      controller.select(new Date(parseLocalDateTimeValue(value)));
    },
    value: () => controller.nodes.hiddenInput.value,
    close: () => controller.close(),
    isOpen: () => controller.isOpen(),
  });
}
