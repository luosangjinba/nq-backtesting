import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const script = path.join(repositoryRoot, 'v7/deploy/linux/install.sh');
const caddyTemplate = path.join(repositoryRoot, 'v7/deploy/linux/caddy/Caddyfile.template');
const apiTemplate = path.join(
  repositoryRoot,
  'v7/deploy/linux/systemd/replay-lab-api.service.template',
);
const webTemplate = path.join(
  repositoryRoot,
  'v7/deploy/linux/systemd/replay-lab-web.service.template',
);
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  repositoryRoot,
  'v7/tests/fixtures/linux-deployment/negative/cases.json',
), 'utf8'));
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-linux-deploy-'));
const database = path.join(temporaryDirectory, 'trading_data.duckdb');
fs.writeFileSync(database, 'dry-run fixture only');

function execute(argumentsList) {
  return spawnSync('bash', [script, ...argumentsList], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

function expectFailure(argumentsList, expectedText) {
  const result = execute(argumentsList);
  assert.notEqual(result.status, 0, `expected failure for ${argumentsList.join(' ')}`);
  assert.match(`${result.stdout}\n${result.stderr}`, expectedText);
}

function negativeArguments(id, common) {
  switch (id) {
    case 'relative-database-path':
      return ['--dry-run', '--db', 'relative.duckdb'];
    case 'missing-database':
      return ['--dry-run', '--db', path.join(temporaryDirectory, 'missing.duckdb')];
    case 'public-without-auth':
      return [...common, '--domain', 'replay.example.com'];
    case 'apply-without-confirmation':
      return ['--apply', '--db', database];
    case 'hostname-with-scheme':
      return [...common, '--domain', 'https://replay.example.com', '--allow-public-without-auth'];
    default:
      throw new Error(`Unknown Linux deployment negative fixture: ${id}`);
  }
}

try {
  const common = ['--dry-run', '--db', database, '--service-user', os.userInfo().username];
  const caddyVersion = spawnSync('caddy', ['version'], { encoding: 'utf8' });
  const caddyAvailable = caddyVersion.status === 0;
  const passwordHashResult = caddyAvailable
    ? spawnSync('caddy', ['hash-password', '--plaintext', 'deployment-harness-password'], {
      encoding: 'utf8',
    })
    : null;
  const passwordHash = passwordHashResult?.status === 0
    ? passwordHashResult.stdout.trim()
    : '$2a$14$abcdefghijklmnopqrstuu0123456789012345678901234567890';
  const privatePlan = execute(common);
  assert.equal(privatePlan.status, 0, privatePlan.stderr);
  assert.match(privatePlan.stdout, /public proxy: disabled/);
  assert.match(privatePlan.stdout, /ssh -L 8007:127\.0\.0\.1:8007 -L 8766:127\.0\.0\.1:8766/);
  assert.match(privatePlan.stdout, /Database copy\/write: never/);
  assert.match(privatePlan.stdout, /Database service mount: read-only/);
  assert.match(privatePlan.stdout, new RegExp(`ReadOnlyPaths=${database.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(privatePlan.stdout, /dry-run complete; no host files were changed/);

  const publicPlan = execute([
    ...common,
    '--domain', 'replay.example.com',
    '--email', 'reviewer@example.com',
    '--auth-user', 'reviewer',
    '--auth-hash', passwordHash,
  ]);
  assert.equal(publicPlan.status, 0, publicPlan.stderr);
  assert.match(publicPlan.stdout, /public URL: https:\/\/replay\.example\.com\/v7\/app\//);
  assert.match(publicPlan.stdout, /mutations=blocked/);
  assert.match(publicPlan.stdout, /@(mutating) method POST PUT PATCH DELETE/);
  assert.match(publicPlan.stdout, /reverse_proxy @v4_api 127\.0\.0\.1:8766/);
  assert.match(publicPlan.stdout, /reverse_proxy 127\.0\.0\.1:8007/);
  assert.match(publicPlan.stdout, /(basic_auth|basicauth) \{/);
  if (caddyAvailable) {
    const previewStart = 'Rendered Caddy preview\n----------------------\n';
    const previewEnd = '\nPlanned host changes\n';
    const startIndex = publicPlan.stdout.indexOf(previewStart);
    const endIndex = publicPlan.stdout.indexOf(previewEnd, startIndex);
    assert.ok(startIndex >= 0 && endIndex > startIndex, 'Caddy preview must be extractable');
    const renderedCaddy = publicPlan.stdout.slice(startIndex + previewStart.length, endIndex);
    const renderedCaddyPath = path.join(temporaryDirectory, 'Caddyfile');
    fs.writeFileSync(renderedCaddyPath, renderedCaddy);
    const validation = spawnSync('caddy', ['validate', '--config', renderedCaddyPath], {
      encoding: 'utf8',
    });
    assert.equal(validation.status, 0, `${validation.stdout}\n${validation.stderr}`);
  }

  for (const fixture of negativeCases) {
    expectFailure(negativeArguments(fixture.id, common), new RegExp(fixture.expectedMessage));
  }

  const caddySource = fs.readFileSync(caddyTemplate, 'utf8');
  assert.match(caddySource, /@mutating method POST PUT PATCH DELETE/);
  assert.match(caddySource, /respond @mutating .* 403/);
  assert.match(caddySource, /reverse_proxy @v4_api 127\.0\.0\.1:8766/);
  assert.match(caddySource, /reverse_proxy 127\.0\.0\.1:8007/);

  const apiSource = fs.readFileSync(apiTemplate, 'utf8');
  const webSource = fs.readFileSync(webTemplate, 'utf8');
  for (const source of [apiSource, webSource]) {
    assert.match(source, /NoNewPrivileges=true/);
    assert.match(source, /ProtectSystem=full/);
    assert.match(source, /RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6/);
  }
  assert.match(apiSource, /EnvironmentFile=\/etc\/replay-lab\/replay-lab\.env/);
  assert.match(apiSource, /ReadOnlyPaths=@@DATABASE_PATH@@/);
  assert.match(apiSource, /v4\/v4_api\.py/);
  assert.match(webSource, /v7\/scripts\/serve\.mjs 8007/);

  console.log('V7 Linux deployment script harness: PASS');
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
