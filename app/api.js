export function createClient({fetcher=globalThis.fetch,now=Date.now,ttl=30000,stale=900000,max=40}={}) {
 const cache=new Map(), pending=new Map(), cooldown=new Map();
 let state={stale:false,message:'Live public data'};
 function get(path,{force=false}={}) {
  if (!/^\/(competitions|profiles)(?:[/?]|$)/.test(path) || path.includes('..')) return Promise.reject(new Error('Invalid API path'));
  if(pending.has(path)) return pending.get(path);
  const old=cache.get(path), time=now();
  if(!force && old && time-old.at<ttl){state={stale:false,message:'Cached · recently checked'};return Promise.resolve(old.data);}
  const task=Promise.resolve().then(async()=>{
   try {
    const until=cooldown.get(path)||0;
    if(until>now()) throw new Error(`Please retry after ${new Date(until).toLocaleTimeString()}`);
    const response=await fetcher('https://make.fun/api'+path,{method:'GET',credentials:'omit',headers:{Accept:'application/json',...(old?.etag?{'If-None-Match':old.etag}:{})},signal:AbortSignal.timeout(15000)});
    if(response.status===304 && old){old.at=now();state={stale:false,message:'Live · unchanged (304)'};return old.data;}
    if(response.status===429 || response.status===503){
     const retry=response.headers.get('Retry-After');
     const delay=retry && /^\d+(\.\d+)?$/.test(retry)?Number(retry)*1000:Date.parse(retry)-now();
     const until=now()+(Number.isFinite(delay)?Math.max(1000,delay):30000);cooldown.set(path,until);
     throw new Error(`${response.status===429?'Rate limited':'Service temporarily unavailable'}. Retry after ${new Date(until).toLocaleTimeString()}`);
    }
    if(!response.ok) throw new Error(`Public API returned ${response.status}`);
    const data=await response.json();
    if(data===null || typeof data!=='object') throw new Error('Public API returned malformed data');
    cache.delete(path);cache.set(path,{data,etag:response.headers.get('ETag'),at:now()});
    while(cache.size>max) cache.delete(cache.keys().next().value);
    state={stale:false,message:'Live · checked '+new Date(now()).toLocaleTimeString()};return data;
   } catch(error) {
    if(old && now()-old.at<=stale){state={stale:true,message:'Saved data · '+error.message};return old.data;}
    throw error;
   } finally {pending.delete(path);}
  });pending.set(path,task);return task;
 }
 return {get,get state(){return state;},get size(){return cache.size;}};
}
export const api=createClient();
