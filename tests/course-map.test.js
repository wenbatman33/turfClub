import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapPosition} from '../src/course-map.js';
import {DISTANCE,createRoster} from '../src/race.js';
import {coursePoint,TRACK} from '../src/course.js';
test('map markers follow the actual stadium band through both bends at desktop and phone sizes',()=>{
 for(const width of [290,540,1120])for(const lane of [1.3,7,16.5])for(let d=0;d<=DISTANCE;d+=3){
  const height=205,p=mapPosition(d,lane,width,height),r=(height-52)/2-7,straight=(width-30)/2-7-r;
  const x=p.x-width/2,y=p.y-height/2;const distanceToSpine=Math.hypot(Math.max(0,Math.abs(x)-straight),y);
  assert.ok(Math.abs(distanceToSpine-r)<7,`outside map band at ${d}m, width ${width}`);
  const q=coursePoint(d,lane).position;const actual=Math.hypot(Math.max(0,Math.abs(q.x)-TRACK.straight),q.z);assert.ok(actual>=TRACK.radius&&actual<=TRACK.radius+TRACK.width);
 }
});
test('all visible horse names and running styles use Traditional Chinese',()=>{for(const h of createRoster()){assert.ok(!/[\u3040-\u30ff]/.test(h.name+h.style));}});
