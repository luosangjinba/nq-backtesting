import { element, icon } from './dom-primitives.js';

function selectedLabel(instruments, inputs) {
  const selected = instruments.filter((_, index) => inputs[index].checked);
  if (selected.length === 0) return 'Select instruments';
  if (selected.length <= 2) return selected.map((item) => item.label).join(', ');
  return `${selected.length} instruments selected`;
}

function createCategoryFilter(instruments, onChange) {
  const categories = ['All', ...new Set(instruments.map((item) => item.category ?? 'Other'))];
  const buttons = categories.map((category) => element('button', {
    className: 'instrument-category', type: 'button', text: category,
    onClick: () => select(category),
  }));
  let selected = 'All';
  function select(category, notify = true) {
    selected = category;
    buttons.forEach((button, index) => button.classList.toggle('is-active', categories[index] === category));
    if (notify) onChange();
  }
  select('All', false);
  return Object.freeze({
    element: element('div', { className: 'instrument-categories', 'aria-label': 'Instrument categories' }, buttons),
    selected: () => selected,
    reset: () => select('All', false),
  });
}

function createOptionRecords(instruments, onSelectionChange) {
  return instruments.map((instrument, index) => {
    const input = element('input', {
      type: 'checkbox', name: 'instrument', value: instrument.id,
      id: `instrument-${index}`,
    });
    const row = element('label', { className: 'instrument-picker-option', for: input.id }, [
      input,
      element('span', { className: 'instrument-option-copy' }, [
        element('span', { className: 'instrument-symbol', text: instrument.label }),
        element('span', { className: 'instrument-market', text: instrument.market }),
      ]),
      element('span', { className: 'instrument-venue', text: instrument.venue ?? '' }),
    ]);
    input.addEventListener('change', onSelectionChange);
    const searchText = [instrument.label, instrument.market, instrument.category, instrument.venue]
      .filter(Boolean).join(' ').toLocaleLowerCase();
    return { input, instrument, row, searchText };
  });
}

/**
 * Owner: session-store UI adapter.
 * Purpose: provide one compact, accessible multi-select instrument control.
 * Inputs: immutable instrument display configuration.
 * Outputs: owned DOM plus selectedIds/reset APIs.
 * Side effects: updates only its own summary label and native checkbox state.
 */
export function createInstrumentPicker(instruments, { onSelectionChange = () => {} } = {}) {
  if (typeof onSelectionChange !== 'function') {
    throw new TypeError('Instrument picker selection callback must be a function.');
  }
  const value = element('span', { className: 'instrument-picker-value' });
  const summary = element('summary', { className: 'instrument-picker-trigger' }, [
    value,
    icon('chevronDown'),
  ]);
  const search = element('input', {
    className: 'instrument-picker-search', type: 'search',
    placeholder: 'Search instruments', 'aria-label': 'Search instruments',
    autocomplete: 'off',
  });
  let applyFilters = () => {};
  let records = [];
  const selectedIds = () => records
    .filter(({ input }) => input.checked)
    .map(({ input }) => input.value);
  records = createOptionRecords(instruments, () => {
    value.textContent = selectedLabel(instruments, records.map((record) => record.input));
    onSelectionChange(selectedIds());
  });
  const categories = createCategoryFilter(instruments, () => applyFilters());
  const empty = element('p', { className: 'instrument-picker-empty', text: 'No matching instruments.', hidden: '' });
  const list = element('div', { className: 'instrument-picker-list', role: 'group', 'aria-label': 'Instruments' });
  records.forEach(({ row }) => list.append(row));
  const options = element('div', { className: 'instrument-picker-options' }, [
    search,
    categories.element,
    element('span', { className: 'instrument-list-heading', text: 'Available instruments' }),
    list,
    empty,
  ]);
  const picker = element('details', { className: 'instrument-picker' }, [summary, options]);

  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    const category = categories.selected();
    let visible = 0;
    records.forEach(({ instrument, row, searchText }) => {
      const wrongCategory = category !== 'All' && (instrument.category ?? 'Other') !== category;
      row.hidden = wrongCategory || (query.length > 0 && !searchText.includes(query));
      if (!row.hidden) visible += 1;
    });
    empty.hidden = visible > 0;
  }
  applyFilters = filter;
  search.addEventListener('input', filter);

  function reset() {
    records.forEach(({ input }) => { input.checked = false; });
    search.value = '';
    categories.reset();
    filter();
    picker.open = false;
    value.textContent = selectedLabel(instruments, records.map((record) => record.input));
  }
  reset();

  return Object.freeze({
    element: picker,
    selectedIds,
    close: () => { picker.open = false; },
    isOpen: () => picker.open,
    reset,
  });
}
