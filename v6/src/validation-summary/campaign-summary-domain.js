const round=(v)=>Math.round(v*10000)/10000;
export function createCampaignSummary({campaignId,rows=[],trialCount=0}={}){
  const completed=rows.filter(row=>Number.isFinite(Number(row.rMultiple)));
  const totalR=round(completed.reduce((sum,row)=>sum+Number(row.rMultiple),0));
  return Object.freeze({averageR:completed.length?round(totalR/completed.length):null,breakeven:completed.filter(r=>r.rMultiple===0).length,campaignId:String(campaignId||''),losses:completed.filter(r=>r.rMultiple<0).length,rows:Object.freeze(rows.map(r=>Object.freeze({...r}))),sampleSize:completed.length,totalR,trialCount:Number(trialCount),wins:completed.filter(r=>r.rMultiple>0).length});
}

export function createEvidenceDrillbackDescriptor(row={}){
  if(!row.evidenceId||!row.replaySessionId||!row.replayVisibleThroughTime)throw new Error('Result row has no complete evidence drillback.');
  return Object.freeze({evidenceId:row.evidenceId,evidenceTime:row.evidenceTime,paneId:row.paneId,price:row.price,replaySessionId:row.replaySessionId,replayVisibleThroughTime:row.replayVisibleThroughTime,timeframe:row.timeframe,trialId:row.trialId});
}
