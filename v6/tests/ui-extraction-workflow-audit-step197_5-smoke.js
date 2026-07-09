import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const audit = await readFile('v6/docs/V6_UI_EXTRACTION_WORKFLOW_AUDIT_STEP197_5.md', 'utf8');

assert.equal(audit.includes('JCodesMore/ai-website-cloner-template'), true);
assert.equal(audit.includes('process reference'), true);
assert.equal(audit.includes('Rejected for V6'), true);
assert.equal(audit.includes('Next.js, React, shadcn/ui, Tailwind'), true);
assert.equal(audit.includes('Step 198 remains the next chart-data task'), true);

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

const forbiddenFiles = [
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'components.json',
  'postcss.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
].map((file) => path.join('v6', file));

for (const file of forbiddenFiles) {
  await assert.rejects(
    () => readFile(file, 'utf8'),
    /ENOENT/,
    `Step 197.5 must not introduce ${file}`,
  );
}

const sourceFiles = (await walkFiles('v6/src')).filter((file) => file.endsWith('.js'));
const forbiddenTokens = [
  'from "react"',
  "from 'react'",
  'from "next/',
  "from 'next/",
  'from "lucide-react"',
  "from 'lucide-react'",
  'from "class-variance-authority"',
  "from 'class-variance-authority'",
  'tailwind-merge',
  'shadcn',
];

const violations = [];
for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8');
  forbiddenTokens.forEach((token) => {
    if (text.includes(token)) {
      violations.push(`${file}: ${token}`);
    }
  });
}

assert.deepEqual(violations, []);

console.log('v6 UI extraction workflow audit step 197.5 smoke passed');
