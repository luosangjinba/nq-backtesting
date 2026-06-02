const DEFAULT_PAGE = Object.freeze({ kind: 'home' });

let currentPage = { ...DEFAULT_PAGE };
let backStack = [];

function clonePage(page = DEFAULT_PAGE) {
  return { ...DEFAULT_PAGE, ...(page || {}) };
}

export function getInspectorPage() {
  return clonePage(currentPage);
}

export function getInspectorBackStack() {
  return backStack.map(clonePage);
}

export function resetInspectorPage(page = DEFAULT_PAGE) {
  currentPage = clonePage(page);
  backStack = [];
}

export function replaceInspectorPage(page = DEFAULT_PAGE) {
  currentPage = clonePage(page);
}

export function pushInspectorPage(page = DEFAULT_PAGE) {
  backStack.push(clonePage(currentPage));
  currentPage = clonePage(page);
}

export function canPopInspectorPage() {
  return backStack.length > 0;
}

export function popInspectorPage() {
  if (!backStack.length) {
    currentPage = clonePage(DEFAULT_PAGE);
    return currentPage;
  }
  currentPage = backStack.pop();
  return clonePage(currentPage);
}
