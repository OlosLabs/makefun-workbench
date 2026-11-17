import test from 'node:test';
import assert from 'node:assert/strict';

const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };

test('GET client shares pending reads and conditionally revalidates 304', async()=>{
 const {createClient}=await import('../app/api.js'); let calls=0,headers;
 const client=createClient({ttl:0,fetcher:async(u,o)=>{calls++;headers=o.headers; await new Promise(r=>setTimeout(r,10)); return calls===1?new Response('{"items":[]}',{headers:{ETag:'"one"'}}):new Response(null,{status:304});}});
 const [a,b]=await Promise.all([client.get('/competitions'),client.get('/competitions')]); assert.deepEqual(a,b);assert.equal(calls,1);
 assert.deepEqual(await client.get('/competitions'),a);assert.equal(headers['If-None-Match'],'"one"');
});

test('tel: getWithMeta exposes the honored server timestamp for freshness', async()=>{
 const {createClient}=await import('../app/api.js');
 let now=0;
 const client=createClient({now:()=>now,ttl:0,fetcher:async()=>new Response('{"n":1}',{headers:{Date:new Date(5_000_000).toUTCString(),ETag:'"x"'}})});
 const first=await client.getWithMeta('/competitions'); now=100;
 const cached=await client.getWithMeta('/competitions');
 assert.equal(first.at,5_000_000,'the Date header wins over the local clock');
 assert.equal(cached.at,5_000_000,'a cached read keeps the server stamp');
 assert.equal(client.state.checkedAt,5_000_000);
});

test('a 304 revalidation refreshes the timestamp without needing a body', async()=>{
 const {createClient}=await import('../app/api.js');
 let now=0,calls=0;
 const client=createClient({now:()=>now,ttl:10,fetcher:async()=>{calls++;return calls===1?new Response('{"v":1}',{headers:{ETag:'"a"',Date:new Date(10_000).toUTCString()}}):new Response(null,{status:304,headers:{Date:new Date(20_000).toUTCString()}});}});
 const first=await client.getWithMeta('/competitions');
 assert.equal(first.at,10_000);
 now=50;
 const second=await client.getWithMeta('/competitions');
 assert.equal(second.status,304);
 assert.equal(second.at,20_000,'a 304 carries the server stamp of the revalidation');
 assert.equal(calls,2);
});

test('an older response cannot regress newer cached data', async()=>{
 const {createClient}=await import('../app/api.js');
 let now=1_000,calls=0;
 const client=createClient({now:()=>now,ttl:0,fetcher:async()=>{
   calls++;
   if(calls===1) return new Response(JSON.stringify({version:1}),{headers:{Date:new Date(9_000).toUTCString()}});
   return new Response(JSON.stringify({version:2}),{headers:{Date:new Date(8_000).toUTCString()}});
 }});
 const first=await client.getWithMeta('/competitions');
 assert.equal(first.data.version,1);
 assert.equal(first.at,9_000);
 now=2_000;
 const second=await client.getWithMeta('/competitions');
 assert.equal(second.data.version,1,'an older publication must not replace newer data');
 assert.equal(second.superseded,true);
 assert.equal(second.at,9_000,'the newer stamp is retained');
 assert.equal(client.state.checkedAt,9_000);
});

test('concurrent requests for one path issue exactly one fetch (deterministic race)', async()=>{
 const {createClient}=await import('../app/api.js');
 const gate=defer();
 let calls=0;
 const client=createClient({ttl:0,fetcher:async()=>{calls++;await gate.promise;return new Response('{"items":[1]}',{headers:{Date:new Date(1_000).toUTCString()}});}});
 const reads=[client.get('/competitions'),client.get('/competitions'),client.get('/competitions'),client.get('/competitions')];
 await Promise.resolve();
 assert.equal(calls,1,'the first read started alone and the rest joined its pending task');
 gate.resolve();
 const results=await Promise.all(reads);
 assert.deepEqual(results.map(r=>r.items[0]),[1,1,1,1]);
 assert.equal(calls,1);
});

test('a failing read drains the pending map so a retry can fetch again', async()=>{
 const {createClient}=await import('../app/api.js');
 const gate=defer();
 let calls=0;
 const client=createClient({ttl:0,stale:0,fetcher:async()=>{
   calls++;
   if(calls===1){await gate.promise;throw new Error('offline');}
   return new Response('{"ok":true}');
 }});
 const failed=client.get('/competitions');
 const joined=client.get('/competitions');
 gate.resolve();
 await assert.rejects(failed,/offline/);
 await assert.rejects(joined,/offline/);
 assert.equal(calls,1,'a rejection ends the shared read');
 const recovered=await client.get('/competitions');
 assert.equal(recovered.ok,true);
 assert.equal(calls,2);
});

test('a stale window returns cached bytes on hard failure then recovers', async()=>{
 const {createClient}=await import('../app/api.js');
 let now=0,offline=false,calls=0;
 const client=createClient({now:()=>now,ttl:0,stale:100,fetcher:async()=>{calls++;if(offline)throw new Error('offline');return new Response('{"v":'+calls+'}',{headers:{Date:new Date(now).toUTCString()}});}});
 const first=await client.getWithMeta('/competitions');
 assert.equal(first.data.v,1);
 now=10;offline=true;
 const fallback=await client.getWithMeta('/competitions');
 assert.equal(fallback.data.v,1,'stale bytes survive an offline read');
 assert.equal(fallback.stale,true);
 assert.equal(client.state.stale,true);
 now=111;
 await assert.rejects(client.get('/competitions'),/offline/,'the stale window is bounded');
 offline=false;
 const fresh=await client.get('/competitions');
 assert.equal(fresh.v,4);
 assert.equal(client.state.stale,false);
});

test('two racing reads keep the newer timestamp and no torn state', async()=>{
 const {createClient}=await import('../app/api.js');
 let now=0,calls=0;
 const gateA=defer(),gateB=defer();
 const client=createClient({now:()=>now,ttl:0,stale:10_000,fetcher:async u=>{
   calls++;
   if(calls===1){await gateA.promise;return new Response('{"v":"old"}',{headers:{Date:new Date(1_000).toUTCString()}});}
   await gateB.promise;
   return new Response('{"v":"new"}',{headers:{Date:new Date(2_000).toUTCString()}});
 }});
 const first=client.getWithMeta('/competitions/a');
 gateA.resolve();
 const firstResult=await first;
 assert.equal(firstResult.data.v,'old');
 const second=client.getWithMeta('/competitions/b');
 const third=client.getWithMeta('/competitions/b');
 gateB.resolve();
 const [secondResult,thirdResult]=await Promise.all([second,third]);
 assert.equal(calls,2,'one fetch per path in flight');
 assert.equal(secondResult.data.v,'new');
 assert.equal(thirdResult.data.v,'new');
 assert.equal(client.state.checkedAt,2_000,'the most recent successful stamp wins');
});

test('metadata reads for the board and detail share one freshness stamp source', async()=>{
 const {createClient}=await import('../app/api.js');
 let now=0;
 const client=createClient({now:()=>now,ttl:0,fetcher:async u=>{const stamp=now;return new Response(JSON.stringify({path:u.split('/api')[1]}),{headers:{Date:new Date(stamp).toUTCString()}});}});
 now=5_000;
 const board=await client.getWithMeta('/competitions?status=open');
 now=6_000;
 const detail=await client.getWithMeta('/competitions/one');
 assert.equal(board.at,5_000);
 assert.equal(detail.at,6_000);
 assert.ok(detail.at>board.at,'detail refresh carries a later stamp');
 assert.equal(client.state.checkedAt,6_000);
});
