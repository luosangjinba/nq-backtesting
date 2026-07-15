import { readFile, readdir } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await listJavaScriptFiles(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files.sort();
}

export async function loadTestCatalog({ directory = 'v6/tests' } = {}) {
  const files = await listJavaScriptFiles(directory);
  const catalog = [];
  for (const path of files) {
    const source = await readFile(path, 'utf8');
    catalog.push(classifyTestFile({ path, source }));
  }
  return Object.freeze(catalog);
}
