import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RaceAudio} from '../src/audio.js';
test('recorded gallop uses one continuous source and stops on pause or silence',()=>{
 const audio=new RaceAudio(),started=[],stopped=[];
 audio.enabled=true;audio.buffer={};audio.master={gain:{setTargetAtTime(){},cancelScheduledValues(){}}};
 audio.ctx={currentTime:1,createBufferSource(){const s={connect(){},start(){started.push(s)},stop(){stopped.push(s)}};return s;}};
 const tick=running=>audio.update(.016,running,.5,4,[{velocity:17}]);
 tick(true);tick(true);assert.equal(started.length,1);assert.equal(started[0].loop,true);
 tick(false);assert.equal(stopped.length,1);tick(false);assert.equal(stopped.length,1);
 tick(true);assert.equal(started.length,2);audio.silence();assert.equal(stopped.length,2);
 audio.enabled=false;tick(true);assert.equal(started.length,2);
});
