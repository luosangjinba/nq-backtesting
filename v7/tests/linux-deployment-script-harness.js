import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const script = path.join(repositoryRoot, 'v7/deploy/linux/install.sh');
const deployScript = path.join(repositoryRoot, 'v7/deploy/linux/deploy.sh');
const legacyDeployScript = path.join(repositoryRoot, 'v7/deploy/linux/deploy-public-ip.sh');
const resourceProfilePolicy = path.join(
  repositoryRoot,
  'v7/deploy/linux/lib/resource-profile.sh',
);
const caddyReconciler = path.join(
  repositoryRoot,
  'v7/deploy/linux/lib/caddy-site-reconciler.py',
);
const deploymentState = path.join(
  repositoryRoot,
  'v7/deploy/linux/lib/deployment-state.sh',
);
const caddyTemplate = path.join(repositoryRoot, 'v7/deploy/linux/caddy/Caddyfile.template');
const marketDataTemplate = path.join(
  repositoryRoot,
  'v7/deploy/linux/systemd/replay-lab-market-data.service.template',
);
const marketDataEntry = path.join(repositoryRoot, 'v7/server/market_data_api.py');
const marketDataHandler = path.join(repositoryRoot, 'v7/server/market_data_read_handler.py');
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
const runtimeRequirements = path.join(
  repositoryRoot,
  'v7/deploy/linux/requirements-runtime.txt',
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
  const quickSyntax = spawnSync('bash', ['-n', deployScript], { encoding: 'utf8' });
  assert.equal(quickSyntax.status, 0, quickSyntax.stderr);
  const legacySyntax = spawnSync('bash', ['-n', legacyDeployScript], { encoding: 'utf8' });
  assert.equal(legacySyntax.status, 0, legacySyntax.stderr);
  const quickHelp = spawnSync('bash', [legacyDeployScript, '--help'], { encoding: 'utf8' });
  assert.equal(quickHelp.status, 0, quickHelp.stderr);
  assert.match(quickHelp.stdout, /--replace-legacy/);
  assert.match(quickHelp.stdout, /--preserve-caddy/);
  assert.match(quickHelp.stdout, /--bootstrap/);
  assert.match(quickHelp.stdout, /--require-existing-db/);
  assert.match(quickHelp.stdout, /--replace-caddy/);
  assert.match(quickHelp.stdout, /On a repeat deployment/);
  assert.match(quickHelp.stdout, /--public-domain HOST/);
  assert.match(quickHelp.stdout, /--private-domain HOST/);
  assert.match(quickHelp.stdout, /--public\s+Auto-detect/);
  assert.match(quickHelp.stdout, /defaults to --local/);
  assert.match(quickHelp.stdout, /512 MB class/);
  assert.match(quickHelp.stdout, /inbound TCP 80\/443/);
  assert.match(quickHelp.stdout, /8768/);
  const legacySource = fs.readFileSync(legacyDeployScript, 'utf8');
  assert.match(legacySource, /exec bash "\$script_dir\/deploy\.sh" "\$@"/,
    'the historical public-IP entry must forward without rewriting arguments');
  const quickSource = fs.readFileSync(deployScript, 'utf8');
  assert.match(quickSource, /refusing to stop unknown PID/);
  assert.match(quickSource, /"market_data_api\.py"/,
    'quick deploy may replace an identified manual V7 market-data listener');
  assert.match(quickSource, /"read_api\.py"/,
    'quick deploy recognizes a manual legacy V4 listener during migration');
  assert.match(quickSource, /Browser password for \$auth_user/);
  assert.match(quickSource, /replay_lab_require_minimum_memory/,
    'quick deploy must reject undersized hosts before identity or database metadata changes');
  assert.match(quickSource, /previous_umask="\$\(umask\)"[\s\S]*umask 077[\s\S]*umask "\$previous_umask"/);
  assert.match(quickSource, /trap 'quick_deploy_exit "\$\?"' EXIT/,
    'database metadata rollback must also run for explicit die/exit failures');
  assert.match(quickSource,
    /installer_arguments=\([\s\S]*--auth-password-file "\$password_file"[\s\S]*bash "\$installer" "\$\{installer_arguments\[@\]\}"/);
  assert.match(quickSource, /preserve_caddy=1/,
    'the universal public-IP entry must preserve unrelated sites by default');
  assert.match(quickSource, /replace_legacy=1/,
    'identified Replay Lab listeners migrate without another host-specific flag');
  assert.match(quickSource, /bootstrap_mode="auto"/);
  assert.match(quickSource, /database state: target absent; selecting first-run browser upload/);
  assert.match(quickSource, /legacy_password_file="\/root\/replay-lab-secrets\/web-password"/);
  assert.match(quickSource, /credential state: reusing the existing legacy root-only password file/);
  const existingState = spawnSync('bash', ['-c', [
    'source "$1"',
    'replay_lab_select_database_mode "$2" auto',
  ].join('\n'), 'bash', deploymentState, database], { encoding: 'utf8' });
  assert.equal(existingState.status, 0, existingState.stderr);
  assert.equal(existingState.stdout, 'existing');
  const missingState = spawnSync('bash', ['-c', [
    'source "$1"',
    'replay_lab_select_database_mode "$2" auto',
  ].join('\n'), 'bash', deploymentState, path.join(temporaryDirectory, 'absent.duckdb')], {
    encoding: 'utf8',
  });
  assert.equal(missingState.status, 0, missingState.stderr);
  assert.equal(missingState.stdout, 'bootstrap');
  const invalidDatabaseState = spawnSync('bash', ['-c', [
    'source "$1"',
    'replay_lab_select_database_mode "$2" auto',
  ].join('\n'), 'bash', deploymentState, temporaryDirectory], { encoding: 'utf8' });
  assert.notEqual(invalidDatabaseState.status, 0);
  assert.match(invalidDatabaseState.stdout, /not a regular file/);
  const explicitDatabaseState = spawnSync('bash', ['-c', [
    'source "$1"',
    'replay_lab_select_database_mode "$2" required',
  ].join('\n'), 'bash', deploymentState, database], { encoding: 'utf8' });
  assert.notEqual(explicitDatabaseState.status, 0);
  assert.match(explicitDatabaseState.stdout, /--bootstrap requires a missing database target/);
  const legacyPassword = path.join(temporaryDirectory, 'legacy-password');
  fs.writeFileSync(legacyPassword, 'secret');
  const selectedPassword = spawnSync('bash', ['-c', [
    'source "$1"',
    'replay_lab_select_password_file "$2" 0 "$3"',
  ].join('\n'), 'bash', deploymentState,
  path.join(temporaryDirectory, 'new-password'), legacyPassword], { encoding: 'utf8' });
  assert.equal(selectedPassword.status, 0, selectedPassword.stderr);
  assert.equal(selectedPassword.stdout, legacyPassword);
  const quickListenerStopSource = quickSource.match(
    /^stop_identified_listener\(\) \{[\s\S]*?^\}/m,
  )?.[0];
  assert.ok(quickListenerStopSource, 'quick-deploy listener stop must remain executable');
  const noLegacyListener = spawnSync('bash', ['-c', [
    'set -Eeuo pipefail',
    'systemctl() { return 3; }',
    'listener_pids() { return 0; }',
    quickListenerStopSource,
    'stop_identified_listener 8766 replay-lab-market-data.service replay-lab-api.service',
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
  assert.match(privatePlan.stdout, /Market database copy\/write by V7 market-data service: never/);
  assert.match(privatePlan.stdout, /Market database bootstrap: disabled/);
  assert.match(privatePlan.stdout, /Market database service mount: read-only/);
  assert.match(privatePlan.stdout, /host capacity: \d+ MiB RAM, \d+ CPU, profile/);
  assert.match(privatePlan.stdout, /DuckDB budget: \d+MB, \d+ thread\(s\), disk spill enabled/);
  assert.match(privatePlan.stdout, /Enforce 512 MB-class minimum and memory profile:/);
  assert.match(privatePlan.stdout, /Ensure persistent swap floor: \d+ MiB/);
  assert.match(privatePlan.stdout, /User state SQLite: \/var\/lib\/replay-lab\/state\/replay-lab-state\.sqlite3/);
  assert.match(privatePlan.stdout, /replay-lab-state\.service/);
  assert.match(privatePlan.stdout, /replay-lab-database-import\.service/);
  assert.match(privatePlan.stdout, /ReadWritePaths=\/var\/lib\/replay-lab\/state/);
  assert.match(privatePlan.stdout, new RegExp(`ReadOnlyPaths=${path.dirname(database).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(privatePlan.stdout, /dry-run complete; no host files were changed/);
  const deploymentProfile = path.join(temporaryDirectory, 'deployment.conf');
  fs.writeFileSync(deploymentProfile, [
    'schemaVersion=1',
    'mode=local',
    'endpoint=',
    `databasePath=${database}`,
    `serviceUser=${os.userInfo().username}`,
    'authUser=',
    'passwordFile=',
    'preserveCaddy=0',
    '',
  ].join('\n'));
  const profiledPlan = execute([...common, '--deployment-profile-file', deploymentProfile]);
  assert.equal(profiledPlan.status, 0, profiledPlan.stderr);
  assert.match(profiledPlan.stdout,
    /Write: \/etc\/replay-lab\/deployment\.conf \(non-secret deployment profile\)/);
  fs.writeFileSync(deploymentProfile, fs.readFileSync(deploymentProfile, 'utf8')
    .replace('mode=local', 'mode=public-domain'));
  expectFailure([...common, '--deployment-profile-file', deploymentProfile],
    /deployment profile mode does not match installer exposure/);
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
  assert.match(publicPlan.stdout, /browser URL: https:\/\/replay\.example\.com\/v7\/app\//);
  assert.match(publicPlan.stdout,
    /user-state=enabled, database-import=disabled, other-market-mutations=blocked/);
  assert.match(publicPlan.stdout, /@state_api path \/v7\/state\/\*/);
  assert.match(publicPlan.stdout, /reverse_proxy @state_api 127\.0\.0\.1:8767/);
  assert.match(publicPlan.stdout, /header_up X-Replay-Lab-User \{http\.auth\.user\.id\}/);
  assert.match(publicPlan.stdout, /not path \/v7\/state\/\*/);
  assert.doesNotMatch(publicPlan.stdout, /@database_import/);
  assert.match(publicPlan.stdout, /reverse_proxy @market_data 127\.0\.0\.1:8766/);
  assert.match(publicPlan.stdout, /reverse_proxy 127\.0\.0\.1:8007/);
  assert.match(publicPlan.stdout, /(basic_auth|basicauth) \{/);
  if (caddyAvailable) {
    validateRenderedCaddy(publicPlan.stdout, 'Caddyfile-domain');
  }
  const privateDomainPlan = execute([
    ...common,
    '--private-domain', 'replay.lab.example',
    '--auth-user', 'reviewer',
    '--auth-hash', passwordHash,
  ]);
  assert.equal(privateDomainPlan.status, 0, privateDomainPlan.stderr);
  assert.match(privateDomainPlan.stdout,
    /browser URL: https:\/\/replay\.lab\.example\/v7\/app\//);
  assert.match(privateDomainPlan.stdout, /certificate: Caddy internal CA/);
  assert.match(privateDomainPlan.stdout, /network policy: private DNS\/LAN\/VPN only/);
  assert.match(renderedCaddyFrom(privateDomainPlan.stdout), /tls internal/);
  if (caddyAvailable) {
    validateRenderedCaddy(privateDomainPlan.stdout, 'Caddyfile-private-domain');
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
    `ReadWritePaths=/var/lib/replay-lab/database-import /var/lib/replay-lab/duckdb-tmp/database-import ${path.dirname(bootstrapDatabase)}`,
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
  assert.match(publicIpPlan.stdout, /browser URL: https:\/\/43\.110\.32\.34\/v7\/app\//);
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

  expectFailure([...common, '--preserve-caddy'],
    /--preserve-caddy requires --domain, --private-domain, or --public-ip/);
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
  assert.match(caddySource, /@market_data path \/v7\/market-data\/\*/);
  assert.match(caddySource, /reverse_proxy @market_data 127\.0\.0\.1:8766/);
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
  assert.match(installerSource, /already used outside managed units/);
  assert.match(installerSource, /caddy_version_at_least 2 10 2/);
  assert.match(installerSource,
    /caddy_fragment_path="\/etc\/caddy\/replay-lab\.Caddyfile"/);
  assert.match(installerSource, /combined Caddy configuration is invalid; restoring/);
  assert.match(installerSource, /caddy-site-reconciler\.py/);
  assert.match(installerSource,
    /reconciler_arguments\+=\(--manage-default-sni\)/,
    'direct IPv4 preserve mode must reconcile the global default SNI');
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
  assert.match(installerSource, /V7_MARKET_DATA_HOST=127\.0\.0\.1/);
  assert.match(installerSource, /V7_MARKET_DATA_PORT=8766/);
  assert.match(installerSource, /V7_MARKET_DATA_DB=%s/);
  assert.match(installerSource, /V7_MARKET_DATA_TABLE=futures_1m/);
  assert.match(installerSource, /V7_DUCKDB_MEMORY_LIMIT=%s/);
  assert.match(installerSource, /V7_DUCKDB_THREADS=%s/);
  assert.match(installerSource, /V7_RESOURCE_PROFILE=%s/);
  assert.match(installerSource, /replay_lab_ensure_swap_floor "\$swap_floor_mib" "\$managed_swap_path"/);
  assert.match(installerSource, /duckdb-tmp\/market-data/);
  assert.match(installerSource, /duckdb-tmp\/database-import/);
  assert.doesNotMatch(installerSource, /printf 'V4_(?:API|TRADING_DB|MARKET_DATA)/);
  assert.match(installerSource,
    /repo_git archive --format=tar --output="\$archive_path" "\$repository_commit" v7/,
    'immutable host releases must contain only the committed V7 tree');
  assert.match(installerSource, /retire_legacy_market_data_unit/,
    'the old systemd unit must be retired inside the host transaction');
  assert.match(installerSource,
    /deployment_units=\([\s\S]*replay-lab-market-data\.service[\s\S]*replay-lab-api\.service/,
    'rollback must capture both the current and legacy market-data unit states');
  const rollbackSource = installerSource.match(/^rollback_release\(\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(rollbackSource, 'release rollback must remain independently inspectable');
  assert.match(rollbackSource, /restore_active_unit_states \|\| failed=1/,
    'rollback must restore the exact pre-deploy active service set');
  assert.match(rollbackSource, /quarantine_failed_release \|\| failed=1/,
    'rollback must not leave a failed release in the immutable release namespace');
  assert.match(installerSource, /capture_active_unit_states/);
  assert.match(installerSource, /multi-user\.target\.wants\/\$unit/,
    'systemd enablement links must belong to the host transaction');
  const caddyReconcilerSource = fs.readFileSync(caddyReconciler, 'utf8');
  assert.match(caddyReconcilerSource, /legacy-managed-site-migrated/);
  assert.match(caddyReconcilerSource, /owned by an unmanaged Caddy site/);
  assert.match(caddyReconcilerSource, /multiple Caddy import globs/);
  const listenerGuardSource = installerSource.match(
    /^require_managed_or_free_port\(\) \{[\s\S]*?^\}/m,
  )?.[0];
  assert.ok(listenerGuardSource, 'listener guard must remain independently executable');
  const listenerGuard = spawnSync('bash', ['-c', [
    'die() { printf "ERROR: %s\\n" "$*" >&2; exit 1; }',
    'port_is_listening() { return 0; }',
    'systemctl() { return 3; }',
    listenerGuardSource,
    'require_managed_or_free_port 8766 replay-lab-market-data.service replay-lab-api.service',
  ].join('\n')], { encoding: 'utf8' });
  assert.notEqual(listenerGuard.status, 0);
  assert.match(listenerGuard.stderr, /127\.0\.0\.1:8766 is already used outside managed units/);
  const managedLegacyListener = spawnSync('bash', ['-c', [
    'die() { printf "ERROR: %s\\n" "$*" >&2; exit 1; }',
    'port_is_listening() { return 0; }',
    'systemctl() { [[ "$3" == "replay-lab-api.service" ]]; }',
    listenerGuardSource,
    'require_managed_or_free_port 8766 replay-lab-market-data.service replay-lab-api.service',
    'printf "managed-legacy-accepted\\n"',
  ].join('\n')], { encoding: 'utf8' });
  assert.equal(managedLegacyListener.status, 0, managedLegacyListener.stderr);
  assert.match(managedLegacyListener.stdout, /managed-legacy-accepted/,
    'an active legacy systemd unit must reach transactional migration instead of failing preflight');

  const marketDataSource = fs.readFileSync(marketDataTemplate, 'utf8');
  const webSource = fs.readFileSync(webTemplate, 'utf8');
  const stateSource = fs.readFileSync(stateTemplate, 'utf8');
  const databaseImportSource = fs.readFileSync(databaseImportTemplate, 'utf8');
  for (const source of [marketDataSource, webSource, stateSource, databaseImportSource]) {
    assert.match(source, /NoNewPrivileges=true/);
    assert.match(source, /ProtectSystem=full/);
    assert.match(source, /RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6/);
  }
  assert.match(marketDataSource,
    /Environment=V7_DUCKDB_TEMP_DIRECTORY=@@STATE_ROOT@@\/duckdb-tmp\/market-data/);
  assert.match(marketDataSource, /ReadWritePaths=@@STATE_ROOT@@\/duckdb-tmp\/market-data/);
  assert.match(databaseImportSource,
    /Environment=V7_DUCKDB_TEMP_DIRECTORY=@@STATE_ROOT@@\/duckdb-tmp\/database-import/);
  assert.match(databaseImportSource,
    /ReadWritePaths=.*@@STATE_ROOT@@\/duckdb-tmp\/database-import/);
  const resourceProfileSource = fs.readFileSync(resourceProfilePolicy, 'utf8');
  assert.match(resourceProfileSource, /REPLAY_LAB_MIN_MEMORY_CLASS_MIB=450/);
  assert.match(resourceProfileSource, /REPLAY_LAB_SWAP_ACCOUNTING_TOLERANCE_MIB=8/);
  assert.match(resourceProfileSource, /replay_lab_swap_floor_satisfied/,
    'nominal swap floors must tolerate mkswap header accounting');
  assert.match(resourceProfileSource, /compact-512m/);
  assert.match(resourceProfileSource, /swap_floor_mib=2048/);
  assert.match(resourceProfileSource, /\/etc\/fstab/,
    'managed low-memory swap must survive reboot');
  assert.match(marketDataSource, /EnvironmentFile=\/etc\/replay-lab\/replay-lab\.env/);
  assert.match(marketDataSource, /ReadOnlyPaths=@@DATABASE_PARENT@@/);
  assert.match(marketDataSource, /@@STATE_ROOT@@\/state @@STATE_ROOT@@\/database-import/);
  assert.match(marketDataSource, /v7\/server\/market_data_api\.py/);
  assert.doesNotMatch(marketDataSource, /\/v4\//,
    'deployed market-data unit must have no V4 runtime path');
  const marketDataEntrySource = fs.readFileSync(marketDataEntry, 'utf8');
  const marketDataHandlerSource = fs.readFileSync(marketDataHandler, 'utf8');
  const runtimeRequirementsSource = fs.readFileSync(runtimeRequirements, 'utf8');
  assert.doesNotMatch(marketDataEntrySource, /(?:from|import)\s+v4/,
    'deployed read-only entry must not import a V4 module');
  assert.doesNotMatch(marketDataHandlerSource, /maintenance|workspace/i,
    'deployed read-only handler must not depend on maintenance or workspace routes');
  assert.match(marketDataHandlerSource, /def do_POST\(self\):[\s\S]*self\._reject_mutation\(\)/);
  assert.match(marketDataHandlerSource, /do_PUT = do_POST/);
  assert.doesNotMatch(runtimeRequirementsSource, /PyYAML/i,
    'the V7-owned market-data entry must not retain the V4 YAML runtime dependency');
  assert.match(webSource, /v7\/scripts\/serve\.mjs 8007/);
  assert.match(webSource, /EnvironmentFile=\/etc\/replay-lab\/replay-lab\.env/);
  assert.match(webSource, /ReadOnlyPaths=@@DATABASE_PARENT@@/);
  assert.match(webSource, /@@STATE_ROOT@@\/state @@STATE_ROOT@@\/database-import/);
  assert.match(stateSource, /v7\/server\/state_api\.py/);
  assert.match(stateSource, /ReadWritePaths=@@STATE_ROOT@@\/state/);
  assert.match(stateSource, /ReadOnlyPaths=@@DATABASE_PARENT@@/);
  assert.match(databaseImportSource, /v7\/server\/database_import_api\.py/);
  assert.match(databaseImportSource,
    /ReadWritePaths=@@STATE_ROOT@@\/database-import @@STATE_ROOT@@\/duckdb-tmp\/database-import @@DATABASE_PARENT@@/);
  assert.match(databaseImportSource, /ReadOnlyPaths=@@STATE_ROOT@@\/state/);

  console.log('V7 Linux deployment script harness: PASS');
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
