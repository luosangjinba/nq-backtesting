import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const script = path.join(repositoryRoot, 'v7/deploy/linux/install.sh');
const quickDeployScript = path.join(repositoryRoot, 'v7/deploy/linux/deploy-public-ip.sh');
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

function renderedCaddyFrom(output) {
  const previewStart = 'Rendered Caddy preview\n----------------------\n';
  const previewEnd = '\nPlanned host changes\n';
  const startIndex = output.indexOf(previewStart);
  const endIndex = output.indexOf(previewEnd, startIndex);
  assert.ok(startIndex >= 0 && endIndex > startIndex, 'Caddy preview must be extractable');
  return output.slice(startIndex + previewStart.length, endIndex);
}

function validateRenderedCaddy(output, fileName) {
  const renderedCaddyPath = path.join(temporaryDirectory, fileName);
  fs.writeFileSync(renderedCaddyPath, renderedCaddyFrom(output));
  const validation = spawnSync('caddy', ['validate', '--config', renderedCaddyPath], {
    encoding: 'utf8',
  });
  assert.equal(validation.status, 0, `${validation.stdout}\n${validation.stderr}`);
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
    case 'invalid-public-ip':
      return [...common, '--public-ip', '999.110.32.34', '--allow-public-without-auth'];
    case 'conflicting-public-host':
      return [
        ...common,
        '--domain', 'replay.example.com',
        '--public-ip', '43.110.32.34',
        '--allow-public-without-auth',
      ];
    case 'invalid-python-bin':
      return [...common, '--python-bin', '/missing/replay-python'];
    default:
      throw new Error(`Unknown Linux deployment negative fixture: ${id}`);
  }
}

try {
  const quickSyntax = spawnSync('bash', ['-n', quickDeployScript], { encoding: 'utf8' });
  assert.equal(quickSyntax.status, 0, quickSyntax.stderr);
  const quickHelp = spawnSync('bash', [quickDeployScript, '--help'], { encoding: 'utf8' });
  assert.equal(quickHelp.status, 0, quickHelp.stderr);
  assert.match(quickHelp.stdout, /--replace-legacy/);
  assert.match(quickHelp.stdout, /--preserve-caddy/);
  assert.match(quickHelp.stdout, /inbound TCP 80\/443/);
  const quickSource = fs.readFileSync(quickDeployScript, 'utf8');
  assert.match(quickSource, /refusing to stop unknown PID/);
  assert.match(quickSource, /Browser password for \$auth_user/);
  assert.match(quickSource, /previous_umask="\$\(umask\)"[\s\S]*umask 077[\s\S]*umask "\$previous_umask"/);
  assert.match(quickSource,
    /installer_arguments=\([\s\S]*--auth-password-file "\$password_file"[\s\S]*bash "\$installer" "\$\{installer_arguments\[@\]\}"/);
  const quickListenerStopSource = quickSource.match(
    /^stop_identified_listener\(\) \{[\s\S]*?^\}/m,
  )?.[0];
  assert.ok(quickListenerStopSource, 'quick-deploy listener stop must remain executable');
  const noLegacyListener = spawnSync('bash', ['-c', [
    'set -Eeuo pipefail',
    'systemctl() { return 3; }',
    'listener_pids() { return 0; }',
    quickListenerStopSource,
    'stop_identified_listener 8766 replay-lab-api.service',
    'printf "no-listener-continues\\n"',
  ].join('\n')], { encoding: 'utf8' });
  assert.equal(noLegacyListener.status, 0, noLegacyListener.stderr);
  assert.match(noLegacyListener.stdout, /no-listener-continues/);

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
  const packageRequest = privatePlan.stdout.match(/Runtime package request: (.+)/)?.[1] ?? '';
  assert.doesNotMatch(packageRequest, /\b(?:nodejs|npm)\b/,
    'an existing supported Node/npm pair must not request conflicting distribution packages');

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
    validateRenderedCaddy(publicPlan.stdout, 'Caddyfile-domain');
  }

  const publicIpPlan = execute([
    ...common,
    '--public-ip', '43.110.32.34',
    '--auth-user', 'reviewer',
    '--auth-hash', passwordHash,
  ]);
  assert.equal(publicIpPlan.status, 0, publicIpPlan.stderr);
  assert.match(publicIpPlan.stdout, /public URL: https:\/\/43\.110\.32\.34\/v7\/app\//);
  assert.match(publicIpPlan.stdout, /Let's Encrypt short-lived IPv4 certificate/);
  assert.match(publicIpPlan.stdout, /profile shortlived/);
  assert.match(publicIpPlan.stdout, /disable_tlsalpn_challenge/);
  const caddyVersionMatch = caddyVersion.stdout.match(/v?(\d+)\.(\d+)\.(\d+)/);
  const supportsIpCertificate = caddyVersionMatch
    && (Number(caddyVersionMatch[1]) > 2
      || (Number(caddyVersionMatch[1]) === 2 && Number(caddyVersionMatch[2]) > 10)
      || (Number(caddyVersionMatch[1]) === 2
        && Number(caddyVersionMatch[2]) === 10
        && Number(caddyVersionMatch[3]) >= 2));
  if (supportsIpCertificate) {
    validateRenderedCaddy(publicIpPlan.stdout, 'Caddyfile-public-ip');
    const existingCaddyPath = path.join(temporaryDirectory, 'Caddyfile-existing');
    const replayFragmentPath = path.join(temporaryDirectory, 'replay-lab.Caddyfile');
    fs.writeFileSync(replayFragmentPath, renderedCaddyFrom(publicIpPlan.stdout));
    fs.writeFileSync(existingCaddyPath, [
      'recap.example.com {',
      '  respond "existing site"',
      '}',
      '',
      `import ${replayFragmentPath}`,
      '',
    ].join('\n'));
    const coexistenceValidation = spawnSync(
      'caddy', ['validate', '--config', existingCaddyPath], { encoding: 'utf8' },
    );
    assert.equal(
      coexistenceValidation.status,
      0,
      `${coexistenceValidation.stdout}\n${coexistenceValidation.stderr}`,
    );
  }

  const preservedPublicIpPlan = execute([
    ...common,
    '--public-ip', '43.110.32.34',
    '--auth-user', 'reviewer',
    '--auth-hash', passwordHash,
    '--preserve-caddy',
  ]);
  assert.equal(preservedPublicIpPlan.status, 0, preservedPublicIpPlan.stderr);
  assert.match(preservedPublicIpPlan.stdout, /Back up and preserve: \/etc\/caddy\/Caddyfile/);
  assert.match(preservedPublicIpPlan.stdout, /Write managed fragment: \/etc\/caddy\/replay-lab\.Caddyfile/);
  expectFailure([...common, '--preserve-caddy'], /--preserve-caddy requires --domain or --public-ip/);
  expectFailure([
    ...common,
    '--domain', 'replay.example.com',
    '--email', 'reviewer@example.com',
    '--auth-user', 'reviewer',
    '--auth-hash', passwordHash,
    '--preserve-caddy',
  ], /--preserve-caddy cannot be combined with --email/);

  for (const fixture of negativeCases) {
    expectFailure(negativeArguments(fixture.id, common), new RegExp(fixture.expectedMessage));
  }

  const caddySource = fs.readFileSync(caddyTemplate, 'utf8');
  assert.match(caddySource, /@mutating method POST PUT PATCH DELETE/);
  assert.match(caddySource, /respond @mutating .* 403/);
  assert.match(caddySource, /reverse_proxy @v4_api 127\.0\.0\.1:8766/);
  assert.match(caddySource, /reverse_proxy 127\.0\.0\.1:8007/);
  assert.match(caddySource, /@@TLS_BLOCK@@/);

  const installerSource = fs.readFileSync(script, 'utf8');
  assert.match(installerSource, /if ! node_runtime_ready; then\s+base_packages\+=\(nodejs npm\)/);
  assert.match(installerSource, /already used outside \$unit; stop the legacy listener before apply/);
  assert.match(installerSource, /caddy_version_at_least 2 10 2/);
  assert.match(installerSource, /import \/etc\/caddy\/replay-lab\.Caddyfile/);
  assert.match(installerSource, /combined Caddy configuration is invalid; restoring/);
  assert.match(installerSource, /chown -R root:"\$service_group" "\$venv_dir"/);
  assert.match(installerSource, /chmod -R u=rwX,g=rX,o= "\$venv_dir"/);
  assert.match(installerSource, /chown -R root:"\$service_group" "\$release_dir"/);
  assert.match(installerSource, /chmod -R u=rwX,g=rX,o= "\$release_dir"/);
  const listenerGuardSource = installerSource.match(
    /^require_managed_or_free_port\(\) \{[\s\S]*?^\}/m,
  )?.[0];
  assert.ok(listenerGuardSource, 'listener guard must remain independently executable');
  const listenerGuard = spawnSync('bash', ['-c', [
    'die() { printf "ERROR: %s\\n" "$*" >&2; exit 1; }',
    'port_is_listening() { return 0; }',
    'systemctl() { return 3; }',
    listenerGuardSource,
    'require_managed_or_free_port 8766 replay-lab-api.service',
  ].join('\n')], { encoding: 'utf8' });
  assert.notEqual(listenerGuard.status, 0);
  assert.match(listenerGuard.stderr, /127\.0\.0\.1:8766 is already used outside replay-lab-api\.service/);

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
