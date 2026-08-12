import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATE_ID } from '../domain/contract.js';
import { fail } from '../domain/diagnostic.js';
import { compareText } from '../domain/canonical-json.js';
import { EXAMPLES_ROOT } from './layout.js';

export function loadTemplate(templateId) {
  if (templateId !== TEMPLATE_ID) {
    fail('request', 'V7DK_REQUEST_INVALID', 'scaffold', 'Scaffold template is unsupported.');
  }
  const root = path.join(EXAMPLES_ROOT, TEMPLATE_ID);
  const files = [];
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target, logicalPath);
      else if (entry.isFile()) files.push(Object.freeze({ bytes: fs.readFileSync(target), path: logicalPath }));
      else fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'scaffold', 'Template contains a special file.');
    }
  }
  visit(root);
  return Object.freeze(files);
}
