import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const library = path.resolve(testDirectory, '../deploy/linux/lib/host-transaction.sh');
const installer = path.resolve(testDirectory, '../deploy/linux/install.sh');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-host-transaction-'));
const existing = path.join(temporaryDirectory, 'existing.conf');
const introduced = path.join(temporaryDirectory, 'introduced.conf');
const introducedLink = path.join(temporaryDirectory, 'introduced.service');
const existingLink = path.join(temporaryDirectory, 'existing.service');
const backup = path.join(temporaryDirectory, 'backup');
fs.writeFileSync(existing, 'old\n', { mode: 0o640 });
fs.symlinkSync('/old/unit', existingLink);

try {
  const restore = spawnSync('bash', ['-c', `
set -Eeuo pipefail
sudo_cmd() { "$@"; }
source "$1"
replay_lab_host_transaction_begin "$2" "$3" "$4" "$5" "$6"
printf 'new\\n' > "$3"
printf 'introduced\\n' > "$4"
ln -s /new/unit "$5"
ln -sfn /replacement/unit "$6"
chmod 0600 "$3"
replay_lab_host_transaction_restore
`, 'bash', library, backup, existing, introduced, introducedLink, existingLink], { encoding: 'utf8' });
  assert.equal(restore.status, 0, restore.stderr);
  assert.equal(fs.readFileSync(existing, 'utf8'), 'old\n');
  assert.equal(fs.statSync(existing).mode & 0o777, 0o640);
  assert.equal(fs.existsSync(introduced), false);
  assert.equal(fs.lstatSync(existingLink).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(existingLink), '/old/unit');
  assert.equal(fs.existsSync(introducedLink), false);
  assert.equal(fs.lstatSync(introducedLink, { throwIfNoEntry: false }), undefined);

  const existingDirectory = path.join(temporaryDirectory, 'existing-directory');
  const newDirectory = path.join(temporaryDirectory, 'new-directory');
  const metadata = path.join(temporaryDirectory, 'metadata');
  fs.mkdirSync(existingDirectory, { mode: 0o750 });
  const metadataRestore = spawnSync('bash', ['-c', `
set -Eeuo pipefail
sudo_cmd() { "$@"; }
source "$1"
replay_lab_host_metadata_begin "$2" "$3" "$4"
chmod 0700 "$3"
mkdir -m 0711 "$4"
replay_lab_host_metadata_restore
`, 'bash', library, metadata, existingDirectory, newDirectory], { encoding: 'utf8' });
  assert.equal(metadataRestore.status, 0, metadataRestore.stderr);
  assert.equal(fs.statSync(existingDirectory).mode & 0o777, 0o750);
  assert.equal(fs.statSync(newDirectory).mode & 0o777, 0o711,
    'rollback must not delete a newly created directory which may contain runtime data');

  const committed = path.join(temporaryDirectory, 'committed.conf');
  const committedBackup = path.join(temporaryDirectory, 'committed-backup');
  fs.writeFileSync(committed, 'before\n');
  const commit = spawnSync('bash', ['-c', `
set -Eeuo pipefail
sudo_cmd() { "$@"; }
source "$1"
replay_lab_host_transaction_begin "$2" "$3"
printf 'after\\n' > "$3"
replay_lab_host_transaction_commit
`, 'bash', library, committedBackup, committed], { encoding: 'utf8' });
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(fs.readFileSync(committed, 'utf8'), 'after\n');

  const installRoot = path.join(temporaryDirectory, 'install-root');
  const releases = path.join(installRoot, 'releases');
  const previousRelease = path.join(releases, 'previous');
  const failedRelease = path.join(releases, 'candidate');
  const currentRelease = path.join(installRoot, 'current');
  fs.mkdirSync(path.join(previousRelease, '.venv'), { recursive: true });
  fs.mkdirSync(path.join(failedRelease, '.venv', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(failedRelease, '.venv', 'bin', 'python'), 'partial runtime\n');
  fs.writeFileSync(path.join(failedRelease, 'release.txt'), 'candidate source\n');
  fs.symlinkSync(previousRelease, currentRelease);
  const quarantine = spawnSync('bash', ['-c', `
set -Eeuo pipefail
sudo_cmd() { "$@"; }
source "$1"
replay_lab_quarantine_failed_release "$2" "$3" "$4" injected "$5" "$6"
printf '%s\\n' "$REPLAY_LAB_FAILED_RELEASE_QUARANTINE_PATH"
`, 'bash', library, installRoot, failedRelease, currentRelease,
    String(process.getuid()), String(process.getgid())], { encoding: 'utf8' });
  assert.equal(quarantine.status, 0, quarantine.stderr);
  const quarantinePath = quarantine.stdout.trim();
  assert.equal(fs.existsSync(failedRelease), false);
  assert.equal(fs.statSync(quarantinePath).mode & 0o777, 0o700);
  assert.equal(fs.readFileSync(path.join(quarantinePath, 'release.txt'), 'utf8'), 'candidate source\n');
  assert.equal(fs.existsSync(path.join(quarantinePath, '.venv')), false,
    'a newly-created partial virtualenv must be removed after the failed release is isolated');

  const protectedRelease = path.join(releases, 'protected');
  const protectedCurrent = path.join(installRoot, 'protected-current');
  fs.mkdirSync(path.join(protectedRelease, '.venv'), { recursive: true });
  fs.symlinkSync(protectedRelease, protectedCurrent);
  const activeProtection = spawnSync('bash', ['-c', `
set -Eeuo pipefail
sudo_cmd() { "$@"; }
source "$1"
if replay_lab_quarantine_failed_release "$2" "$3" "$4" injected "$5" "$6"; then
  exit 9
fi
`, 'bash', library, installRoot, protectedRelease, protectedCurrent,
    String(process.getuid()), String(process.getgid())], { encoding: 'utf8' });
  assert.equal(activeProtection.status, 0, activeProtection.stderr);
  assert.equal(fs.existsSync(protectedRelease), true,
    'the quarantine helper must fail closed when the candidate is still active');

  const retainedRelease = path.join(releases, 'retained');
  fs.mkdirSync(path.join(retainedRelease, '.venv', 'bin'), { recursive: true });
  const retainedQuarantine = spawnSync('bash', ['-c', `
set -Eeuo pipefail
sudo_cmd() {
  if [[ "$1" == "rm" ]]; then return 1; fi
  "$@"
}
source "$1"
replay_lab_quarantine_failed_release "$2" "$3" "$4" retained "$5" "$6"
printf '%s\\t%s\\n' "$REPLAY_LAB_FAILED_RELEASE_QUARANTINE_PATH" \\
  "$REPLAY_LAB_FAILED_RELEASE_VENV_RETAINED"
`, 'bash', library, installRoot, retainedRelease, currentRelease,
    String(process.getuid()), String(process.getgid())], { encoding: 'utf8' });
  assert.equal(retainedQuarantine.status, 0, retainedQuarantine.stderr);
  const [retainedPath, retainedFlag] = retainedQuarantine.stdout.trim().split('\t');
  assert.equal(retainedFlag, '1');
  assert.equal(fs.statSync(retainedPath).mode & 0o777, 0o700,
    'cleanup failure must leave the partial runtime inside an isolated quarantine');
  assert.equal(fs.existsSync(path.join(retainedPath, '.venv')), true);

  const faultTarget = path.join(temporaryDirectory, 'fault-target.conf');
  const faultBackup = path.join(temporaryDirectory, 'fault-backup');
  const recoveryRoot = path.join(temporaryDirectory, 'recovery');
  const recoveryManifest = path.join(temporaryDirectory, 'recovery-manifest');
  fs.writeFileSync(faultTarget, 'accepted\n');
  fs.writeFileSync(recoveryManifest, 'failure_context=injected-restore\n', { mode: 0o600 });
  const incompleteRestore = spawnSync('bash', ['-c', `
set -Eeuo pipefail
fault_target="$3"
sudo_cmd() {
  if [[ "$1" == "mv" && "\${*: -1}" == "$fault_target" ]]; then return 1; fi
  "$@"
}
source "$1"
replay_lab_host_transaction_begin "$2" "$3"
printf 'candidate\\n' > "$3"
if replay_lab_host_transaction_restore; then exit 9; fi
replay_lab_host_preserve_recovery_snapshot "$4" injected "$6" "$7" "$2" "$5"
printf '%s\\n' "$REPLAY_LAB_HOST_RECOVERY_SNAPSHOT_PATH"
`, 'bash', library, faultBackup, faultTarget, recoveryRoot, recoveryManifest,
    String(process.getuid()), String(process.getgid())], { encoding: 'utf8' });
  assert.equal(incompleteRestore.status, 0, incompleteRestore.stderr);
  const recoverySnapshot = incompleteRestore.stdout.trim();
  assert.equal(fs.statSync(recoverySnapshot).mode & 0o777, 0o700);
  assert.equal(fs.readFileSync(path.join(recoverySnapshot, 'recovery-manifest'), 'utf8'),
    'failure_context=injected-restore\n');
  assert.match(fs.readFileSync(path.join(recoverySnapshot, 'fault-backup', 'present'), 'utf8'),
    /fault-target\.conf/);

  const installerSource = fs.readFileSync(installer, 'utf8');
  const healthVerifier = installerSource.match(
    /^verify_restored_service_health\(\) \{[\s\S]*?^\}/m,
  )?.[0];
  assert.ok(healthVerifier, 'rollback health verification must remain independently executable');
  const activeUnits = path.join(temporaryDirectory, 'active-units');
  fs.writeFileSync(activeUnits, 'replay-lab-state.service\n');
  const healthFailure = spawnSync('bash', ['-c', `
set -Eeuo pipefail
warn() { printf 'WARN: %s\\n' "$*" >&2; }
wait_for_url() { return 1; }
active_units_before_path="$1"
${healthVerifier}
if verify_restored_service_health; then exit 9; fi
`, 'bash', activeUnits], { encoding: 'utf8' });
  assert.equal(healthFailure.status, 0, healthFailure.stderr);
  assert.match(healthFailure.stderr, /replay-lab-state\.service/);
  assert.match(healthFailure.stderr, /127\.0\.0\.1:8767\/v7\/state\/health/);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log('v7 Linux host transaction harness passed (exact restore, failed-release quarantine, incomplete-rollback recovery snapshot, restored-health failure injection)');
