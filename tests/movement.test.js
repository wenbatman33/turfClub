import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Race,createRoster} from '../src/race.js';
test('lateral movement remains gradual throughout races and stride phase follows forward travel',()=>{
 for(const seed of [42,741,2026]){
  const race=new Race(createRoster(),seed),dt=1/60;
  while(!race.finished){const before=race.runners.map(h=>({...h}));race.step(dt);
   for(let i=0;i<12;i++){const h=race.runners[i],old=before[i];if(old.finishTime!==null)continue;
    assert.ok(Math.abs(h.lane-old.lane)<=.45*dt+1e-8);
    assert.ok(Math.abs(h.laneVelocity-old.laneVelocity)<=.22*dt+1e-8);
    assert.ok(h.lane>=1.3&&h.lane<=17);
    assert.ok(Math.abs((h.gaitPhase-old.gaitPhase)-(h.distance-old.distance)/9.2)<1e-8);
   }
  }
  const sample=race.sample(25.123);assert.ok(sample.every(h=>Number.isFinite(h.gaitPhase)&&Number.isFinite(h.laneVelocity)));
 }
});
