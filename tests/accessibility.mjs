import {chromium} from '/tmp/workbench-test-tools/node_modules/playwright/index.mjs';
import AxeBuilder from '/tmp/workbench-test-tools/node_modules/@axe-core/playwright/dist/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/snap/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();let checks=0;
for(const route of ['#/','#/bounty/makefun-frontend-01','#/leaderboard/makefun-frontend-01','#/profile/nightshift-labs']){
 await page.goto('http://127.0.0.1:4178/'+route);await page.waitForFunction(()=>window.__shotReady,{timeout:45000});
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();console.log(route,theme,JSON.stringify(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))));assert.equal(result.violations.length,0);checks++;}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
}
await page.goto('http://127.0.0.1:4178');await page.waitForFunction(()=>window.__shotReady);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'content');checks+=2;
console.log('Accessibility/live mobile checks:',checks);await browser.close();
