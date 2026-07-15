import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page();

try {
  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { createIndexedDbValidationPersistenceAdapter } = await import('/v6/src/validation-persistence/validation-persistence-adapters.js');
      const { createValidationRepository } = await import('/v6/src/validation-persistence/validation-repository.js');
      const { createObservationEvidenceRepository } = await import('/v6/src/validation-observation/observation-evidence-repository.js');
      const { createTradePlanRepository } = await import('/v6/src/validation-trade-plan/trade-plan-repository.js');
      const { createSimulatedOutcomeRepository } = await import('/v6/src/validation-outcome/simulated-outcome-repository.js');
      const { createCampaignSummaryRepository } = await import('/v6/src/validation-summary/campaign-summary-repository.js');
      const databaseName = 'v6.validation.step469.acceptance';
      const deleteDatabase = () => new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('validation acceptance delete blocked'));
      });
      await deleteDatabase();

      const adapter = createIndexedDbValidationPersistenceAdapter({ databaseName });
      const validation = createValidationRepository({ adapter });
      const observations = createObservationEvidenceRepository({ adapter });
      const plans = createTradePlanRepository({ adapter });
      const outcomes = createSimulatedOutcomeRepository({ adapter });
      await validation.open();
      await validation.createPlaybookVersion({
        createdAt: 1, id: 'pbv-469', name: 'Acceptance playbook', playbookId: 'pb-469',
        rules: [{ id: 'rule-469', statement: 'Commit evidence before outcome.' }], version: 1,
      });
      await validation.createCampaign({
        createdAt: 2, hypothesis: 'The setup has positive expectancy.', id: 'campaign-469',
        name: 'Acceptance campaign', playbookVersionId: 'pbv-469',
      });
      await validation.transitionCampaign('campaign-469', 'active', { updatedAt: 3 });

      const records = [
        { exit: 120, id: 'a', price: 25000, r: 2, visible: '2026-05-03T14:30:00.000Z' },
        { exit: 90, id: 'b', price: 25100, r: -1, visible: '2026-05-04T14:30:00.000Z' },
      ];
      for (const record of records) {
        const trialId = 'trial-' + record.id;
        await validation.createTrial({ campaignId: 'campaign-469', createdAt: 10, id: trialId });
        await validation.startTrial(trialId, {
          cursorIndex: 100, cursorTime: record.visible, revealedCount: 101,
          sessionId: 'session-469',
        }, { startedAt: 11 });
        await observations.create({
          observation: {
            category: 'setup', createdAt: 12, evidenceId: 'evidence-' + record.id,
            id: 'observation-' + record.id, text: 'Prospective acceptance observation', trialId,
          },
          evidence: {
            createdAt: 12, id: 'evidence-' + record.id, observationId: 'observation-' + record.id,
            paneId: 'main', price: record.price, replayCursorTime: record.visible,
            replaySessionId: 'session-469', replayVisibleThroughTime: record.visible,
            symbol: 'NQ', time: record.visible, timeframe: '1m', trialId,
          },
        });
        await plans.create({
          createdAt: 13, direction: 'long', entry: 100, evidenceId: 'evidence-' + record.id,
          id: 'plan-revision-' + record.id, invalidation: 'Close below structure',
          observationId: 'observation-' + record.id, stop: 90, target: 120,
          tradePlanId: 'plan-' + record.id, trialId,
        });
        const recorded = await outcomes.record({
          execution: {
            filledAt: record.visible, id: 'execution-' + record.id,
            planRevisionId: 'plan-revision-' + record.id, price: 100,
          },
          outcome: {
            exitedAt: new Date(Date.parse(record.visible) + 60000).toISOString(),
            exitPrice: record.exit, exitReason: record.r > 0 ? 'target' : 'stop',
            id: 'outcome-' + record.id, orderingAmbiguity: 'within-minute-unknown',
          },
        });
        if (recorded.outcome.rMultiple !== record.r) throw new Error('unexpected R');
      }
      await adapter.close();

      const recoveryAdapter = createIndexedDbValidationPersistenceAdapter({ databaseName });
      const recoveredValidation = createValidationRepository({ adapter: recoveryAdapter });
      const summaryRepository = createCampaignSummaryRepository({ adapter: recoveryAdapter });
      await recoveryAdapter.open();
      const summary = await summaryRepository.project('campaign-469');
      const drillback = await summaryRepository.drillback({ campaignId: 'campaign-469', trialId: 'trial-a' });
      const recovery = {
        campaign: await recoveredValidation.getCampaign('campaign-469'),
        playbook: await recoveredValidation.getPlaybookVersion('pbv-469'),
        trialCount: (await recoveredValidation.listTrials('campaign-469')).length,
      };
      await recoveryAdapter.close();
      await deleteDatabase();
      return { drillback, recovery, summary };
    })()))()
  `));

  assert.equal(result.recovery.playbook.version, 1);
  assert.equal(result.recovery.campaign.playbookVersionId, 'pbv-469');
  assert.equal(result.recovery.trialCount, 2);
  assert.equal(result.summary.trialCount, 2);
  assert.equal(result.summary.sampleSize, 2);
  assert.equal(result.summary.wins, 1);
  assert.equal(result.summary.losses, 1);
  assert.equal(result.summary.totalR, 1);
  assert.equal(result.summary.averageR, 0.5);
  assert.deepEqual(result.summary.rows.map((row) => row.rMultiple).sort(), [-1, 2]);
  assert.equal(result.drillback.evidenceId, 'evidence-a');
  assert.equal(result.drillback.replaySessionId, 'session-469');
  assert.equal(result.drillback.replayVisibleThroughTime, '2026-05-03T14:30:00.000Z');
  assert.equal(result.drillback.price, 25000);
  assert.equal(result.drillback.timeframe, '1m');
} finally {
  await page.cleanup();
}

console.log('v6 validation trial acceptance step469 browser smoke passed');
