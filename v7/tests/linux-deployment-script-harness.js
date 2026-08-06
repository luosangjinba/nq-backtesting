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
const readApiEntry = path.join(repositoryRoot, 'v4/read_api.py');
const readApiHandler = path.join(repositoryRoot, 'v4/server/market_data_read_handler.py');
const webTemplate = path.join(
  repositoryRoot,
  'v7/deploy/linux/systemd/replay-lab-web.service.template',
);
const stateTemplate = path.join(
  repositoryRoot,
  'v7/deploy/linux/systemd/replay-lab-state.service.template',
);
const databaseImportTemplate = path.join(
  repositoryRoot,
  'v7/deploy/linux/systemd/replay-lab-database-import.service.template',
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
  assert.match(quickHelp.stdout, /--bootstrap/);
  assert.match(quickHelp.stdout, /inbound TCP 80\/443/);
  assert.match(quickHelp.stdout, /8768/);
  const quickSource = fs.readFileSync(quickDeployScript, 'utf8');
  assert.match(quickSource, /refusing to stop unknown PID/);
  assert.match(quickSource, /"read_api\.py"/,
    'quick deploy may replace the managed read-only V4 listener');
  assert.match(quickSource, /Browser password for \$auth_user/);
  assert.match(quickSource, /previous_umask="\$\(umask\)"[\s\S]*umask 077[\s\S]*umask "\$previous_umask"/);
  assert.match(quickSource, /trap 'quick_deploy_exit "\$\?"' EXIT/,
    'database metadata rollback must also run for explicit die/exit failures');
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
  assert.match(privatePlan.stdout, /Market database copy\/write by V4 API: never/);
  assert.match(privatePlan.stdout, /Market database bootstrap: disabled/);
  assert.match(privatePlan.stdout, /Market database service mount: read-only/);
  assert.match(privatePlan.stdout, /User state SQLite: \/var\/lib\/replay-lab\/state\/replay-lab-state\.sqlite3/);
  assert.match(privatePlan.stdout, /replay-lab-state\.service/);
  assert.match(privatePlan.stdout, /replay-lab-database-import\.service/);
  assert.match(privatePlan.stdout, /ReadWritePaths=\/var\/lib\/replay-lab\/state/);
  assert.match(privatePlan.stdout, new RegExp(`ReadOnlyPaths=${path.dirname(database).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
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
  assert.match(publicPlan.stdout,
    /user-state=enabled, database-import=disabled, other-market-mutations=blocked/);
  assert.match(publicPlan.stdout, /@state_api path \/v7\/state\/\*/);
  assert.match(publicPlan.stdout, /reverse_proxy @state_api 127\.0\.0\.1:8767/);
  assert.match(publicPlan.stdout, /header_up X-Replay-Lab-User \{http\.auth\.user\.id\}/);
  assert.match(publicPlan.stdout, /not path \/v7\/state\/\*/);
  assert.doesNotMatch(publicPlan.stdout, /@database_import/);
  assert.match(publicPlan.stdout, /reverse_proxy @v4_api 127\.0\.0\.1:8766/);
  assert.match(publicPlan.stdout, /reverse_proxy 127\.0\.0\.1:8007/);
  assert.match(publicPlan.stdout, /(basic_auth|basicauth) \{/);
  if (caddyAvailable) {
    validateRenderedCaddy(publicPlan.stdout, 'Caddyfile-domain');
  }
  const bootstrapDatabase = path.join(temporaryDirectory, 'bootstrap', 'trading_data.duckdb');
  const bootstrapPlan = execute([
    '--dry-run', '--bootstrap', '--db', bootstrapDatabase,
    '--service-user', os.userInfo().username,
    '--domain', 'bootstrap.example.com',
    '--auth-user', 'reviewer',
    '--auth-hash', passwordHash,
  ]);
  assert.equal(bootstrapPlan.status, 0, bootstrapPlan.stderr);
  assert.match(bootstrapPlan.stdout, /missing first-run target; strict importer enabled/);
  assert.match(bootstrapPlan.stdout, /database-import=first-run/);
  assert.match(bootstrapPlan.stdout, /@database_import path \/v7\/database\/\*/);
  assert.match(bootstrapPlan.stdout, /reverse_proxy @database_import 127\.0\.0\.1:8768/);
  assert.match(bootstrapPlan.stdout, /header_up X-Replay-Lab-User \{http\.auth\.user\.id\}/);
  assert.match(bootstrapPlan.stdout, /not path \/v7\/state\/\* \/v7\/database\/\*/);
  assert.match(bootstrapPlan.stdout, /Market database bootstrap: strict first-run import/);
  assert.match(bootstrapPlan.stdout, new RegExp(
    `ReadWritePaths=/var/lib/replay-lab/database-import ${path.dirname(bootstrapDatabase)}`,
  ));
  if (caddyAvailable) validateRenderedCaddy(bootstrapPlan.stdout, 'Caddyfile-bootstrap');
  expectFailure([
    '--dry-run', '--bootstrap', '--db', bootstrapDatabase,
    '--service-user', os.userInfo().username,
    '--domain', 'bootstrap.example.com', '--allow-public-without-auth',
  ], /public --bootstrap requires authenticated HTTPS/);
  const unauthenticatedPublicPlan = execute([
    ...common,
    '--domain', 'public.example.com',
    '--allow-public-without-auth',
  ]);
  assert.equal(unauthenticatedPublicPlan.status, 0, unauthenticatedPublicPlan.stderr);
  assert.match(unauthenticatedPublicPlan.stdout,
    /user-state=local-only, database-import=disabled, other-market-mutations=blocked/);
  assert.doesNotMatch(unauthenticatedPublicPlan.stdout, /@state_api/,
    'unauthenticated public deployment must expose no user-state route');
  assert.match(unauthenticatedPublicPlan.stdout, /@mutating method POST PUT PATCH DELETE/);
  if (caddyAvailable) {
    validateRenderedCaddy(unauthenticatedPublicPlan.stdout, 'Caddyfile-unauthenticated');
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
  assert.match(publicIpPlan.stdout, /default_sni 43\.110\.32\.34/);
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
  assert.doesNotMatch(renderedCaddyFrom(preservedPublicIpPlan.stdout), /default_sni/);
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
    fs.writeFileSync(replayFragmentPath, renderedCaddyFrom(preservedPublicIpPlan.stdout));
    fs.writeFileSync(existingCaddyPath, [
      '{',
      '  default_sni 43.110.32.34',
      '}',
      '',
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
  assert.match(caddySource, /@@STATE_PROXY_BLOCK@@/);
  assert.match(caddySource, /@@DATABASE_PROXY_BLOCK@@/);
  assert.match(caddySource, /@@MUTATION_BLOCK@@/);
  assert.match(caddySource, /reverse_proxy @v4_api 127\.0\.0\.1:8766/);
  assert.match(caddySource, /reverse_proxy 127\.0\.0\.1:8007/);
  assert.match(caddySource, /@@TLS_BLOCK@@/);

  const installerSource = fs.readFileSync(script, 'utf8');
  assert.match(installerSource, /if ! node_runtime_ready; then\s+base_packages\+=\(nodejs npm\)/);
  assert.match(installerSource, /-c 'import ensurepip'/,
    'Python discovery must reject interpreters whose Debian venv package is absent');
  assert.match(installerSource, /venv_runtime_ready\(\)/);
  assert.match(installerSource, /venv_dir="\$release_dir\/\.venv"/,
    'each immutable release must own its Python runtime');
  assert.match(installerSource, /-m venv --clear "\$venv_dir"/,
    'a failed partial virtualenv must be repaired on rerun');
  assert.match(installerSource, /already used outside \$unit; stop the legacy listener before apply/);
  assert.match(installerSource, /caddy_version_at_least 2 10 2/);
  assert.match(installerSource, /import \/etc\/caddy\/replay-lab\.Caddyfile/);
  assert.match(installerSource, /combined Caddy configuration is invalid; restoring/);
  assert.match(installerSource, /write_caddy_default_sni/);
  assert.match(installerSource, /chown -R root:"\$service_group" "\$release_dir"/);
  assert.match(installerSource, /chmod -R u=rwX,g=rX,o= "\$release_dir"/);
  assert.match(installerSource, /replay_lab_host_transaction_begin/);
  assert.match(installerSource, /replay_lab_host_transaction_commit/);
  assert.match(installerSource, /trap 'handle_apply_error/,
    'unexpected host mutation failures must enter the rollback boundary');
  assert.match(installerSource, /replay_lab_quarantine_failed_release/,
    'failed deployment must isolate a newly-created release before removing its partial runtime');
  assert.match(installerSource, /verify_restored_service_health \|\| failed=1/,
    'rollback must prove the local health contracts of previously active application services');
  assert.match(installerSource, /preserve_incomplete_rollback_snapshot \|\| true/,
    'an incomplete rollback must retain root-only transaction recovery evidence');
  assert.match(installerSource, /cleanup_tmp_dir=0/,
    'recovery snapshot failure must suppress unconditional temporary-evidence deletion');
  assert.match(installerSource, /V7_STATE_DB=%s\/state\/replay-lab-state\.sqlite3/);
  assert.match(installerSource, /require_managed_or_free_port 8767 replay-lab-state\.service/);
  assert.match(installerSource, /require_managed_or_free_port 8768 replay-lab-database-import\.service/);
  assert.match(installerSource, /V7_DATABASE_IMPORT_PORT=8768/);
  assert.match(installerSource, /V7_DATABASE_IMPORT_ENABLED=%s/);
  const rollbackSource = installerSource.match(/^rollback_release\(\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(rollbackSource, 'release rollback must remain independently inspectable');
  assert.match(rollbackSource, /restore_active_unit_states \|\| failed=1/,
    'rollback must restore the exact pre-deploy active service set');
  assert.match(rollbackSource, /quarantine_failed_release \|\| failed=1/,
    'rollback must not leave a failed release in the immutable release namespace');
  assert.match(installerSource, /capture_active_unit_states/);
  assert.match(installerSource, /multi-user\.target\.wants\/\$unit/,
    'systemd enablement links must belong to the host transaction');
  const defaultSniSource = installerSource.match(
    /^write_caddy_default_sni\(\) \{[\s\S]*?^\}/m,
  )?.[0];
  assert.ok(defaultSniSource, 'default SNI merger must remain independently executable');
  const existingGlobalOptions = path.join(temporaryDirectory, 'existing-global.Caddyfile');
  const mergedGlobalOptions = path.join(temporaryDirectory, 'merged-global.Caddyfile');
  fs.writeFileSync(existingGlobalOptions, [
    '{',
    '  email reviewer@example.com',
    '}',
    '',
    'recap.example.com {',
    '  respond "existing"',
    '}',
    '',
  ].join('\n'));
  const defaultSniMerge = spawnSync('bash', ['-c', [
    defaultSniSource,
    'write_caddy_default_sni "$1" "$2" 43.110.32.34',
  ].join('\n'), 'bash', existingGlobalOptions, mergedGlobalOptions], { encoding: 'utf8' });
  assert.equal(defaultSniMerge.status, 0, defaultSniMerge.stderr);
  const mergedGlobalSource = fs.readFileSync(mergedGlobalOptions, 'utf8');
  assert.match(mergedGlobalSource, /email reviewer@example\.com/);
  assert.match(mergedGlobalSource, /default_sni 43\.110\.32\.34/);
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
  const stateSource = fs.readFileSync(stateTemplate, 'utf8');
  const databaseImportSource = fs.readFileSync(databaseImportTemplate, 'utf8');
  for (const source of [apiSource, webSource, stateSource, databaseImportSource]) {
    assert.match(source, /NoNewPrivileges=true/);
    assert.match(source, /ProtectSystem=full/);
    assert.match(source, /RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6/);
  }
  assert.match(apiSource, /EnvironmentFile=\/etc\/replay-lab\/replay-lab\.env/);
  assert.match(apiSource, /ReadOnlyPaths=@@DATABASE_PARENT@@/);
  assert.match(apiSource, /@@STATE_ROOT@@\/state @@STATE_ROOT@@\/database-import/);
  assert.match(apiSource, /v4\/read_api\.py/);
  assert.doesNotMatch(apiSource, /v4\/v4_api\.py/,
    'deployed market-data service must not start the mutable local V4 entry');
  const readApiEntrySource = fs.readFileSync(readApiEntry, 'utf8');
  const readApiHandlerSource = fs.readFileSync(readApiHandler, 'utf8');
  assert.doesNotMatch(readApiEntrySource, /(?:from|import)\s+v4_api/,
    'deployed read-only entry must not import the mutable local V4 entry');
  assert.doesNotMatch(readApiHandlerSource, /maintenance|workspace/i,
    'deployed read-only handler must not depend on maintenance or workspace routes');
  assert.match(readApiHandlerSource, /def do_POST\(self\):\s+self\._reject_mutation\(\)/);
  assert.match(readApiHandlerSource, /def do_PUT\(self\):\s+self\._reject_mutation\(\)/);
  assert.match(webSource, /v7\/scripts\/serve\.mjs 8007/);
  assert.match(webSource, /EnvironmentFile=\/etc\/replay-lab\/replay-lab\.env/);
  assert.match(webSource, /ReadOnlyPaths=@@DATABASE_PARENT@@/);
  assert.match(webSource, /@@STATE_ROOT@@\/state @@STATE_ROOT@@\/database-import/);
  assert.match(stateSource, /v7\/server\/state_api\.py/);
  assert.match(stateSource, /ReadWritePaths=@@STATE_ROOT@@\/state/);
  assert.match(stateSource, /ReadOnlyPaths=@@DATABASE_PARENT@@/);
  assert.match(databaseImportSource, /v7\/server\/database_import_api\.py/);
  assert.match(databaseImportSource,
    /ReadWritePaths=@@STATE_ROOT@@\/database-import @@DATABASE_PARENT@@/);
  assert.match(databaseImportSource, /ReadOnlyPaths=@@STATE_ROOT@@\/state/);

  console.log('V7 Linux deployment script harness: PASS');
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
