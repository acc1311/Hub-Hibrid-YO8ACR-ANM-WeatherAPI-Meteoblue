import assert from 'node:assert/strict';
import { fuseField, detectOutliers, modelConsensusStats } from '../src/fusion/fusion-engine.js';
import { WeatherDecisionEngine } from '../src/weather/weather-engine.js';
import { mae, rmse, bias, skillFromMetrics } from '../src/weather/verification.js';
import { normalizeAnmNowcasting } from '../src/providers/anm/anm-nowcasting.js';

const fused=fuseField('temperature.current',[
  {value:20,source:'anm',weight:.5},
  {value:20.5,source:'openmeteo_eu',weight:.3},
  {value:20.2,source:'openmeteo_ecmwf',weight:.2},
  {value:50,source:'bad',weight:.5},
]);
assert.ok(fused.value < 22);
assert.ok(fused.flags.some(x=>x.includes('outlier')));
assert.equal(fused.provenance.robustOutlierMethod,'MAD');
assert.equal(new WeatherDecisionEngine().decideMode(47.17,26.36).mode,'ANM_FIRST');
assert.deepEqual(detectOutliers([20,20,20,20,50]).outliers,[50]);
assert.equal(modelConsensusStats([1,2,3]).median,2);
assert.equal(mae([1,2,3],[1,3,3]),0.333);
assert.equal(rmse([1,2,3],[1,3,3]),0.577);
assert.equal(bias([1,2,3],[1,3,3]),-0.333);
assert.ok(skillFromMetrics({mae:.5,rmse:.7})>70);
const now=normalizeAnmNowcasting({items:[{level:'orange',title:'x',official:true}]});
assert.equal(now[0].sourceType,'official-nowcasting');
console.log('YO8ACR Weather Hub v2.5 smoke test: PASS');
