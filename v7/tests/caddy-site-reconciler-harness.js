import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const reconciler = path.join(
  repositoryRoot,
  'v7/deploy/linux/lib/caddy-site-reconciler.py',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-caddy-reconcile-'));
const publicIp = '146.190.100.212';
const fragment = path.join(temporaryDirectory, 'replay-lab.Caddyfile');
const source = path.join(temporaryDirectory, 'Caddyfile.source');
const output = path.join(temporaryDirectory, 'Caddyfile.output');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  repositoryRoot,
  'v7/tests/fixtures/caddy-site-reconciliation/negative/cases.json',
), 'utf8'));

const replaySite = `${publicIp} {
  @market_data path /v7/market-data/*
  reverse_proxy @market_data 127.0.0.1:8766
  reverse_proxy 127.0.0.1:8007
}`;
fs.writeFileSync(fragment, `${replaySite}\n`);

function runReconciler({
  caddySource,
  existingFragment = fragment,
  host = publicIp,
  clearDefaultSni = false,
  manageDefaultSni = true,
}) {
  fs.writeFileSync(source, caddySource);
  const argumentsList = [
    reconciler,
    '--input', source,
    '--output', output,
    '--public-host', host,
    '--fragment', fragment,
    '--base-dir', temporaryDirectory,
  ];
  if (existingFragment) argumentsList.push('--existing-fragment', existingFragment);
  if (manageDefaultSni) argumentsList.push('--manage-default-sni');
  if (clearDefaultSni) argumentsList.push('--clear-managed-default-sni');
  const result = spawnSync('python3', argumentsList, { encoding: 'utf8' });
  return {
    ...result,
    output: result.status === 0 ? fs.readFileSync(output, 'utf8') : '',
  };
}

try {
  const fresh = runReconciler({ caddySource: '' });
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.match(fresh.output, new RegExp(`default_sni ${publicIp.replaceAll('.', '\\.')}`));
  assert.equal((fresh.output.match(/import .*replay-lab\.Caddyfile/g) ?? []).length, 1);

  const shared = runReconciler({
    caddySource: [
      '{',
      `  default_sni ${publicIp}`,
      '}',
      '',
      'recap.example.com {',
      '  respond "existing site"',
      '}',
      '',
    ].join('\n'),
    existingFragment: null,
  });
  assert.equal(shared.status, 0, shared.stderr);
  assert.match(shared.output, /recap\.example\.com/);
  assert.equal((shared.output.match(/import .*replay-lab\.Caddyfile/g) ?? []).length, 1);

  const ambiguousLegacySource = [
    '{',
    '  default_sni 43.110.32.34',
    '}',
    '',
    'recap.example.com {',
    '  respond "existing site"',
    '}',
    '',
    replaySite,
    '',
    `import ${fragment}`,
    `import ${fragment}`,
    '',
  ].join('\n');
  const legacyShared = runReconciler({ caddySource: ambiguousLegacySource });
  assert.equal(legacyShared.status, 0, legacyShared.stderr);
  assert.match(legacyShared.stdout, /legacy-managed-site-migrated/);
  assert.match(legacyShared.output, /recap\.example\.com/);
  assert.match(legacyShared.output, new RegExp(`default_sni ${publicIp.replaceAll('.', '\\.')}`));
  assert.equal((legacyShared.output.match(new RegExp(publicIp.replaceAll('.', '\\.'), 'g')) ?? []).length, 1,
    'the requested IP remains only as default_sni in the main Caddyfile');
  assert.equal((legacyShared.output.match(/import .*replay-lab\.Caddyfile/g) ?? []).length, 1,
    'repeat deployment retains exactly one managed import');

  const repeated = runReconciler({ caddySource: legacyShared.output });
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(repeated.output, legacyShared.output, 'reconciliation must be idempotent');

  const duplicateImport = runReconciler({
    caddySource: [
      '{',
      `  default_sni ${publicIp}`,
      '}',
      '',
      `import ${fragment}`,
      `import ${fragment}`,
      '',
    ].join('\n'),
  });
  assert.equal(duplicateImport.status, 0, duplicateImport.stderr);
  assert.equal((duplicateImport.output.match(/import .*replay-lab\.Caddyfile/g) ?? []).length, 1);

  const globImport = runReconciler({
    caddySource: [
      '{',
      `  default_sni ${publicIp}`,
      '}',
      '',
      'recap.example.com {',
      '  respond "existing site"',
      '}',
      '',
      'import *.Caddyfile',
      '',
    ].join('\n'),
  });
  assert.equal(globImport.status, 0, globImport.stderr);
  assert.match(globImport.output, /import \*\.Caddyfile/);
  assert.doesNotMatch(globImport.output, /BEGIN REPLAY LAB MANAGED IMPORT/);

  const domainShared = runReconciler({
    caddySource: [
      '{',
      `  default_sni ${publicIp}`,
      '}',
      '',
      'recap.example.com {',
      '  respond "existing"',
      '}',
      '',
      `import ${fragment}`,
      '',
    ].join('\n'),
    host: 'replay.example.com',
    manageDefaultSni: false,
    clearDefaultSni: true,
  });
  assert.equal(domainShared.status, 0, domainShared.stderr);
  assert.doesNotMatch(domainShared.output, /default_sni/);
  assert.match(domainShared.output, /recap\.example\.com/);

  const foreignDefaultDuringDomainMigration = runReconciler({
    caddySource: [
      '{',
      '  default_sni 43.110.32.34',
      '}',
      '',
      `import ${fragment}`,
      '',
    ].join('\n'),
    host: 'replay.example.com',
    manageDefaultSni: false,
    clearDefaultSni: true,
  });
  assert.equal(foreignDefaultDuringDomainMigration.status, 0,
    foreignDefaultDuringDomainMigration.stderr);
  assert.match(foreignDefaultDuringDomainMigration.output, /default_sni 43\.110\.32\.34/,
    'domain migration must preserve an IPv4 default SNI not named by the managed Replay site');

  for (const negativeCase of negativeCases) {
    const result = runReconciler({
      caddySource: negativeCase.source.replaceAll('@@PUBLIC_IP@@', publicIp),
      existingFragment: negativeCase.existingFragment ? fragment : null,
    });
    assert.notEqual(result.status, 0, `${negativeCase.id} must fail closed`);
    assert.match(result.stderr, new RegExp(negativeCase.expectedMessage));
  }

  const caddyAvailable = spawnSync('caddy', ['version'], { encoding: 'utf8' }).status === 0;
  if (caddyAvailable) {
    fs.writeFileSync(source, ambiguousLegacySource);
    const ambiguousValidation = spawnSync('caddy', ['validate', '--config', source], {
      encoding: 'utf8',
      env: { ...process.env, XDG_DATA_HOME: temporaryDirectory },
    });
    assert.notEqual(ambiguousValidation.status, 0);
    assert.match(`${ambiguousValidation.stdout}\n${ambiguousValidation.stderr}`,
      /ambiguous site definition/);
    fs.writeFileSync(source, legacyShared.output);
    const validation = spawnSync('caddy', ['validate', '--config', source], {
      encoding: 'utf8',
      env: { ...process.env, XDG_DATA_HOME: temporaryDirectory },
    });
    assert.equal(validation.status, 0, `${validation.stdout}\n${validation.stderr}`);
    fs.writeFileSync(source, domainShared.output);
    const domainMigrationValidation = spawnSync('caddy', ['validate', '--config', source], {
      encoding: 'utf8',
      env: { ...process.env, XDG_DATA_HOME: temporaryDirectory },
    });
    assert.equal(domainMigrationValidation.status, 0,
      `${domainMigrationValidation.stdout}\n${domainMigrationValidation.stderr}`);
  }

  console.log('V7 Caddy site reconciler harness: PASS', {
    transitions: 8,
    negativeControls: negativeCases.length,
    validatedWithCaddy: caddyAvailable,
  });
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
