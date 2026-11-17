export function createClient({fetcher=globalThis.fetch,now=Date.now,ttl=30000,stale=900000,max=40}={}) {
  const cache=new Map(), pending=new Map(), cooldown=new Map();
  const listeners=new Set();
  let state={stale:false,message:'Live public data',checkedAt:null,lastError:null};
  const notify=()=>listeners.forEach(fn=>fn(state));
  function request(path,{force=false}={}) {
    if (!/^\/(competitions|profiles)(?:[/?]|$)/.test(path) || path.includes('..')) return Promise.reject(new Error('Invalid API path'));
    if (pending.has(path)) return pending.get(path);
    const old=cache.get(path), time=now();
    if(!force && old && time-old.at<ttl){state={stale:false,message:'Cached · recently checked',checkedAt:old.serverAt,lastError:null};return Promise.resolve({data:old.data,at:old.serverAt,status:200,cached:true});}
    const task=Promise.resolve().then(async()=>{
      try {
        const until=cooldown.get(path)||0;
        if(until>now()) throw new Error(`Please retry after ${new Date(until).toLocaleTimeString()}`);
        const response=await fetcher('https://make.fun/api'+path,{method:'GET',credentials:'omit',headers:{Accept:'application/json',...(old?.etag?{'If-None-Match':old.etag}:{})},signal:AbortSignal.timeout(15000)});
        if(response.status===304 && old){
          old.at=now();
          const serverAt=Date.parse(response.headers.get('Date'));
          if(Number.isFinite(serverAt)) old.serverAt=serverAt;
          state={stale:false,message:'Live · unchanged (304)',checkedAt:old.serverAt,lastError:null};
          return {data:old.data,at:old.serverAt,status:304,cached:false};
        }
        if(response.status===429 || response.status===503){
          const retry=response.headers.get('Retry-After');
          const delay=retry && /^\d+(\.\d+)?$/.test(retry)?Number(retry)*1000:Date.parse(retry)-now();
          const until=now()+(Number.isFinite(delay)?Math.max(1000,delay):30000);cooldown.set(path,until);
          throw new Error(`${response.status===429?'Rate limited':'Service temporarily unavailable'}. Retry after ${new Date(until).toLocaleTimeString()}`);
        }
        if(!response.ok) throw new Error(`Public API returned ${response.status}`);
        const data=await response.json();
        if(data===null || typeof data!=='object') throw new Error('Public API returned malformed data');
        const serverAt=Date.parse(response.headers.get('Date'));
        const stamp=Number.isFinite(serverAt)?serverAt:now();
        if(old && Number.isFinite(old.serverAt) && stamp<old.serverAt){
          // An older publication must never replace newer cached data.
          old.at=now();
          state={stale:false,message:'Live · kept newer data',checkedAt:old.serverAt,lastError:null};
          return {data:old.data,at:old.serverAt,status:response.status,cached:true,superseded:true};
        }
        const entry={data,etag:response.headers.get('ETag'),at:now(),serverAt:stamp};
        cache.delete(path);cache.set(path,entry);
        while(cache.size>max) cache.delete(cache.keys().next().value);
        state={stale:false,message:'Live · checked '+new Date(entry.serverAt).toLocaleTimeString(),checkedAt:entry.serverAt,lastError:null};
        return {data,at:entry.serverAt,status:response.status,cached:false};
      } catch(error) {
        if(old && now()-old.at<=stale){state={stale:true,message:'Saved data · '+error.message,checkedAt:old.serverAt,lastError:error.message};return {data:old.data,at:old.serverAt,status:200,cached:true,stale:true};}
        throw error;
      } finally {pending.delete(path);notify();}
    });
    pending.set(path,task);return task;
  }
  return {get:(path,options)=>request(path,options).then(r=>r.data),getWithMeta:request,get state(){return state;},get size(){return cache.size;},subscribe(fn){listeners.add(fn);return ()=>{listeners.delete(fn);}}};
}
export const api=createClient();
