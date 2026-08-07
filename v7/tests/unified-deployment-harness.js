import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const deployScript = path.join(repositoryRoot, 'v7/deploy/linux/deploy.sh');
const legacyScript = path.join(repositoryRoot, 'v7/deploy/linux/deploy-public-ip.sh');
const stateLibrary = path.join(repositoryRoot, 'v7/deploy/linux/lib/deployment-state.sh');
const endpointLibrary = path.join(repositoryRoot, 'v7/deploy/linux/lib/public-endpoint.sh');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  repositoryRoot,
  'v7/tests/fixtures/unified-deployment/negative/cases.json',
), 'utf8'));
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-unified-deploy-'));

function bash(source, argumentsList = [], environment = {}) {
  return spawnSync('bash', ['-c', source, 'bash', ...argumentsList], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
}

function infer(fragmentText) {
  const fragment = path.join(temporaryDirectory, 'replay-lab.Caddyfile');
  if (fragmentText === null) {
    fs.rmSync(fragment, { force: true });
  } else {
    fs.writeFileSync(fragment, fragmentText);
  }
  return bash([
    'source "$1"',
    'replay_lab_infer_existing_endpoint /missing/current "$2"',
  ].join('\n'), [stateLibrary, fragment]);
}

try {
  for (const script of [deployScript, legacyScript, stateLibrary, endpointLibrary]) {
    const syntax = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, `${script}: ${syntax.stderr}`);
  }

  const help = spawnSync('bash', [deployScript, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  for (const option of ['--local', '--public', '--public-ip', '--public-domain', '--private-domain']) {
    assert.match(help.stdout, new RegExp(option));
  }
  assert.match(help.stdout, /omitting the exposure mode reuses the saved deployment/);
  assert.match(help.stdout, /fresh host it defaults to --local/);

  const deploySource = fs.readFileSync(deployScript, 'utf8');
  assert.match(deploySource, /profile_path="\/etc\/replay-lab\/deployment\.conf"/);
  assert.match(deploySource, /--deployment-profile-file "\$profile_file"/);
  assert.match(deploySource, /replay_lab_detect_public_ipv4/);
  assert.match(deploySource, /replay_lab_domain_ipv4s/);
  assert.match(deploySource, /--public-domain\|--domain/);
  assert.match(deploySource, /previous_exposure/);
  assert.match(deploySource, /refusing to leave the existing .* endpoint active/);

  const profile = path.join(temporaryDirectory, 'deployment.conf');
  fs.writeFileSync(profile, [
    'schemaVersion=1',
    'mode=public-domain',
    'endpoint=replay.example.com',
    'databasePath=/srv/replay-lab-data/trading_data.duckdb',
    'serviceUser=replay',
    'authUser=reviewer',
    'passwordFile=/etc/replay-lab/secrets/web-password',
    'preserveCaddy=1',
    '',
  ].join('\n'));
  const validProfile = bash([
    'source "$1"',
    'replay_lab_profile_valid "$2" || exit 1',
    'replay_lab_profile_value "$2" endpoint',
  ].join('\n'), [stateLibrary, profile]);
  assert.equal(validProfile.status, 0, validProfile.stderr);
  assert.equal(validProfile.stdout, 'replay.example.com\n');

  for (const negativeCase of negativeCases) {
    fs.writeFileSync(profile, negativeCase.profile);
    const invalidProfile = bash([
      'source "$1"',
      'replay_lab_profile_valid "$2"',
    ].join('\n'), [stateLibrary, profile]);
    assert.notEqual(invalidProfile.status, 0, `${negativeCase.id} must fail closed`);
  }

  assert.equal(infer(null).stdout, 'local\t');
  assert.equal(infer('43.110.32.34 {\n  reverse_proxy 127.0.0.1:8007\n}\n').stdout,
    'public-ip\t43.110.32.34');
  assert.equal(infer('replay.example.com {\n  reverse_proxy 127.0.0.1:8007\n}\n').stdout,
    'public-domain\treplay.example.com');
  assert.equal(infer('replay.home.arpa {\n  tls internal\n  reverse_proxy 127.0.0.1:8007\n}\n').stdout,
    'private-domain\treplay.home.arpa');

  const curlStub = path.join(temporaryDirectory, 'curl-stub');
  fs.writeFileSync(curlStub, `#!/usr/bin/env bash
case "\${REPLAY_TEST_ENDPOINT_SCENARIO}:$*" in
  alibaba:*latest/api/token*) printf 'token' ;;
  alibaba:*latest/meta-data/eipv4*) printf '43.110.32.34' ;;
  digitalocean:*latest/api/token*) exit 22 ;;
  digitalocean:*metadata/v1/interfaces/public/0/ipv4/address*) printf '146.190.100.212' ;;
  external:*latest/api/token*|external:*metadata/v1/interfaces/public/0/ipv4/address*) exit 22 ;;
  external:*api.ipify.org*) printf '198.51.100.24' ;;
  private:*latest/api/token*|private:*metadata/v1/interfaces/public/0/ipv4/address*) exit 22 ;;
  private:*api.ipify.org*|private:*checkip.amazonaws.com*) printf '10.0.0.8' ;;
  *) exit 22 ;;
esac
`);
  fs.chmodSync(curlStub, 0o700);
  const scenarios = [
    ['alibaba', '43.110.32.34\talibaba-ecs-metadata'],
    ['digitalocean', '146.190.100.212\tdigitalocean-metadata'],
    ['external', '198.51.100.24\texternal-address-observer'],
  ];
  for (const [scenario, expected] of scenarios) {
    const detection = bash([
      'source "$1"',
      'replay_lab_detect_public_ipv4',
    ].join('\n'), [endpointLibrary], {
      REPLAY_LAB_CURL_BIN: curlStub,
      REPLAY_TEST_ENDPOINT_SCENARIO: scenario,
    });
    assert.equal(detection.status, 0, `${scenario}: ${detection.stderr}`);
    assert.equal(detection.stdout, expected);
  }
  const privateDetection = bash([
    'source "$1"',
    'replay_lab_detect_public_ipv4',
  ].join('\n'), [endpointLibrary], {
    REPLAY_LAB_CURL_BIN: curlStub,
    REPLAY_TEST_ENDPOINT_SCENARIO: 'private',
  });
  assert.notEqual(privateDetection.status, 0, 'private addresses must not become public endpoints');

  console.log('V7 unified deployment harness: PASS', {
    exposureModes: 4,
    endpointBackends: scenarios.length,
    negativeProfiles: negativeCases.length,
  });
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
