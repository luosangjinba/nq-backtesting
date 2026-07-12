import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mapper = await readFile('v6/src/replay/target-materialization-replay-diagnostics-producer-payload-mappers.js', 'utf8');
const mapperSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js', 'utf8');
const diagnosticsRuntime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

for (const exportedMapper of [
  'mapDisplayTimeframeAppliedToDiagnosticsUpdate',
  'mapManualNextAdvancedToDiagnosticsUpdate',
  'mapAutoPlayStateToDiagnosticsUpdate',
  'mapTargetMaterializationReplayDiagnosticsProducerPayload',
  'getTargetMaterializationReplayDiagnosticsProducerEventNames',
]) {
  assert.match(mapper, new RegExp(`export function ${exportedMapper}`));
}

for (const requiredProducerTerm of [
  'displayTimeframe:applied',
  'chartEntryManualNext:advanced',
  'chartEntryAutoPlay:started',
  'chartEntryAutoPlay:ticked',
  'chartEntryAutoPlay:stopped',
  'sourceCursorAuthority: true',
  'targetBarsDisplayInputOnly: true',
]) {
  assert.ok(mapper.includes(requiredProducerTerm), `mapper must document ${requiredProducerTerm}`);
}

for (const forbiddenMapperSurface of [
  /\bregisterCommand\b/,
  /\bsubscribeEvent\b/,
  /\bemitEvent\b/,
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS/,
  /targetMaterializationReplayDiagnostics\.updateSnapshot/,
  /DISPLAY_TIMEFRAME_COMMANDS/,
  /CHART_ENTRY_MANUAL_NEXT_COMMANDS/,
  /CHART_ENTRY_AUTO_PLAY_COMMANDS/,
  /BAR_DATA_COMMANDS/,
  /CHART_DATA_COMMANDS/,
  /CHART_VIEWPORT_COMMANDS/,
  /REPLAY_COMMANDS/,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
]) {
  assert.doesNotMatch(
    mapper,
    forbiddenMapperSurface,
    `producer payload mapper must remain pure and avoid ${forbiddenMapperSurface}`,
  );
}

for (const requiredSmokeTerm of [
  'createTargetMaterializationReplayDiagnosticsSnapshot',
  'validateTargetMaterializationReplayDiagnosticsSnapshot',
  'displayTimeframe:applied',
  'chartEntryManualNext:advanced',
  'chartEntryAutoPlay:stopped',
  'unknown:event',
]) {
  assert.ok(mapperSmoke.includes(requiredSmokeTerm), `mapper smoke must cover ${requiredSmokeTerm}`);
}

assert.doesNotMatch(diagnosticsRuntime, /subscribeEvent|displayTimeframe:applied|chartEntryManualNext:advanced|chartEntryAutoPlay:ticked/);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics-producer-payload-mappers|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

for (const shellSource of shellFiles) {
  assert.doesNotMatch(
    shellSource,
    /target-materialization-replay-diagnostics-producer-payload-mappers|targetMaterializationReplayDiagnostics\.updateSnapshot|\/v4\/target_bars|fetchV4TargetBars/,
  );
}

console.log('v6 target materialization replay diagnostics producer payload mappers boundary step345 static smoke passed');
