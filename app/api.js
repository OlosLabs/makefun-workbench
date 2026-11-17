import {segment,relativeAge,relativeCooldown,retryAfterMs} from './core.js';

const MAX_AGE=30000,STALE_AGE=900000,MAX_ENTRIES=40,MAX_PATH=200;
const isPlainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const isStamp=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=8.64e15;
const isRecord=value=>isPlainObject(value)&&Object.keys(value).length>0;

// A persisted entry is never trusted: shape, types and timestamps are validated
// before it can render, and any publication time in the future is rejected.
function validateEntry(path,entry){
  if(!isRecord(entry)||!isRecord(entry.data)||!Array.isArray(entry.tags))return null;
  if(entry.tags.some(t=>typeof t!=='string'||t.length>MAX_PATH))return null;
  if(!/^\/(competitions|profiles)(?:[/?]|$)/.test(path)||path.includes('..')||path.length>MAX_PATH)return null;
  if(!isStamp(entry.at)||!isStamp(entry.serverAt)||!isStamp(entry.savedAt))return null;
  if(entry.serverAt>Date.now()+60000)return null;
  if(typeof entry.etag!=='string')return null;
  return {path,data:entry.data,etag:entry.etag,at:entry.at,serverAt:entry.serverAt,savedAt:entry.savedAt,tags:entry.tags.slice(0,12)};
}

export function createClient({fetcher=globalThis.fetch,now=Date.now,ttl=MAX_AGE,stale=STALE_AGE,max=MAX_ENTRIES,storage=null,key='makefun-workbench-cache'}={}) {
  const memory=new Map(),pending=new Map(),cooldown=new Map();
  const listeners=new Set();
  let state={stale:false,message:'Live public data',checkedAt:null,lastError:null,cooldownUntil:null,cooldownRemaining:null};
  let hydrated=false,saveError=false,skew=readSkew();

  function readSkew(){
    try{
      const raw=storage?.getItem(key);
      if(typeof raw!=='string')return 0;
      const parsed=JSON.parse(raw);
      if(!isRecord(parsed)||!isStamp(parsed.serverNow)||!isStamp(parsed.localNow))return 0;
      const offset=parsed.serverNow-parsed.localNow;
      return Math.abs(offset)<=31536000000?offset:0;
    }catch{return 0;}
  }
  // The server Date header minus the client clock; applied only to age wording,
  // never to the data itself. A future publication is still rejected above.
  const skewAt=serverAt=>Number.isFinite(serverAt)?serverAt-skew:null;
  function persist(){
    if(hydrated||!storage)return;
    try{
      const record={serverNow:now()+skew,localNow:now(),entries:[]};
      for(const [path,entry] of memory){
        if(path.length>MAX_PATH)continue;
        record.entries.push({path,data:entry.data,etag:entry.etag,at:entry.at,serverAt:entry.serverAt,savedAt:entry.savedAt,tags:entry.tags});
      }
      storage.setItem(key,JSON.stringify(record));
      saveError=false;
    }catch{
      if(!saveError){saveError=true;notify();}
    }
  }
  function hydrateStore(){
    if(hydrated||!storage)return;
    hydrated=true;
    try{
      const raw=storage.getItem(key);
      if(typeof raw!=='string')return;
      const record=JSON.parse(raw);
      if(!isRecord(record)||!Array.isArray(record.entries))return;
      if(isStamp(record.serverNow)&&isStamp(record.localNow)){
        const offset=record.serverNow-record.localNow;
        if(Math.abs(offset)<=31536000000)skew=offset;
      }
      for(const candidate of record.entries){
        if(!isRecord(candidate)||typeof candidate.path!=='string')continue;
        const entry=validateEntry(candidate.path,candidate);
        if(entry&&!memory.has(entry.path))memory.set(entry.path,entry);
        while(memory.size>max)memory.delete(memory.keys().next().value);
      }
    }catch{}finally{hydrated=false;}
  }
  function notify(){listeners.forEach(fn=>fn(state));}
  function remember(path,entry){
    memory.delete(path);memory.set(path,entry);
    while(memory.size>max)memory.delete(memory.keys().next().value);
    persist();
  }
  function cooldownState(until){
    return {cooldownUntil:until||null,cooldownRemaining:until?Math.max(0,until-now()):null};
  }
  function request(path,{force=false}={}){
    if(!/^\/(competitions|profiles)(?:[/?]|$)/.test(path)||path.includes('..')||path.length>MAX_PATH)return Promise.reject(new Error('Invalid API path'));
    if(pending.has(path))return pending.get(path);
    hydrateStore();
    const old=memory.get(path),time=now();
    if(!force&&old&&time-old.at<ttl){
      state={stale:false,message:'Saved data · checked '+relativeAge(old.serverAt,now())+' ago',checkedAt:old.serverAt,lastError:null,...cooldownState(null)};
      notify();
      return Promise.resolve({data:old.data,at:old.serverAt,status:200,cached:true,savedAt:old.savedAt,stale:false});
    }
    const task=Promise.resolve().then(async()=>{
      try{
        const until=cooldown.get(path)||0;
        if(until>now())throw new Error('retry after '+relativeCooldown(until,now()));
        const response=await fetcher('https://make.fun/api'+path,{method:'GET',credentials:'omit',headers:{Accept:'application/json',...(old?.etag?{'If-None-Match':old.etag}:{})},signal:AbortSignal.timeout(15000)});
        if(response.status===304&&old){
          old.at=now();
          const serverAt=Date.parse(response.headers.get('Date'));
          if(Number.isFinite(serverAt))old.serverAt=serverAt;
          remember(path,old);
          state={stale:false,message:'Live · unchanged (304)',checkedAt:old.serverAt,lastError:null,...cooldownState(null)};
          return {data:old.data,at:old.serverAt,status:304,cached:false,savedAt:old.savedAt,stale:false};
        }
        if(response.status===429||response.status===503){
          const retry=response.headers.get('Retry-After');
          const delay=retryAfterMs(retry,response.headers.get('Date'),30000);
          const retryUntil=now()+delay;
          cooldown.set(path,retryUntil);
          state={stale:!!old,message:old?'Saved data · retry window honored':'Retry window active',checkedAt:old?.serverAt??null,lastError:'HTTP '+response.status+' · Retry-After '+String(retry||'')+' honored',...cooldownState(retryUntil)};
          if(old&&now()-old.at<=stale)return {data:old.data,at:old.serverAt,status:response.status,cached:true,savedAt:old.savedAt,stale:true,failed:true};
          throw new Error('HTTP '+response.status+' · Retry after '+relativeCooldown(retryUntil,now()));
        }
        if(!response.ok)throw new Error('Public API returned '+response.status);
        const data=await response.json();
        if(data===null||typeof data!=='object')throw new Error('Public API returned malformed data');
        const serverAt=Date.parse(response.headers.get('Date'));
        const stamp=Number.isFinite(serverAt)?serverAt:now();
        if(old&&Number.isFinite(old.serverAt)&&stamp<old.serverAt){
          old.at=now();remember(path,old);
          state={stale:false,message:'Live · kept newer data',checkedAt:old.serverAt,lastError:null,...cooldownState(null)};
          return {data:old.data,at:old.serverAt,status:response.status,cached:true,savedAt:old.savedAt,stale:false,superseded:true};
        }
        const entry={data,etag:response.headers.get('ETag')||'',at:now(),serverAt:stamp,savedAt:stamp,tags:[path]};
        remember(path,entry);
        state={stale:false,message:'Live · checked '+new Date(stamp).toISOString().slice(11,16)+' UTC',checkedAt:entry.serverAt,lastError:null,...cooldownState(null)};
        return {data,at:entry.serverAt,status:response.status,cached:false,savedAt:entry.savedAt,stale:false};
      }catch(error){
        if(old&&now()-old.at<=stale){
          state={stale:true,message:'Saved data · '+relativeAge(old.savedAt,now())+' old · '+error.message,checkedAt:old.serverAt,lastError:error.message,...cooldownState(null)};
          return {data:old.data,at:old.serverAt,status:200,cached:true,savedAt:old.savedAt,stale:true,failed:true};
        }
        state={stale:false,message:'Live public data',checkedAt:old?.serverAt??null,lastError:error.message,...cooldownState(null)};
        throw error;
      }finally{pending.delete(path);notify();}
    });
    pending.set(path,task);
    return task;
  }
  return {
    get:(path,options)=>request(path,options).then(r=>r.data),
    getWithMeta:request,
    get state(){return state;},
    get size(){return memory.size;},
    get skew(){return skew;},
    skewAt,
    clear(){memory.clear();cooldown.clear();persist();notify();},
    subscribe(fn){listeners.add(fn);return ()=>{listeners.delete(fn);};}
  };
}
let publicStorage=null;
try{publicStorage=globalThis.localStorage;if(publicStorage&&publicStorage.getItem('workbench-cache-version')!=='clean-5'){publicStorage.removeItem('makefun-workbench-cache');publicStorage.setItem('workbench-cache-version','clean-5');}}catch{}
export const api=createClient({storage:publicStorage});
