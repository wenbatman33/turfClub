export const DISTANCE = 2200;
export const FRAME_COLORS = ['#f3f0e7', '#292c30', '#d4443e', '#3778ba', '#eacb4f', '#2f9661', '#e78937', '#df84a6'];
export const TYPES = {
 win: {name:'單勝',zh:'獨贏',count:1,rule:'選 1 匹馬，跑進第 1 名即命中。'},
 place: {name:'複勝',zh:'位置',count:1,rule:'選 1 匹馬，跑進前 3 名即命中（本場 12 匹）。'},
 quinella: {name:'馬連',zh:'連贏',count:2,rule:'選 2 匹馬，包辦前 2 名，不計順序。'},
 exacta: {name:'馬單',zh:'單式連贏',count:2,ordered:true,rule:'依序選第 1、2 名，馬匹與順序都要正確。'},
 wide: {name:'位置連贏',zh:'位置 Q',count:2,rule:'選 2 匹馬，兩匹都進前 3 名即命中。'},
 trio: {name:'3連複',zh:'三連複',count:3,rule:'選 3 匹馬，包辦前 3 名，不計順序。'},
 trifecta: {name:'3連單',zh:'三連單',count:3,ordered:true,rule:'依序選第 1、2、3 名，馬匹與順序都要正確。'},
 bracket: {name:'框連',zh:'框連',count:2,frame:true,rule:'選 2 個框色，包辦前 2 名，不計順序。重複點同一框可選同框組合（該框須有 2 匹）。'}
};
const names = [
 ['アオゾラブレイヴ','青空勇者','蒼井 蓮','領放',91,82,89,3.4],
 ['ツキノシズク','月之雫','月野 凪','中段追擊',85,91,86,6.8],
 ['アカツキホープ','曉光希望','赤坂 悠','先行',88,85,87,4.8],
 ['ミナトブルー','湊藍','湊 颯太','後段衝刺',84,93,82,12.5],
 ['キンモクセイ','金木犀','秋山 碧','先行',87,87,90,5.6],
 ['コハクノユメ','琥珀之夢','小坂 翼','中段追擊',82,86,84,18.3],
 ['ミドリノカゼ','翠風','森川 晴','中段追擊',90,92,91,3.9],
 ['シラカバロード','白樺之路','白石 律','領放',86,78,81,23.6],
 ['ユウヤケライン','夕映航線','夕城 誠','先行',83,89,83,15.2],
 ['アキノカナタ','秋之彼方','遠山 凌','後段衝刺',85,94,88,8.7],
 ['サクラノシオン','櫻之詩音','櫻井 望','中段追擊',84,88,85,14.6],
 ['ハルカナヒカリ','遙遠之光','春野 陸','後段衝刺',81,91,83,28.9]
];
export function rng(seed) {let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createRoster(seed=20260915){
 const random=rng(seed);
 return names.map((n,i)=>{
  const frame=i<4?i+1:5+Math.floor((i-4)/2);
  const condition=Math.round(78+random()*21);
  return {id:i+1,name:n[1],zh:n[1],jockey:n[2],style:n[3],speed:n[4],stamina:n[5],skill:n[6],odds:Math.round(n[7]*(1+(90-condition)*.015)*10)/10,
   frame,color:FRAME_COLORS[frame-1],condition,weight:458+i*4+Math.round(random()*16),change:Math.round(random()*6-3)*2,age:3+i%3,load:i%4===0?57:56,
   last:Array.from({length:3},()=>1+Math.floor(random()*8)),fitness:Math.round(82+random()*17),coat:['bay','black','chestnut','bay','chestnut','grey','darkbay','bay','black','chestnut','grey','bay'][i],
   note:['起步反應俐落，擅長搶佔前方位置。','步調穩定，長距離仍能保留末段速度。','前段節奏佳，適合貼近領先群。','需要保留體力，最後直線有追擊機會。'][i%4]};
 });
}
export function validateTicket(type,picks,stake,roster){
 const t=TYPES[type];if(!t)return '未知的競猜方式';
 if(picks.length!==t.count)return `請${t.ordered?'依序':''}選擇 ${t.count} ${t.frame?'個框':'匹馬'}`;
 if(!Number.isSafeInteger(stake)||stake<100||stake>10000||stake%100!==0)return '每注請使用 100–10,000 點，並以 100 點為單位';
 const valid=t.frame?roster.map(h=>h.frame):roster.map(h=>h.id);
 if(picks.some(p=>!valid.includes(p)))return '選擇的馬匹或框不存在';
 if(new Set(picks).size!==picks.length){
  if(!t.frame || roster.filter(h=>h.frame===picks[0]).length<2)return '這個組合不能重複選擇';
 }
 return null;
}
export function quoteOdds(type,picks,roster){
 if(validateTicket(type,picks,100,roster))return 0;
 const odds=picks.map(id=>TYPES[type].frame?Math.max(1.5,1/roster.filter(h=>h.frame===id).reduce((s,h)=>s+1/h.odds,0)):roster.find(h=>h.id===id).odds);
 const product=odds.reduce((a,b)=>a*b,1);
 const factor={win:1,place:.31,quinella:.43,exacta:.85,wide:.20,trio:.16,trifecta:.91,bracket:.40}[type];
 return Math.max(1.1,Math.floor(product*factor*10)/10);
}
export function ticketWins(ticket,finish,roster){
 if(validateTicket(ticket.type,ticket.picks,ticket.stake,roster))return false;
 const ids=finish.map(f=>typeof f==='number'?f:f.id);const p=ticket.picks;
 if(ids.length!==roster.length || new Set(ids).size!==roster.length)return false;
 switch(ticket.type){
  case 'win':return p[0]===ids[0];
  case 'place':return ids.slice(0,3).includes(p[0]);
  case 'quinella':return p.every(x=>ids.slice(0,2).includes(x));
  case 'exacta':return p[0]===ids[0]&&p[1]===ids[1];
  case 'wide':return p.every(x=>ids.slice(0,3).includes(x));
  case 'trio':return p.every(x=>ids.slice(0,3).includes(x));
  case 'trifecta':return p.every((x,i)=>x===ids[i]);
  case 'bracket':return [...p].sort().join(',')===ids.slice(0,2).map(id=>roster.find(h=>h.id===id).frame).sort().join(',');
  default:return false;
 }
}
export function settleTickets(tickets,finish,roster){return tickets.map(t=>{const won=ticketWins(t,finish,roster);return {...t,won,payout:won?Math.round(t.stake*t.odds):0};});}
export class Race {
 constructor(roster,seed){
  this.time=0;this.finished=false;this.finish=[];this.history=[];this.recordAt=0;
  const random=rng(seed);
  this.runners=roster.map((h,i)=>({...h,distance:0,lane:1.3+i*1.27,velocity:0,laneVelocity:0,laneTarget:1.3+i*1.27,nextLaneDecision:0,gaitPhase:i*.137,energy:1,finishTime:null,
   form:(random()-.5)*.85,phase:random()*6.28,breakDelay:random()*.32,burst:.15+random()*1.0,efficiency:.92+random()*.16}));
  this.record();
 }
 get ranking(){return [...this.runners].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime||a.id-b.id:a.finishTime!==null?-1:b.finishTime!==null?1:b.distance-a.distance);}
 step(dt){
  if(this.finished)return;
  const prevTime=this.time;this.time+=dt;
  const traffic=this.runners.map(h=>({id:h.id,distance:h.distance,lane:h.lane,velocity:h.velocity,finishTime:h.finishTime}));
  for(const h of this.runners){
   if(h.finishTime!==null){h.distance+=Math.max(3,h.velocity)*dt;h.gaitPhase+=Math.max(3,h.velocity)*dt/9.2;h.velocity*=Math.exp(-dt*.14);h.laneVelocity=0;continue;}
   const p=h.distance/DISTANCE;const elapsed=Math.max(0,this.time-h.breakDelay);
   const early={領放:.4,先行:.18,中段追擊:-.12,後段衝刺:-.22}[h.style];
   const late={領放:-.35,先行:.15,中段追擊:1.1,後段衝刺:1.45}[h.style];
   const smoothNoise=.25*Math.sin(this.time*.19+h.phase)+.13*Math.sin(this.time*.61+h.phase*3);
   const end=p>.60?Math.sin(Math.min(1,(p-.60)/.40)*Math.PI*.5):0;
   const ability=(h.speed-85)*.037+(h.condition-88)*.016+(h.skill-85)*.016+(h.fitness-90)*.01-(h.load-56)*.035+h.form;
   const tired=Math.max(0,.30-h.energy)*3.1;
   let target=17.15+ability+early*(1-end)+end*(late+h.burst)+smoothNoise-tired;
   target*=Math.min(1,elapsed/4.5);
   // Commit to a gradual lane plan. Check the entire swept corridor, not only the destination.
   const merge=Math.max(0,Math.min(1,(h.distance-55)/450));const ease=merge*merge*(3-2*merge);
   const preferred=(1.3+(h.id-1)*1.27)*(1-ease)+(1.7+((h.id*7)%5)*1.1)*ease;
   const ahead=traffic.find(o=>o.id!==h.id&&o.distance>h.distance&&o.distance-h.distance<11&&Math.abs(o.lane-h.lane)<1.15&&o.finishTime===null);
   const clear=(lane)=>traffic.every(o=>o.id===h.id||Math.abs(o.distance-h.distance)>12||o.lane<Math.min(h.lane,lane)-1.2||o.lane>Math.max(h.lane,lane)+1.2);
   if(this.time>=h.nextLaneDecision){
    let proposed=preferred;
    if(ahead)proposed=Math.min(17,h.lane+1.5);
    else if(end>.3&&h.style==='後段衝刺')proposed+=1.3;
    // One measured lane change at a time, with a three-second commitment.
    proposed=Math.max(1.3,Math.min(17,h.lane+Math.max(-1.6,Math.min(1.6,proposed-h.lane))));
    if(clear(proposed))h.laneTarget=proposed;
    h.nextLaneDecision=this.time+3+(h.id%3)*.35;
   }
   if(ahead)target=Math.min(target,Math.max(0,ahead.velocity+(ahead.distance-h.distance-7)*.22));
   const permitted=clear(h.laneTarget);
   const desiredLateral=permitted?Math.max(-.45,Math.min(.45,(h.laneTarget-h.lane)*.5)):0;
   const acceleration=Math.max(-.22,Math.min(.22,(desiredLateral-h.laneVelocity)*1.5));
   h.laneVelocity+=acceleration*dt;h.lane=Math.max(1.3,Math.min(17,h.lane+h.laneVelocity*dt));
   h.velocity+=(target-h.velocity)*Math.min(1,dt*1.8);
   const prev=h.distance;h.distance+=h.velocity*dt;h.gaitPhase+=h.velocity*dt/9.2;
   h.energy=Math.max(.08,h.energy-dt*(.0037+(h.velocity-16)*.00045+(early>0?early*.0005:0))*(100/h.stamina)/h.efficiency);
   if(h.distance>=DISTANCE){h.finishTime=prevTime+dt*(DISTANCE-prev)/(h.distance-prev);this.finish.push(h);}
  }
  this.finish.sort((a,b)=>a.finishTime-b.finishTime||a.id-b.id);
  this.finished=this.finish.length===this.runners.length;
  if(this.time>=this.recordAt||this.finished){this.record();this.recordAt=this.time+.1;}
 }
 record(){this.history.push({time:this.time,runners:this.runners.map(h=>({id:h.id,distance:h.distance,lane:h.lane,velocity:h.velocity,laneVelocity:h.laneVelocity,gaitPhase:h.gaitPhase,energy:h.energy}))});}
 sample(time){
  if(!this.history.length)return [];
  let lo=0,hi=this.history.length-1;while(lo<hi){let mid=(lo+hi+1)>>1;if(this.history[mid].time<=time)lo=mid;else hi=mid-1;}
  const a=this.history[lo],b=this.history[Math.min(lo+1,this.history.length-1)];const t=a===b?0:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
  return a.runners.map((h,i)=>({...h,distance:h.distance+(b.runners[i].distance-h.distance)*t,lane:h.lane+(b.runners[i].lane-h.lane)*t,velocity:h.velocity+(b.runners[i].velocity-h.velocity)*t,laneVelocity:h.laneVelocity+(b.runners[i].laneVelocity-h.laneVelocity)*t,gaitPhase:h.gaitPhase+(b.runners[i].gaitPhase-h.gaitPhase)*t}));
 }
}
export const formatTime=s=>`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
