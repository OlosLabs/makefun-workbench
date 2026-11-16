import {chromium} from '/tmp/workbench-test-tools/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/snap/bin/chromium',args:['--no-sandbox']});
const shots=[];mkdirSync('screenshots',{recursive:true});
for(const [file,route,viewport]of [['1-board.jpg','#/',{width:1280,height:900}],['2-bounty.jpg','#/bounty/makefun-frontend-01',{width:1280,height:900}],['3-leaderboard.jpg','#/leaderboard/makefun-frontend-01',{width:390,height:844}]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4178/'+route);await page.waitForFunction(()=>window.__shotReady,{timeout:45000});
 assert.equal(await page.locator('.empty').count(),0,'Live data required for '+file);
 await page.evaluate(()=>{document.documentElement.dataset.theme='light';});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'screenshots/'+file,type:'jpeg',quality:85,fullPage:false});
 const bytes=statSync('screenshots/'+file).size;assert.ok(bytes<=262144);
 shots.push({file:'screenshots/'+file,route,viewport,bytes,capturedAt:new Date().toISOString(),source:'Live make.fun public API; Chromium browser render; no response interception; unedited viewport screenshot'});
 console.log('CAPTURE',file,bytes,await page.locator('h1').innerText());await page.close();
}
writeFileSync('shots.json',JSON.stringify(shots,null,2)+'\n');await browser.close();
