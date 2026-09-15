import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const url=process.env.TEST_URL||'http://localhost:8772/turfClub/';
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(url);await page.waitForFunction(()=>window.__turf?.state.assetReady,null,{timeout:90000});
  assert.equal(await page.locator('#runner-rows tr').count(),12);
  assert.ok(await page.locator('.hero').evaluate(e=>getComputedStyle(e).backgroundImage.includes('/turfClub/public/assets/')));
  await page.locator('#sound').click();await page.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='true');
  await page.locator('#start-race').click();await page.waitForFunction(()=>window.__turf.state.time>2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/pages-${width}.png`});assert.deepEqual(errors,[]);console.log(`${width}px: models, styles, audio and race loaded at ${url}`);await page.close();
 }
}finally{await browser.close();}
