import {createRoster,TYPES,FRAME_COLORS,validateTicket,quoteOdds,settleTickets,Race,DISTANCE,formatTime} from './race.js';
import {RacingScene,coursePoint} from './scene.js';
import {FinishExperience} from './finish-experience.js';
import {mapPosition as projectMap} from './course-map.js';
import {RaceAudio} from './audio.js';
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const STORAGE='turf-club-v1';let saved={balance:10000,round:1};let recovered=false;
try{const raw=JSON.parse(localStorage.getItem(STORAGE));if(raw&&Number.isSafeInteger(raw.balance)&&raw.balance>=0&&Number.isSafeInteger(raw.round)&&raw.round>0){saved=raw;if(saved.pending&&Number.isSafeInteger(saved.pending.before)){saved.balance=saved.pending.before;delete saved.pending;recovered=true;}}}catch{}
let balance=saved.balance,round=saved.round,roster=createRoster(20260915+(round-1)*104729),type='win',picks=[],tickets=[],ticketSequence=0;
let race=null,raceSeed=0,results=null,settled=false,playing=false,paused=false,speed=1,countdown=0,replaying=false,replayTime=0,page='entry',preview=false,paddock=false,selectedHorse=1,accumulator=0,uiTimer=0,lastLeader=0,lastSector=-1,toastTimer;
let openingBalance=balance;
const audio=new RaceAudio();
const fmt=n=>Math.round(n).toLocaleString('en-US');
function persist(extra={}){try{localStorage.setItem(STORAGE,JSON.stringify({balance,round,...extra}));}catch{}}
persist();
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3400);}
function ink(frame){return [1,5].includes(frame)?'#344b31':'#fff';}
function badge(h){return `<span class="number-badge" style="--frame:${h.color};--number-ink:${ink(h.frame)}">${h.id}</span>`;}
function frameBadge(id){return `<span class="number-badge" style="--frame:${FRAME_COLORS[id-1]};--number-ink:${ink(id)}">${id}</span>`;}
function condition(h){return h.condition>=94?'巔峰':h.condition>=87?'良好':'穩定';}
function updateBalance(){$('#balance').textContent=fmt(balance);$('#race-number').textContent=String(round).padStart(2,'0');}
function renderRows(){
 const sorted=[...roster];const sort=$('#sort').value;
 if(sort==='odds')sorted.sort((a,b)=>a.odds-b.odds);if(sort==='condition')sorted.sort((a,b)=>b.condition-a.condition);
 const popularity=[...roster].sort((a,b)=>a.odds-b.odds).map(h=>h.id);
 $('#runner-rows').innerHTML=sorted.map(h=>{
  const selected=!TYPES[type].frame&&picks.includes(h.id),good=h.condition>=94?' excellent':'';return `<tr data-horse="${h.id}" class="${selected?'selected':''}"><td><input type="checkbox" aria-label="選擇 ${h.name}" ${selected?'checked':''} ${playing||settled?'disabled':''}></td><td>${badge(h)}<span class="frame-tiny">${h.frame}框</span></td><td><div class="horse-name">${h.name}</div><div class="horse-sub"><span>${h.jockey}</span><em>${h.style}</em><span class="runner-age">${h.age}歲</span></div></td><td><span class="condition-word${good}">${condition(h)}</span><div class="condition-bars${good}" aria-label="狀態 ${h.condition} 分">${Array.from({length:5},(_,i)=>`<i class="${i<Math.round(h.condition/20)?'filled':''}"></i>`).join('')}</div></td><td class="form-cell"><div class="form-numbers">${h.last.map(n=>`<span class="${n<4?'top':''}">${n}</span>`).join('')}</div></td><td><div class="odds ${popularity.indexOf(h.id)<3?'favorite':''}">${h.odds.toFixed(1)}</div><div class="popularity">${popularity.indexOf(h.id)+1}人氣順位</div></td><td><button class="detail-button" data-detail="${h.id}" aria-label="查看 ${h.name} 的狀態">＋</button></td></tr>`;
 }).join('');
}
function renderTicket(){
 const t=TYPES[type];
 $('#bet-types').innerHTML=Object.entries(TYPES).map(([key,t])=>`<button data-type="${key}" class="${type===key?'active':''}" aria-pressed="${type===key}" ${playing||settled?'disabled':''}>${t.name}</button>`).join('');
 $('#bet-rule').textContent=t.rule;$('#pick-label').textContent=t.frame?'選擇框色組合':t.ordered?'依名次順序選馬':t.count===1?type==='win'?'選擇你的冠軍':'選擇進入前三名的馬':'選擇你的馬匹組合';$('#pick-count').textContent=`${picks.length} / ${t.count}`;
 $('#frame-picker').hidden=!t.frame;$('#frame-picker').innerHTML=FRAME_COLORS.map((color,i)=>`<button data-frame="${i+1}" style="--frame:${color};--number-ink:${ink(i+1)}" class="${picks.includes(i+1)?'selected':''}" aria-label="選擇 ${i+1} 框">${i+1}</button>`).join('');
 $('#pick-slots').classList.toggle('multi',t.count>1);
 $('#pick-slots').innerHTML=Array.from({length:t.count},(_,i)=>{
  const id=picks[i],h=roster.find(x=>x.id===id);return id?`<div class="pick-slot">${t.ordered?`<small>${i+1}名</small>`:''}${t.frame?frameBadge(id):badge(h)}<span class="slot-name">${t.frame?id+' 框':h.name}<br><span style="color:#8d9d7b;font-size:8px">${t.frame?'框色預測':h.zh}</span></span><button data-remove-pick="${i}" aria-label="移除選擇">×</button></div>`:`<div class="pick-slot empty">${t.ordered?`${i+1} 名`:'＋'}${t.count===1?' 勾選出馬表中的馬匹':''}</div>`;
 }).join('');
 const stake=Number($('#stake').value);const error=validateTicket(type,picks,stake,roster);$('#add-ticket').disabled=Boolean(error)||playing||settled;
 const odds=error?0:quoteOdds(type,picks,roster);$('#estimate').innerHTML=`${odds?fmt(stake*odds):'—'} <small>PT</small>`;
 $$('.quick-stakes button').forEach(b=>b.classList.toggle('active',Number(b.dataset.stake)===stake));
}
function renderSlip(){
 const total=tickets.reduce((s,t)=>s+t.stake,0);$('#ticket-count').textContent=tickets.length;$('#ticket-total').textContent=`${fmt(total)} PT`;
 $('#ticket-list').innerHTML=tickets.length?tickets.map(t=>`<div class="slip-ticket"><span>${TYPES[t.type].name}</span><strong>${t.picks.join(TYPES[t.type].ordered?' → ':' − ')}${TYPES[t.type].frame?' 框':''}</strong><small>${fmt(t.stake)} PT</small><button data-remove-ticket="${t.id}" aria-label="移除預測單" ${playing||settled?'disabled':''}>×</button></div>`).join(''):'<p class="empty-slip">從左側勾選馬匹，加入你的第一注。</p>';
 if(scene?.ready){$('#start-race').disabled=playing;$('#start-race').innerHTML=settled?'<span>查看本場結果</span><span>→</span>':`<span>${tickets.length?'確認預測・開始觀看':'不下注・直接觀戰'}</span><span>↗</span>`;}
}
function choose(id){
 if(playing||settled)return toast('本場已封盤，下一場可重新選擇。');
 if(TYPES[type].frame){type='win';picks=[];}
 const max=TYPES[type].count;
 if(picks.includes(id))picks=picks.filter(x=>x!==id);else if(max===1)picks=[id];else if(picks.length<max)picks.push(id);else return toast(`此玩法選 ${max} 匹馬，請先取消一匹再更換。`);
 selectedHorse=id;scene.selected=id;renderRows();renderTicket();
}
function selectFrame(frame){
 if(picks.length>=2){picks=[frame];}else if(picks[0]===frame&&roster.filter(h=>h.frame===frame).length<2){return toast('這一框只有 1 匹馬，請搭配另一框。');}else picks.push(frame);
 renderTicket();
}
function addTicket(){
 const stake=Number($('#stake').value);const error=validateTicket(type,picks,stake,roster);if(error)return toast(error);
 if(playing||settled)return;
 if(tickets.length>=20)return toast('每場最多加入 20 注。');
 const total=tickets.reduce((s,t)=>s+t.stake,0)+stake;if(total>balance)return toast('點數不足，請調整每注點數或預測單。');
 tickets.push({id:++ticketSequence,type,picks:[...picks],stake,odds:quoteOdds(type,picks,roster)});renderSlip();toast(`已加入 ${TYPES[type].name} ${picks.join(TYPES[type].ordered?' → ':' − ')}，${fmt(stake)} 點。`);
}
function showPage(next){
 if(playing&&next!=='race')return toast('比賽進行中，請等待所有馬匹完成賽程。');
 page=next;$('#gait-preview').hidden=!paddock;for(const n of ['entry','race','result'])$(`#${n}-page`).hidden=n!==next;
 $$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===next));
 if(next==='race'){if(race&&!paddock)preview=false;scene.resize();if(!race){preview=true;$('#live-badge').innerHTML='<i></i> PREVIEW';$('#pause-race').textContent='←';$('#pause-race').ariaLabel='返回出馬表';$('#remaining').textContent=paddock?'360° 自由檢視':'賽前預覽';$('#commentary').textContent=paddock?'拖曳旋轉，檢視馬匹與騎乘姿勢。':'從出馬表選擇競猜，準備好就開始比賽。';$('#loading-overlay').hidden=scene.ready;}}
 if(next==='result')renderResults();window.scrollTo({top:0,behavior:'instant'});
}
function openPaddock(id=selectedHorse){
 if(playing)return toast('比賽進行中，下一場可再查看馬匹。');
 if(!scene.ready)return toast('馬匹模型還在載入，請稍候。');
 $$('.horse-dialog[open]').forEach(d=>d.close());paddock=true;preview=true;selectedHorse=id;scene.setPaddock(true,id);$('#broadcast-title').textContent=`${roster.find(h=>h.id===id).name} · 馬匹展示`;
 $('#gait-preview').hidden=false;scene.gaitPreview=false;$('#gait-preview').textContent='慢動作跑姿';$('#replay').disabled=true;$('#pause-race').textContent='←';$('#pause-race').ariaLabel='返回出馬表';showPage('race');$('#live-badge').innerHTML='<i></i> PADDOCK';$('#commentary').textContent='拖曳旋轉，檢視馬匹與騎乘姿勢。';$('#remaining').textContent='360° 自由檢視';$('#running-order').innerHTML='';$('#live-standings').innerHTML='<p style="padding:25px;color:#8c9b7e;font-size:11px">拖曳旋轉、滾輪縮放。點左下方 ← 返回出馬表。</p>';$('#phase-name').textContent='馬匹展示';
}
function showDetail(id){
 const h=roster.find(x=>x.id===id);selectedHorse=id;
 $('#horse-detail').innerHTML=`<div class="eyebrow">PADDOCK NOTES · NO.${String(id).padStart(2,'0')}</div><div class="detail-title">${badge(h)}<div><h2>${h.name}</h2><small>${h.zh} · ${h.age}歲 · ${h.style} · ${h.coat==='grey'?'蘆毛':h.coat==='black'?'黑毛':h.coat==='chestnut'?'栗毛':'鹿毛'}</small></div></div><div class="detail-stats"><div class="detail-stat"><span>馬體重 / 增減</span><strong>${h.weight}<small>kg</small></strong><small>(${h.change>0?'+':''}${h.change})</small></div><div class="detail-stat"><span>負重</span><strong>${h.load}<small>kg</small></strong></div><div class="detail-stat"><span>當場狀態</span><strong>${h.condition}<small>/ 100</small></strong></div></div>${[['速度',h.speed],['持久力',h.stamina],['騎師技巧',h.skill],['草地適性',h.fitness]].map(([n,v])=>`<div class="attribute-row"><span>${n}</span><div><i style="width:${v}%"></i></div><strong>${v}</strong></div>`).join('')}<div class="detail-notes"><strong>騎師 ${h.jockey}</strong><br>${h.note}<br>最近三場：${h.last.map(n=>n+' 名').join(' ／ ')} · 單勝遊戲賠率 ${h.odds.toFixed(1)} 倍<br><small>此處為虛構模擬資料，狀態不保證勝負。</small></div><div class="detail-actions"><button class="secondary-button" id="detail-3d">360° 查看馬匹 ↗</button><button class="primary-button" id="detail-select">選擇這匹馬 ＋</button></div>`;
 $('#detail-3d').onclick=()=>openPaddock(id);$('#detail-select').onclick=()=>{choose(id);$('#horse-dialog').close();};$('#horse-dialog').showModal();
}
function info(mode='help'){
 const rules=`<div class="rules-list">${Object.entries(TYPES).map(([,t])=>`<div class="rule-row"><strong>${t.name}<br><small>${t.zh}</small></strong><span>${t.rule}</span></div>`).join('')}</div>`;
 $('#info-content').innerHTML= mode==='credits'?`<div class="eyebrow">CRAFT & CREDITS</div><h2>素材與製作</h2><p>馬匹：Lyndon Daniels（模型與貼圖）、ChadM（骨架），<a href="https://opengameart.org/content/rigged-horse" target="_blank" rel="noopener">Rigged Horse / OpenGameArt</a>，CC0。此版本修復附屬物綁定、調整材質，另製作疾馳動畫。</p><p>松樹、皮革、織物與天空：<a href="https://polyhaven.com/" target="_blank" rel="noopener">Poly Haven</a>，CC0。樹木已製作網頁用細節版本。</p><p>騎師、馬具、看台與賽道為本專案原創 3D 製作；主視覺、草地貼圖使用內建 imagegen 生成。蹄聲使用 Joseph Sardin 的 CC0 真馬草地疾馳錄音，經首尾淡化後循環播放。程式使用 Three.js（MIT）。</p><h3>模擬範圍</h3><p>場景參考日本賽場的視覺元素，並非中山競馬場的測繪重建。馬匹、騎師、能力與賠率皆為虛構。不是 JRA 官方產品。</p><p>票種判定參考 <a href="https://www.jra.go.jp/kouza/beginner/baken/" target="_blank" rel="noopener">JRA 官方馬券說明</a>。遊戲以固定模擬賠率結算，不模擬真實彩池。</p>`:`<div class="eyebrow">A GUIDE TO TURF CLUB</div><h2>${mode==='rules'?'預測玩法':'開始你的賽馬日'}</h2>${mode==='help'?'<p>① 查看馬匹狀態，勾選你喜歡的馬。<br>② 選擇玩法與點數，按「加入預測單」。<br>③ 按「開始觀看」封盤開賽，也可不下注直接觀戰。<br>④ 切換鏡頭、暫停或加速，賽後查看結算與重播。</p>':''}${rules}<p style="margin-top:18px">所有點數皆為遊戲虛擬點數，無現金價值。賠率在加入預測單時固定，回報含本金。重播不重複結算；重新整理未完成的比賽會退還該場點數。</p>${mode==='help'?'<button class="secondary-button" id="reset-balance" style="margin-top:20px">重設遊戲點數為 10,000 PT</button>':''}`;
 const reset=$('#reset-balance');if(reset)reset.onclick=()=>{if(playing)return toast('請在本場結束後重設點數。');balance=10000;tickets=[];persist();updateBalance();renderSlip();$('#info-dialog').close();toast('遊戲點數已重設為 10,000 PT。');};$('#info-dialog').showModal();
}
function startRace(){
 if(settled){showPage('result');return;}if(playing||!scene.ready)return;
 const total=tickets.reduce((s,t)=>s+t.stake,0);if(total>balance)return toast('點數不足，請調整預測單。');
 openingBalance=balance;balance-=total;updateBalance();persist({pending:{before:openingBalance,total}});
 raceSeed=crypto.getRandomValues(new Uint32Array(1))[0];race=new Race(roster,raceSeed);results=null;settled=false;playing=true;paused=false;replaying=false;preview=false;paddock=false;countdown=3;speed=1;accumulator=0;lastLeader=0;lastSector=-1;
 scene.setPaddock(false);scene.setCamera('auto');scene.selected=selectedHorse;updateCameraButtons('auto');$('#broadcast-title').textContent='秋風錦標賽';$('#speed').textContent='1×';$('#pause-race').textContent='Ⅱ';$('#pause-race').ariaLabel='暫停比賽';$('#countdown').hidden=false;$('#countdown').textContent='3';$('#show-results').hidden=true;$('#replay').disabled=true;$('#live-badge').innerHTML='<i></i> LIVE <span>SIMULATION</span>';
 $('#watch-tickets').textContent=tickets.length?`${tickets.length} 注預測已封盤 · 合計 ${fmt(total)} PT · 享受比賽吧。`:'本場為純觀戰模式 · 享受每一次衝刺。';
 showPage('race');renderSlip();renderTicket();audio.bell();
}
function finishRace(){
 if(settled)return;playing=false;settled=true;results=settleTickets(tickets,race.finish,roster);const payout=results.reduce((s,t)=>s+t.payout,0);balance+=payout;persist();updateBalance();audio.bell();audio.silence();$('#show-results').hidden=false;$('#replay').disabled=false;$('#pause-race').textContent='↺';$('#pause-race').ariaLabel='播放最後直線重播';$('#live-badge').innerHTML='<i></i> 確定 <span>OFFICIAL RESULT</span>';
 $('#commentary').textContent=`名次確定。${race.finish[0].id} 號 ${race.finish[0].name}、漂亮地贏得勝利！`;setTimeout(()=>{if(settled&&!replaying)finishExperience.review();},500);$('#phase-name').textContent='名次確定';$('#remaining').textContent='FINISH';$('#countdown').hidden=true;renderSlip();renderRows();renderTicket();
}
function startReplay(){
 if(!race?.finished)return;replaying=true;paused=false;preview=false;paddock=false;scene.setPaddock(false);scene.setCamera('auto');updateCameraButtons('auto');replayTime=Math.max(0,race.finish[0].finishTime-24);speed=.5;$('#speed').textContent='0.5×';$('#pause-race').textContent='Ⅱ';$('#pause-race').ariaLabel='暫停重播';$('#live-badge').innerHTML='<i></i> REPLAY <span>NO NEW BETS</span>';
 $('#show-results').hidden=false;showPage('race');$('#broadcast-title').textContent='秋風錦標賽 · REPLAY';toast('重播最後直線，點數不會再次結算。');
}
function nextRace(){
 if(playing)return;round++;persist();roster=createRoster(20260915+(round-1)*104729);race=null;results=null;settled=false;replaying=false;paused=false;picks=[];tickets=[];type='win';paddock=false;preview=false;selectedHorse=1;scene.roster=roster;scene.setPaddock(false);$('#broadcast-title').textContent='秋風錦標賽';$('#replay').disabled=true;$('#show-results').hidden=true;updateBalance();renderRows();renderTicket();renderSlip();showPage('entry');
}
function renderResults(){
 if(!race?.finished){$('#result-page').innerHTML='<div class="results-empty"><div class="eyebrow">THE FINISH IS STILL AHEAD</div><h2>賽事尚未開始</h2><p>完成一場比賽後，這裡將公布所有馬匹的名次與競猜結果。</p><button class="primary-button" id="back-entry">前往出馬表 →</button></div>';$('#back-entry').onclick=()=>showPage('entry');return;}
 const finish=race.finish,spend=tickets.reduce((s,t)=>s+t.stake,0),payout=results.reduce((s,t)=>s+t.payout,0),net=payout-spend;
 const podium=[finish[1],finish[0],finish[2]];
 $('#result-page').innerHTML=`<div class="results-top"><div class="eyebrow">THE AUTUMN MEETING · OFFICIAL RESULT</div><h1>這一刻，榮耀屬於你。</h1><p>秋風錦標賽 · 草地 2,200m · 第 ${round} 場 · 名次確定</p></div><div class="result-podium">${podium.map((h,i)=>`<article class="podium-card ${i===1?'winner':''}"><div class="podium-rank">${i===1?'1st':i===0?'2nd':'3rd'}</div>${badge(h)}<h2>${h.name}</h2><p>${h.jockey} · ${h.style}</p><strong>${formatTime(h.finishTime)}</strong></article>`).join('')}</div><div class="result-summary"><div><span>本場預測</span><strong>${fmt(spend)}<small>PT</small></strong></div><div><span>命中回報</span><strong>${fmt(payout)}<small>PT</small></strong></div><div><span>本場淨變化</span><strong>${net>=0?'+':'−'}${fmt(Math.abs(net))}<small>PT</small></strong></div></div><div class="result-columns"><section class="panel"><div class="section-heading"><h2>完整名次<small>完整名次</small></h2><span class="tag">確定</span></div>${finish.map((h,i)=>`<div class="finish-row"><small>${i+1}</small>${badge(h)}<div><div class="horse-name">${h.name}</div><div class="horse-sub">${h.jockey}</div></div><span>${formatTime(h.finishTime)}</span><small>${i===0?'WINNER':'+'+(h.finishTime-finish[0].finishTime).toFixed(2)+'s'}</small></div>`).join('')}</section><section class="panel"><div class="section-heading"><h2>競猜結果<small>預測結算</small></h2><span class="tag">${results.filter(t=>t.won).length} / ${tickets.length} 命中</span></div>${results.length?results.map(t=>`<div class="settled-ticket ${t.won?'won':''}"><strong>${TYPES[t.type].name} · ${t.picks.join(TYPES[t.type].ordered?' → ':' − ')} ${t.won?'✓ 命中':'未命中'}</strong><span class="payout">${fmt(t.payout)} PT</span><small>${fmt(t.stake)} PT × ${t.odds.toFixed(1)} · 回報含本金</small></div>`).join(''):'<p style="padding:30px 22px;color:#95a587;font-size:11px">本場純觀戰。下一場，選出心中的贏家吧。</p>'}<div class="detail-notes" style="margin:20px">目前點數：${fmt(balance)} PT<br>每場比賽僅結算一次，重播不影響點數。</div></section></div><div class="result-actions"><button class="secondary-button" id="result-replay">↺ 重播最後直線</button><button class="primary-button" id="next-race"><span>前往下一場</span><span>→</span></button></div>`;
 const extra=document.createElement('div');extra.className='result-experiences';extra.innerHTML='<button class="secondary-button" id="result-photo">終點攝影審視</button><button class="secondary-button" id="result-award">冠軍頒獎典禮</button>';$('#result-page .result-podium').after(extra);$('#result-photo').onclick=()=>finishExperience.review();$('#result-award').onclick=()=>finishExperience.ceremony();
 $('#result-replay').onclick=startReplay;$('#next-race').onclick=nextRace;
}
function updateCameraButtons(mode){$$('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===mode));}
function mapPosition(distance,lane=11){
 const el=$('.course-map');return projectMap(distance,lane,el.clientWidth,el.clientHeight);
}
function renderRaceHUD(runners,time){
 if(paddock)return;
 const order=replaying?[...runners].sort((a,b)=>b.distance-a.distance):race?race.ranking:runners;
 const lead=order[0];if(!lead)return;const remaining=Math.max(0,Math.ceil((DISTANCE-lead.distance)/10)*10);$('#remaining').textContent=remaining?`剩餘 ${fmt(remaining)}m`:'FINISH';$('#race-timer').textContent=formatTime(time);$('#race-progress-fill').style.width=`${Math.min(100,lead.distance/DISTANCE*100)}%`;
 $('#camera-label').textContent=scene.activeCamera;
 $('#running-order').innerHTML='<span class="order-label">通過順位</span>'+order.slice(0,6).map((r,i)=>{const h=roster.find(h=>h.id===r.id);return `<div class="order-chip"><small>${i+1}</small>${badge(h)}<span class="chip-name">${h.name}</span></div>`;}).join('');
 $('#live-standings').innerHTML=order.slice(0,6).map((r,i)=>{const h=roster.find(h=>h.id===r.id);return `<div class="live-standing-row"><small>${String(i+1).padStart(2,'0')}</small>${badge(h)}<strong>${h.name}</strong><div class="energy-bar" title="剩餘體力 ${Math.round((r.energy??1)*100)}%"><span style="width:${Math.round((r.energy??1)*100)}%"></span></div><small>${i===0?'領先':`${Math.max(0,(lead.distance-r.distance)).toFixed(1)}m`}</small></div>`;}).join('');
 const goal=mapPosition(0);$('.map-goal').style.left=goal.x+'px';$('.map-goal').style.top=(goal.y-7)+'px';
 $('#map-markers').innerHTML=runners.map(r=>{const h=roster.find(h=>h.id===r.id),p=mapPosition(r.distance,r.lane);return `<span class="map-dot" style="--frame:${h.color};--number-ink:${ink(h.frame)};left:${p.x}px;z-index:${Math.floor(r.distance)+1};top:${p.y}px">${r.id}</span>`;}).join('');
 if(playing&&countdown<=0){
  const sector=Math.floor(lead.distance/400);const leader=roster.find(h=>h.id===lead.id);
  if(lead.distance>=DISTANCE){$('#commentary').textContent='領先馬匹衝線！等待全部馬匹完成賽程。';$('#phase-name').textContent='入線確認中';}
  else if(sector!==lastSector){lastSector=sector;$('#commentary').textContent=sector===0?'比賽開始！12 匹馬一同衝出閘門。':sector>=5?'最後直線！全力衝刺，奔向終點！':sector>=4?'勝負關鍵，各馬加速爭奪領先！':sector>=2?'進入對面直線，各馬調整步調保留體力。':'進入第一彎道，前方馬群持續爭位。';$('#phase-name').textContent=sector===0?'起跑':sector>=5?'最後直線':sector>=4?'關鍵衝刺':'比賽進行中';}
  else if(lastLeader&&lead.id!==lastLeader&&time>8){$('#commentary').textContent=`${lead.id} 號 ${leader.name}、取得領先！`;}
  lastLeader=lead.id;
 }
}
function updateMarkers(){
 if(paddock){$('#horse-labels').innerHTML='';return;}
 const ids=new Set(tickets.flatMap(t=>TYPES[t.type].frame?roster.filter(h=>t.picks.includes(h.frame)).map(h=>h.id):t.picks));
 const front=scene.currentRunners?[...scene.currentRunners].sort((a,b)=>b.distance-a.distance).slice(0,ids.size?1:3).map(h=>h.id):[];
 $('#horse-labels').innerHTML=roster.filter(h=>ids.has(h.id)||front.includes(h.id)).map(h=>{const p=scene.projectHorse(h.id);return p?`<span class="horse-label ${ids.has(h.id)?'picked':''}" style="--frame:${h.color};--number-ink:${ink(h.frame)};left:${p.x}%;top:${p.y}%">${h.id}</span>`:'';}).join('');
}
// Events are delegated so table sorting and state redraws preserve keyboard support.
$('#runner-rows').addEventListener('click',e=>{const detail=e.target.closest('[data-detail]');if(detail){e.stopPropagation();showDetail(Number(detail.dataset.detail));return;}const row=e.target.closest('[data-horse]');if(row)choose(Number(row.dataset.horse));});
$('#bet-types').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(!b||playing||settled)return;type=b.dataset.type;picks=[];renderTicket();renderRows();});
$('#frame-picker').onclick=e=>{const b=e.target.closest('[data-frame]');if(b)selectFrame(Number(b.dataset.frame));};
$('#pick-slots').onclick=e=>{const b=e.target.closest('[data-remove-pick]');if(b){picks.splice(Number(b.dataset.removePick),1);renderTicket();renderRows();}};
$('#reset-picks').onclick=()=>{picks=[];renderRows();renderTicket();};$('#sort').onchange=renderRows;
$('#stake').oninput=renderTicket;$('#stake').onblur=()=>{const value=Number($('#stake').value);if(!Number.isFinite(value)||value<100)$('#stake').value=100;else $('#stake').value=Math.min(10000,Math.round(value/100)*100);renderTicket();};
$('#stake-minus').onclick=()=>{$('#stake').value=Math.max(100,Number($('#stake').value)-100);renderTicket();};$('#stake-plus').onclick=()=>{$('#stake').value=Math.min(10000,Number($('#stake').value)+100);renderTicket();};
$$('[data-stake]').forEach(b=>b.onclick=()=>{$('#stake').value=b.dataset.stake;renderTicket();});$('#add-ticket').onclick=addTicket;
$('#ticket-list').onclick=e=>{const b=e.target.closest('[data-remove-ticket]');if(b&&!playing&&!settled){tickets=tickets.filter(t=>t.id!==Number(b.dataset.removeTicket));renderSlip();}};
$('#gait-preview').onclick=()=>{scene.gaitPreview=!scene.gaitPreview;$('#gait-preview').textContent=scene.gaitPreview?'返回站姿':'慢動作跑姿';};
$('#start-race').onclick=startRace;$('#help').onclick=()=>info();$('#rules-open').onclick=()=>info('rules');$('#credits-open').onclick=()=>info('credits');$('#paddock-open').onclick=()=>openPaddock();
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$$('.nav').forEach(b=>b.onclick=()=>{if(b.dataset.page==='race'&&!playing&&!race){paddock=false;scene.setPaddock(false);$('#broadcast-title').textContent='秋風錦標賽 · 賽前預覽';}if(b.dataset.page==='entry'){paddock=false;scene.setPaddock(false);}showPage(b.dataset.page);});
$('#pause-race').onclick=()=>{if(paddock||preview){paddock=false;scene.setPaddock(false);showPage('entry');return;}if(race?.finished&&!replaying){startReplay();return;}if(!race)return;paused=!paused;$('#pause-race').textContent=paused?'▶':'Ⅱ';$('#pause-race').ariaLabel=paused?'繼續播放':'暫停播放';};
$('#speed').onclick=()=>{speed=speed===.5?1:speed===1?2:speed===2?4:1;$('#speed').textContent=`${speed}×`;};
$('#camera-controls').onclick=e=>{const b=e.target.closest('[data-camera]');if(!b)return;if(paddock){paddock=false;scene.setPaddock(false);}scene.setCamera(b.dataset.camera);updateCameraButtons(b.dataset.camera);};
$('#replay').onclick=startReplay;$('#show-results').onclick=()=>{replaying=false;audio.silence();showPage('result');};
$('#sound').onclick=async()=>{$('#sound').disabled=true;try{const enabled=await audio.toggle();$('#sound').classList.toggle('on',enabled);$('#sound').setAttribute('aria-pressed',String(enabled));$('#sound').ariaLabel=enabled?'關閉音效':'開啟音效';toast(enabled?'音效已開啟':'音效已關閉');}catch{toast('音效載入失敗，請再試一次。');}finally{$('#sound').disabled=false;}};
$('#fullscreen').onclick=async()=>{const el=$('.broadcast-frame');try{if(document.fullscreenElement)await document.exitFullscreen();else if(el.requestFullscreen)await el.requestFullscreen();else el.classList.toggle('expanded');}catch{el.classList.toggle('expanded');}scene.resize();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('.broadcast-frame').classList.remove('expanded');if(e.code==='Space'&&page==='race'&&!$('dialog[open]')&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();$('#pause-race').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.silence();});
let scene,finishExperience;
try{scene=new RacingScene($('#race-stage'),roster,p=>{$('#load-status span').style.width=`${p}%`;if(p===100){$('#load-status').hidden=true;$('#loading-overlay').hidden=true;renderSlip();}});scene.loadPromise.catch(error=>{console.error(error);$('#start-race').disabled=true;$('#start-race').innerHTML='<span>素材載入失敗，請重新整理</span>';$('#loading-overlay').hidden=false;$('#loading-overlay').textContent='素材載入失敗。請確認本機伺服器仍在運行。';$('#start-note').textContent='請確認所有本地模型檔案存在，詳細原因見瀏覽器主控台。';});}catch(error){console.error(error);$('#start-note').textContent='此裝置無法啟用 WebGL 3D，請使用支援 WebGL 的瀏覽器。';}
finishExperience=new FinishExperience(scene,()=>race,()=>{replaying=false;showPage('result');});
updateBalance();renderRows();renderTicket();renderSlip();if(recovered)setTimeout(()=>toast('已退還上一場未完成比賽的預測點數。'),600);
let prev=performance.now(),idleTime=0;
function loop(now){
 requestAnimationFrame(loop);const dt=Math.min((now-prev)/1000,.08);prev=now;if(!scene?.ready||document.hidden)return;
 idleTime+=dt;if(page!=='race')return;let runners;
 if(paddock||!race){runners=roster.map((h,i)=>({id:h.id,distance:0,lane:1.3+i*1.27,velocity:0,energy:1}));scene.update(runners,idleTime,dt,false);if(!paddock)renderRaceHUD(runners,0);}
 else if(replaying){if(!paused)replayTime+=dt*speed;if(replayTime>=race.time){replayTime=race.time;replaying=false;$('#live-badge').innerHTML='<i></i> REPLAY END';$('#pause-race').textContent='↺';}runners=race.sample(replayTime);scene.update(runners,replayTime,paused?0:dt*speed,true);}
 else{
  if(playing&&!paused){if(countdown>0){countdown-=dt;$('#countdown').textContent=countdown>0?String(Math.ceil(countdown)):'START';if(countdown<=0){audio.bell();setTimeout(()=>$('#countdown').hidden=true,650);}}else{accumulator+=dt*speed;while(accumulator>=1/60&&!race.finished){race.step(1/60);accumulator-=1/60;}if(race.finished)finishRace();}}
  runners=race.runners;scene.update(runners,race.time,playing&&!paused?dt*speed:0,playing&&countdown<=0||race.finished);
 }
 scene.render();finishExperience.update(dt);uiTimer+=dt;if(uiTimer>.13){uiTimer=0;if(race&&!paddock)renderRaceHUD(runners,replaying?replayTime:race.time);updateMarkers();}
 audio.update(dt,(playing||replaying)&&!paused&&countdown<=0,!race?0:Math.min(1,Math.max(...runners.map(h=>h.distance))/DISTANCE),speed,runners);
}
requestAnimationFrame(loop);
// Read-only integration diagnostics; production gameplay still uses the same simulation path.
window.__turf={get state(){return {page,balance,round,type,picks:[...picks],tickets:structuredClone(tickets),playing,paused,countdown,settled,replaying,speed,time:race?.time??0,finish:race?.finish.map(h=>({id:h.id,time:h.finishTime}))??[],results,assetReady:scene?.ready,assetStats:scene?.assetStats,render:scene?.renderer.info.render};}};
