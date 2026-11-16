import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '../app/api.js';
import {route,safeURL,leaderboardRows,metric,accepting} from '../app/core.js';
test('bounded stale fallback expires and recovers after network failure',async()=>{
 let time=1000,offline=false,calls=0;
 const c=createClient({ttl:5,stale:100,now:()=>time,fetcher:async()=>{calls++;if(offline)throw Error('offline');return new Response('{"version":'+calls+'}');}});
 await c.get('/competitions');time+=10;offline=true;assert.equal((await c.get('/competitions')).version,1);assert.equal(c.state.stale,true);
 time+=101;await assert.rejects(c.get('/competitions'),/offline/);offline=false;assert.equal((await c.get('/competitions')).version,4);assert.equal(c.state.stale,false);
});
for(const status of [429,503])test(`${status} honors Retry-After without repeated fetches`,async()=>{
 let time=0,calls=0;const c=createClient({now:()=>time,fetcher:async()=>{calls++;return calls===1?new Response('',{status,headers:{'Retry-After':'2'}}):new Response('{"ok":true}');}});
 await assert.rejects(c.get('/competitions'),/Retry after/);await assert.rejects(c.get('/competitions'),/retry after/);assert.equal(calls,1);time=2001;assert.equal((await c.get('/competitions')).ok,true);
});
test('cache evicts oldest entries and rejects null data',async()=>{
 const c=createClient({max:2,fetcher:async u=>new Response(u.endsWith('/null')?'null':'{}')});
 for(const id of ['one','two','three'])await c.get('/profiles/'+id);assert.equal(c.size,2);await assert.rejects(c.get('/profiles/null'),/malformed/);
});
test('routes reject injection and excess segments',()=>{for(const p of ['#/bounty/%3Cscript%3E','#/profile/../x','#/bounty/good/extra'])assert.equal(route(p).kind,'invalid');assert.equal(route('#/bounty/good-01').id,'good-01');});
test('URL policy blocks executable schemes and credentials',()=>{for(const u of ['javascript:alert(1)','data:text/html,x','https://user:pass@example.com'])assert.equal(safeURL(u),null);assert.equal(safeURL('/bounty/example'),'https://make.fun/bounty/example');});
test('compact rows preserve primary metric and unknown metrics stay unknown',()=>{const rows=leaderboardRows({rank_key:'speed',entries:[{values:{speed:2}}],rest:[{value:3,display:'3'}]});assert.equal(rows.length,2);assert.equal(metric(rows[1],{key:'speed'}),'3');assert.equal(metric(rows[1],{key:'cost'}),'—');assert.equal(metric({values:{rate:950000}},{key:'rate',source:'performance.judge.win_rate_micro'}),'95.00%');});
test('future opening date prevents accepting entries',()=>assert.equal(accepting({status:'open',deadline:'2099-01-01',opensAt:'2098-01-01'}),false));
