import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const base=process.env.TEST_URL||'http://localhost:8770';const issues=[],report={};
const capture=(page,name)=>page.screenshot({path:`artifacts/${name}.png`,fullPage:true});
function observe(page){page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});page.on('response',r=>{if(r.status()>=400)issues.push(`${r.status()} ${r.url()}`);});}
async function ready(page){await page.goto(base);await page.waitForFunction(()=>window.__turf?.state.assetReady,null,{timeout:60000});}
async function state(page){return page.evaluate(()=>window.__turf.state);}
async function finishFlow(page,prefix){
 await page.locator('#photo-confirm').waitFor({timeout:10000});
 const first=await page.locator('#finish-photo').getAttribute('src');assert.ok(first.startsWith('data:image/png;base64,'));
 await page.locator('#photo-prev').click();assert.notEqual(await page.locator('#finish-photo').getAttribute('src'),first);
 await capture(page,prefix+'-photo-review');await page.locator('#photo-confirm').click();await capture(page,prefix+'-ceremony');
 await page.locator('#lift-cup').click();await page.locator('#paper-done').waitFor({timeout:12000});await capture(page,prefix+'-newspaper');
 assert.ok(await page.locator('.race-newspaper').textContent());
 const downloadPromise=page.waitForEvent('download');await page.locator('#paper-save').click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('冠軍日報.html'));
 await page.locator('#paper-done').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const page=await context.newPage();observe(page);await ready(page);
 assert.equal(await page.locator('#runner-rows tr').count(),12);await capture(page,'desktop-entry');
 await page.locator('[data-detail="7"]').click();assert.equal(await page.locator('#horse-dialog').evaluate(d=>d.open),true);await capture(page,'horse-status');await page.locator('#detail-3d').click();await page.waitForTimeout(900);await capture(page,'desktop-paddock');await page.locator('#gait-preview').click();await page.waitForTimeout(300);await capture(page,'desktop-slow-gallop');assert.equal(await page.locator('#gait-preview').innerText(),'返回站姿');await page.locator('#gait-preview').click();assert.equal((await state(page)).page,'race');await page.locator('#pause-race').click();
 await page.locator('[data-type="exacta"]').click();await page.locator('[data-horse="7"] input').click();await page.locator('[data-horse="3"] input').click();assert.deepEqual((await state(page)).picks,[7,3]);await page.locator('#add-ticket').click();
 await page.locator('[data-type="bracket"]').click();await page.locator('[data-frame="5"]').click();await page.locator('[data-frame="5"]').click();assert.deepEqual((await state(page)).picks,[5,5]);await page.locator('#add-ticket').click();
 await page.locator('[data-type="place"]').click();for(let id=1;id<=12;id++){await page.locator(`[data-horse="${id}"] input`).click();await page.locator('#add-ticket').click();}
 let s=await state(page);assert.equal(s.tickets.length,14);const total=s.tickets.reduce((sum,t)=>sum+t.stake,0);assert.equal(total,1400);
 await page.locator('#start-race').click();assert.equal((await state(page)).balance,8600);await page.waitForFunction(()=>window.__turf.state.time>1);await capture(page,'desktop-start');await page.locator('#sound').click();await page.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='true');
 await page.locator('#pause-race').click();const stopped=(await state(page)).time;await page.waitForTimeout(350);assert.equal((await state(page)).time,stopped);await page.locator('#pause-race').click();
 await page.locator('#speed').click();await page.locator('#speed').click();assert.equal((await state(page)).speed,4);
 for(const camera of ['side','aerial','follow','finish','auto']){await page.locator(`[data-camera="${camera}"]`).click();await page.waitForTimeout(550);await capture(page,`desktop-camera-${camera}`);}
 await page.waitForFunction(()=>window.__turf.state.time>102,null,{timeout:60000});await capture(page,'desktop-final-straight');await page.waitForFunction(()=>window.__turf.state.settled,null,{timeout:30000});
 s=await state(page);assert.equal(s.finish.length,12);assert.equal(new Set(s.finish.map(h=>h.id)).size,12);assert.ok(s.results.filter(t=>t.won).length>=3);const expectedBalance=10000-total+s.results.reduce((sum,t)=>sum+t.payout,0);assert.equal(s.balance,expectedBalance);
 report.desktop={balance:s.balance,finish:s.finish,results:s.results,render:s.render,assets:s.assetStats};await capture(page,'desktop-finish');await finishFlow(page,'desktop');await capture(page,'desktop-results');
 await page.locator('#result-replay').click();await page.waitForTimeout(600);assert.equal((await state(page)).balance,expectedBalance);assert.equal((await state(page)).replaying,true);await capture(page,'desktop-replay');await page.locator('#show-results').click();await page.locator('#next-race').click();
 s=await state(page);assert.equal(s.round,2);assert.equal(s.tickets.length,0);assert.equal(s.balance,expectedBalance);
 await page.locator('[data-horse="2"] input').click();await page.locator('#add-ticket').click();await page.locator('#start-race').click();assert.equal((await state(page)).balance,expectedBalance-100);await ready(page);assert.equal((await state(page)).balance,expectedBalance);report.desktop.reloadRefund=true;
 await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const phone=await mobile.newPage();observe(phone);await ready(phone);
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(phone,'mobile-entry');await phone.locator('[data-type="trifecta"]').tap();for(const id of [7,3,10])await phone.locator(`[data-horse="${id}"] input`).tap();assert.deepEqual((await state(phone)).picks,[7,3,10]);await phone.locator('#add-ticket').tap();await capture(phone,'mobile-ticket');
 await phone.locator('#sound').tap();await phone.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='true');assert.equal(await phone.locator('#sound').getAttribute('aria-pressed'),'true');await phone.locator('#sound').tap();
 await phone.locator('#start-race').tap();await phone.locator('#speed').tap();await phone.locator('#speed').tap();await phone.waitForFunction(()=>window.__turf.state.time>5);await capture(phone,'mobile-race');assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await phone.locator('[data-camera="aerial"]').tap();await phone.waitForTimeout(400);await capture(phone,'mobile-aerial');await phone.locator('[data-camera="auto"]').tap();
 await phone.waitForFunction(()=>window.__turf.state.settled,null,{timeout:70000});s=await state(phone);assert.equal(s.finish.length,12);assert.equal(s.balance,9900+s.results.reduce((a,t)=>a+t.payout,0));await finishFlow(phone,'mobile');await capture(phone,'mobile-results');assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.mobile={finish:s.finish,balance:s.balance,render:s.render,touch:true,viewport:'390×844'};
 await mobile.close();assert.deepEqual(issues,[]);report.browserErrors=issues;await writeFile('artifacts/browser-report.json',JSON.stringify(report,null,2));console.log('Browser verification passed:',JSON.stringify({desktop:report.desktop.balance,mobile:report.mobile.balance,errors:issues}));
}finally{await browser.close();}
