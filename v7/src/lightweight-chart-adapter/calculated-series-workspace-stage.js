/** Compose calculated-series child work into ready and empty Chart stages. */
export function createCalculatedSeriesWorkspaceStagePort({
  assertLive,
  calculatedSeriesStages,
  registerStage,
  stagePlanner,
}) {
  return Object.freeze({
    async stage({
      chartDataCache = null,
      futureTimeAxisDataCache = null,
      identity,
      instrumentLabel,
      priceIncrement,
      signal,
      seriesMutationPlanMemo = null,
      workspaceSnapshot,
    }) {
      assertLive();
      const base = stagePlanner.ready({
        chartDataCache,
        futureTimeAxisDataCache,
        identity,
        instrumentLabel,
        priceIncrement,
        seriesMutationPlanMemo,
        signal,
        workspaceSnapshot,
      });
      const calculatedSeriesStage = await calculatedSeriesStages.prepareWorkspace({
        identity,
        paneSnapshot: workspaceSnapshot,
        signal,
        transactionIdentity: identity,
        workspacePaneId: workspaceSnapshot.paneId,
      });
      return registerStage({ ...base, calculatedSeriesStage });
    },
    async stageEmpty({ identity, instrumentLabel, priceIncrement, signal, workspacePaneId }) {
      assertLive();
      const base = stagePlanner.empty({ identity, instrumentLabel, priceIncrement, signal });
      const calculatedSeriesStage = await calculatedSeriesStages.prepareWorkspace({
        identity,
        paneSnapshot: null,
        signal,
        transactionIdentity: identity,
        workspacePaneId,
      });
      return registerStage({ ...base, calculatedSeriesStage });
    },
  });
}
