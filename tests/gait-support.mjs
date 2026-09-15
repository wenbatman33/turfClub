import {outputPath} from './output.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:700}});await page.goto(process.env.TEST_URL||'http://localhost:8770');await page.waitForFunction(()=>window.__turf?.state.assetReady);
 const samples=await page.evaluate(async()=>{
  const {RacingScene}=await import(new URL('src/scene.js',location.href));const {createRoster}=await import(new URL('src/race.js',location.href));
  const container=document.createElement('div');container.style='position:fixed;inset:0;z-index:999';document.body.append(container);
  const scene=new RacingScene(container,createRoster());await scene.loadPromise;scene.setCamera('close');window.gaitCheck=scene;
  const results=[];
  for(const phase of [0,.12,.22,.38,.50,.60,.72,.84,.99]){
   scene.update([{id:1,distance:300,lane:7,velocity:17,gaitPhase:phase}],0,0,true);
   const h=scene.horses[0];h.group.updateMatrixWorld(true);for(const p of h.probes)p.mesh.skeleton.update();
   const v=h.group.position.clone();const min=Math.min(...h.probes.map(p=>{p.mesh.getVertexPosition(p.index,v).applyMatrix4(p.mesh.matrixWorld);return v.y;}));
   results.push({phase,min});
  }
  return results;
 });
 for(const {phase,min} of samples){assert.ok(Number.isFinite(min));assert.ok(min>=.034,`hoof penetrates at ${phase}`);if(phase<=.72)assert.ok(min<.16,`excessive clearance at ${phase}`);}
 assert.ok(samples.find(p=>p.phase===.84).min>.07,'collected suspension absent');
 await page.evaluate(()=>{gaitCheck.update([{id:1,distance:300,lane:7,velocity:17,gaitPhase:.84}],0,0,true);for(const h of gaitCheck.horses)h.group.visible=h.id===1;gaitCheck.render();});await page.screenshot({path:outputPath('gait-suspension.png')});
 const motion=await page.evaluate(()=>{
  const ys=[];for(let i=0;i<=240;i++){gaitCheck.update([{id:1,distance:300,lane:7,velocity:17,gaitPhase:i/240}],0,0,true);const h=gaitCheck.horses[0];ys.push(h.body.getObjectByName('HorseScale').position.y+h.group.position.y);}
  return {range:Math.max(...ys)-Math.min(...ys),seam:Math.abs(ys[0]-ys[240]),acceleration:Math.max(...ys.slice(1,-1).map((y,i)=>Math.abs(ys[i+2]-2*y+ys[i])))};
 });assert.ok(motion.seam<1e-6);assert.ok(motion.acceleration<.0002);assert.ok(motion.range<.1);
 const audio=await page.evaluate(async()=>{const {RaceAudio}=await import(new URL('src/audio.js',location.href));const a=new RaceAudio();await a.toggle();a.update(.016,true,.2,1,[{velocity:17}]);const result={duration:a.buffer.duration,channels:a.buffer.numberOfChannels,loop:a.source.loop,rate:a.source.playbackRate.value};a.silence();result.stopped=a.source===null;await a.ctx.close();return result;});
 assert.ok(audio.duration>28&&audio.duration<30);assert.equal(audio.channels,2);assert.equal(audio.loop,true);assert.equal(audio.rate,1);assert.equal(audio.stopped,true);
 console.log(JSON.stringify({samples,motion,audio}));
}finally{await browser.close();}
