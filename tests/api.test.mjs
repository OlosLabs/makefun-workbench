import test from 'node:test';
import assert from 'node:assert/strict';
test('GET client shares pending reads and conditionally revalidates 304', async()=>{
 const {createClient}=await import('../app/api.js'); let calls=0,headers;
 const client=createClient({ttl:0,fetcher:async(u,o)=>{calls++;headers=o.headers; await new Promise(r=>setTimeout(r,10)); return calls===1?new Response('{"items":[]}',{headers:{ETag:'"one"'}}):new Response(null,{status:304});}});
 const [a,b]=await Promise.all([client.get('/competitions'),client.get('/competitions')]); assert.deepEqual(a,b);assert.equal(calls,1);
 assert.deepEqual(await client.get('/competitions'),a);assert.equal(headers['If-None-Match'],'"one"');
});
