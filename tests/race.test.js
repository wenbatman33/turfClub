import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoster,TYPES,validateTicket,quoteOdds,ticketWins,settleTickets,Race,DISTANCE} from '../src/race.js';
const roster=createRoster();const finish=[7,3,10,1,2,4,5,6,8,9,11,12];
const ticket=(type,picks,stake=100)=>({type,picks,stake,odds:quoteOdds(type,picks,roster)});
test('12 fictional runners have valid Japanese frame assignments and repeatable status',()=>{
 assert.equal(roster.length,12);assert.deepEqual(roster.map(h=>h.frame),[1,2,3,4,5,5,6,6,7,7,8,8]);assert.deepEqual(roster,createRoster());assert.notDeepEqual(roster,createRoster(928));
});
for(const [type,picks,bad] of [['win',[7],[3]],['place',[10],[1]],['quinella',[3,7],[7,10]],['exacta',[7,3],[3,7]],['wide',[7,10],[7,1]],['trio',[10,7,3],[7,3,1]],['trifecta',[7,3,10],[7,10,3]],['bracket',[6,3],[6,7]]]){
 test(`${TYPES[type].name}: JRA-style winning condition and losing counterpart`,()=>{
  assert.equal(ticketWins(ticket(type,picks),finish,roster),true);assert.equal(ticketWins(ticket(type,bad),finish,roster),false);
 });
}
test('same-frame combination requires two runners and settles correctly',()=>{
 assert.equal(validateTicket('bracket',[5,5],100,roster),null);
 assert.ok(validateTicket('bracket',[1,1],100,roster));
 assert.equal(ticketWins(ticket('bracket',[5,5]),[5,6,10,1,2,3,4,7,8,9,11,12],roster),true);
});
test('invalid stakes, nonexistent runners, duplicate horses and incomplete results cannot win',()=>{
 for(const n of [NaN,-100,0,10,150,10001,Infinity])assert.ok(validateTicket('win',[1],n,roster));
 assert.ok(validateTicket('win',[99],100,roster));assert.ok(validateTicket('exacta',[7,7],100,roster));assert.ok(validateTicket('exacta',[7],100,roster));assert.ok(validateTicket('bogus',[1],100,roster));
 assert.equal(ticketWins(ticket('trio',[7,7,7]),finish,roster),false);assert.equal(ticketWins(ticket('win',[7]),[7,3,10],roster),false);
});
test('settlement uses locked odds and includes the original stake without mutating tickets',()=>{
 const a={...ticket('win',[7],300),odds:3.8};const b=ticket('exacta',[3,7],100);const bets=[a,b],copy=structuredClone(bets);
 const results=settleTickets(bets,finish,roster);assert.equal(results[0].payout,1140);assert.equal(results[1].payout,0);assert.deepEqual(bets,copy);assert.deepEqual(results,settleTickets(bets,finish,roster));
});
function complete(seed){const race=new Race(roster,seed);let ticks=0;while(!race.finished&&ticks++<12000)race.step(1/60);return race;}
test('fixed-step races finish all horses with stable, interpolated arrival order',()=>{
 const race=complete(19283),again=complete(19283);assert.equal(race.finished,true);assert.ok(race.time>110&&race.time<160);assert.equal(new Set(race.finish.map(h=>h.id)).size,12);assert.deepEqual(race.finish.map(h=>h.finishTime),again.finish.map(h=>h.finishTime));
 race.finish.forEach((h,i)=>{assert.ok(h.distance>=DISTANCE);assert.ok(Number.isFinite(h.finishTime));assert.ok(h.energy>=0&&h.energy<=1);if(i)assert.ok(h.finishTime>=race.finish[i-1].finishTime);});
 const frozenTime=race.time;race.step(1);assert.equal(race.time,frozenTime);
});
test('replay samples history, interpolates movement and never changes simulation or finish times',()=>{
 const race=complete(77),snapshot=structuredClone(race.finish.map(h=>({id:h.id,time:h.finishTime})));const a=race.sample(90.25),b=race.sample(90.30);
 assert.equal(a.length,12);a.forEach((h,i)=>assert.ok(b[i].distance>=h.distance));a[0].distance=-999;assert.ok(race.sample(90.25)[0].distance>0);assert.deepEqual(snapshot,race.finish.map(h=>({id:h.id,time:h.finishTime})));
});
test('different race seeds produce different winners and race orders',()=>{
 const races=Array.from({length:12},(_,i)=>complete(i+1));assert.ok(new Set(races.map(r=>r.finish[0].id)).size>=3);assert.ok(new Set(races.map(r=>r.finish.map(h=>h.id).join(','))).size>=10);
});
