import {test} from 'node:test';import assert from 'node:assert/strict';import {fitGaitHeight} from '../src/gait-height.js';
test('support changes produce a smooth periodic body path without frame history',()=>{
 const raw=Array.from({length:256},(_,i)=>1+.02*Math.sin(i/256*2*Math.PI)+.03*Math.abs(Math.sin(i/256*16*Math.PI)));
 const height=fitGaitHeight(raw);assert.ok(Math.abs(height(0)-height(1))<1e-12);
 for(let i=0;i<256;i++)assert.ok(height(i/256)>=raw[i]-1e-12);
 const second=f=>Math.max(...raw.map((_,i)=>Math.abs(f((i+1)/256)-2*f(i/256)+f((i-1)/256))));
 assert.ok(second(height)<.001);assert.equal(height(.3),height(1.3));
});
