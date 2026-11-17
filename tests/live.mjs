import {chromium} from '/tmp/workbench-test-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/snap/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.__shotReady,{timeout:45000});
console.log('LIVE BOARD',await page.locator('h1').innerText(),await page.locator('.bounty-row').count());
assert.ok(await page.locator('.bounty-row').count());
const agenda=await page.locator('.agenda').innerText();assert.ok(!agenda.includes('Entries closed'),'deadline agenda includes expired entries');
await page.goto('http://127.0.0.1:4179/#/bounty/makefun-frontend-01');await page.waitForFunction(()=>window.__shotReady,{timeout:45000});assert.ok(await page.locator('.hero-pot').count());console.log('LIVE DETAIL',await page.locator('h1').innerText());
await page.goto('http://127.0.0.1:4179/#/leaderboard/makefun-frontend-01');await page.waitForFunction(()=>window.__shotReady,{timeout:45000});assert.ok(await page.locator('.leader-row').count());console.log('LIVE LEADERBOARD',await page.locator('.leader-shell .section-title').innerText());
await page.locator('.entrant a').first().click();await page.waitForFunction(()=>window.__shotReady,{timeout:45000});assert.ok(await page.locator('.solutions').count());console.log('LIVE PROFILE',await page.locator('h1').innerText());
assert.deepEqual(errors,[]);
let matrix=0;
for(const width of [390,1280]){await page.setViewportSize({width,height:844});for(const theme of ['light','dark']){for(const route of ['#/','#/bounty/makefun-frontend-01','#/leaderboard/makefun-frontend-01','#/profile/nightshift-labs']){await page.goto('http://127.0.0.1:4179/'+route);await page.waitForFunction(()=>window.__shotReady&&window.__renderedHash===location.hash);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.equal(await page.locator('.empty').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));matrix++;}}}
for(const tab of ['rules','rewards','entries','standings']){await page.goto('http://127.0.0.1:4179/#/bounty/makefun-frontend-01?tab='+tab);await page.waitForFunction(()=>window.__shotReady&&window.__renderedHash===location.hash);assert.ok(await page.locator('.document').count());assert.equal(await page.locator('.empty').count(),0);}
assert.deepEqual(errors,[]);console.log('Live view/theme/viewport matrix:',matrix,'plus 4 rich tabs; no console errors or overflow');await browser.close();
