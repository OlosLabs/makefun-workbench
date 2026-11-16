import {api} from './api.js';
import {text,array,segment,accepting,money,date,remaining,route,leaderboardRows,metric,safeURL} from './core.js';
import {el,link,button,markdown} from './dom.js';
const content=document.querySelector('#content');
let generation=0,board=[],cursor=null,compare=new Set(),currentRoute;
const readLocal=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
let saved=new Set(Array.isArray(readLocal('workbench-saved',[]))?readLocal('workbench-saved',[]).filter(segment):[]);
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('Local storage is unavailable in this browser.');}};
function notify(message){const n=document.querySelector('#toast');n.textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.textContent='',4500);}
function updateSaved(){document.querySelector('#saved-count').textContent=saved.size;}
function theme(value){document.documentElement.dataset.theme=value;document.querySelector('#theme').setAttribute('aria-pressed',String(value==='dark'));}
theme(readLocal('workbench-theme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
document.querySelector('#theme').onclick=()=>{const value=document.documentElement.dataset.theme==='dark'?'light':'dark';theme(value);store('workbench-theme',value);};
updateSaved();
document.querySelector('.skip').onclick=e=>{e.preventDefault();content.focus();};
const label=value=>el('span',{class:'eyebrow'},value);
const stat=(name,value)=>el('div',{class:'stat'},label(name),el('strong',{},value));
const status=b=>el('span',{class:'status '+(accepting(b)?'open':'closed')},accepting(b)?'Taking entries':b?.status==='open'?'Deadline passed':text(b?.status)||'Unknown status');
const bountyLink=b=>segment(b?.slug)?link(text(b.title)||b.slug,'#/bounty/'+b.slug):el('span',{},text(b?.title)||'Untitled bounty');
function saveButton(b){return button(saved.has(b.slug)?'★ Saved':'☆ Save',e=>{saved.has(b.slug)?saved.delete(b.slug):saved.add(b.slug);store('workbench-saved',[...saved]);updateSaved();e.currentTarget.textContent=saved.has(b.slug)?'★ Saved':'☆ Save';e.currentTarget.setAttribute('aria-pressed',String(saved.has(b.slug)));notify(saved.has(b.slug)?'Added to your shortlist':'Removed from your shortlist');},{class:'quiet', 'aria-label':'Save '+text(b.title),'aria-pressed':saved.has(b.slug)});}
function syncNote(){return el('div',{class:'sync '+(api.state.stale?'stale':''),role:'status'},el('span',{class:'dot'}),api.state.message,button('Refresh',()=>navigate(true),{class:'quiet'}));}
function crumb(items=[]){return el('nav',{'aria-label':'Breadcrumb',class:'crumb'},link('Board','#/'),...items.flatMap((x)=>[' / ',x]));}
function intro(kicker,title,description){return el('section',{class:'intro'},label(kicker),el('h1',{},title),el('p',{},description));}
function empty(title,detail){return el('div',{class:'empty'},el('h2',{},title),el('p',{},detail));}
function pageList(items,render,size=20){
 const box=el('div'),rows=el('div'),controls=el('div',{class:'pagination'});let page=0;
 function draw(){rows.replaceChildren(...items.slice(page*size,(page+1)*size).map(render));controls.replaceChildren(button('← Previous',()=>{page--;draw();},{disabled:page===0}),el('span',{},`${items.length? page*size+1:0}–${Math.min(items.length,(page+1)*size)} of ${items.length}`),button('Next →',()=>{page++;draw();},{disabled:(page+1)*size>=items.length}));}
 draw();box.append(rows,controls);return box;
}
function changeParams(values){const p=new URLSearchParams(currentRoute.params);for(const [k,v]of Object.entries(values))v?p.set(k,v):p.delete(k);location.hash='/?'+p.toString();}
function selectFilter(name,key,options){const select=el('select',{'aria-label':name,name:key},...options.map(([v,t])=>el('option',{value:v,selected:(currentRoute.params.get(key)||'')===v},t)));select.onchange=()=>changeParams({[key]:select.value,page:''});return el('label',{class:'filter'},label(name),select);}
function comparePanel(){
 const selected=board.filter(b=>compare.has(b.slug));const panel=el('section',{class:'comparison','aria-label':'Bounty comparison'});
 panel.append(el('div',{class:'section-title'},el('h2',{},'Side by side'),button('Clear',()=>{compare.clear();renderBoard();},{class:'quiet'})));
 if(selected.length<2)panel.append(el('p',{},'Choose 2–3 bounties to compare their pot, fee and deadline.'));
 else panel.append(el('div',{class:'compare-grid'},...selected.map(b=>el('article',{},label(b.category),el('h3',{},bountyLink(b)),stat('Live pot',money(b.potUsd??b.rewardAmount)),stat('Entry fee',Number(b.entryFeeUsd)>0?money(b.entryFeeUsd):'Free'),stat('Deadline',date(b.deadline)),status(b)))));
 return panel;
}
function card(b,index){
 const check=el('input',{type:'checkbox',checked:compare.has(b.slug),'aria-label':'Compare '+text(b.title)});
 check.onchange=()=>{if(check.checked&&compare.size>=3){check.checked=false;notify('Compare up to three bounties.');return;}check.checked?compare.add(b.slug):compare.delete(b.slug);document.querySelector('#compare-panel').replaceChildren(comparePanel());};
 return el('article',{class:'bounty-row'},el('div',{class:'row-index'},String(index+1).padStart(2,'0')),el('div',{class:'bounty-main'},el('div',{class:'row-top'},label(b.category||'Bounty'),status(b)),el('h2',{},bountyLink(b)),el('p',{class:'summary'},text(b.summary)||text(b.description).split('\n')[0]),el('div',{class:'row-bottom'},el('span',{},`${Number(b.submissionCount)||0} entries`),saveButton(b),el('label',{class:'check'},check,'Compare'))),el('div',{class:'bounty-numbers'},el('strong',{class:'pot'},money(b.potUsd??b.rewardAmount)),el('span',{class:'muted'},'live pot · USDC'),el('span',{class:'fee'},Number(b.entryFeeUsd)>0?money(b.entryFeeUsd)+' entry':'Free entry'),el('strong',{class:accepting(b)?'time':'muted'},remaining(b.deadline))));
}
function renderBoard(){
 const p=currentRoute.params,q=(p.get('q')||'').toLowerCase();let items=board.filter(b=>segment(b.slug));
 items=items.filter(b=>(!q||[b.title,b.summary,b.category,...(Array.isArray(b.skills)?b.skills:[])].join(' ').toLowerCase().includes(q))&&(!p.get('category')||b.category===p.get('category'))&&(!p.get('saved')||saved.has(b.slug))&&(!p.get('fee')||(p.get('fee')==='free'?!(Number(b.entryFeeUsd)>0):Number(b.entryFeeUsd)>0))&&(!p.get('deadline')||(p.get('deadline')==='open'?accepting(b):accepting(b)&&Date.parse(b.deadline)-Date.now()<=86400000)));
 const sort=p.get('sort')||'deadline';items.sort((a,b)=>sort==='pot'?Number(b.potUsd??b.rewardAmount)-Number(a.potUsd??a.rewardAmount):sort==='entries'?(Number(b.submissionCount)||0)-(Number(a.submissionCount)||0):sort==='newest'?Date.parse(b.publishedAt)-Date.parse(a.publishedAt):(Number(!accepting(a))-Number(!accepting(b))||Date.parse(a.deadline)-Date.parse(b.deadline)));
 const open=board.filter(b=>accepting(b)),total=open.reduce((s,b)=>s+(Number(b.potUsd??b.rewardAmount)||0),0);
 const search=el('input',{type:'search',placeholder:'Search bounties, skills, ideas…',value:p.get('q')||'','aria-label':'Search bounties',name:'q'});
 const form=el('form',{class:'search',onsubmit:e=>{e.preventDefault();changeParams({q:search.value,page:''});}},el('span',{'aria-hidden':'true'},'⌕'),search,button('Search',()=>changeParams({q:search.value,page:''}),{class:'quiet'}));
 const filters=el('div',{class:'filters'},selectFilter('Category','category',[['','All categories'],...['Code','Games','Growth','Trading','Forecasting','Security','Automation'].map(c=>[c,c])]),selectFilter('Entry fee','fee',[['','Any fee'],['free','Free entry'],['paid','Paid entry']]),selectFilter('Deadline','deadline',[['','All deadlines'],['open','Taking entries'],['24h','Next 24 hours']]),selectFilter('Sort by','sort',[['','Closing soon'],['pot','Largest pot'],['entries','Most entries'],['newest','Newest first']]));
 const ledger=el('section',{class:'ledger','aria-label':'Bounty board'},form,filters,el('div',{class:'section-title'},el('h2',{},p.get('saved')?'Your shortlist':'The bounty board'),el('span',{class:'muted'},`${items.length} in view`)));
 if(items.length){const n=Math.max(1,Math.min(Math.ceil(items.length/8),Number(p.get('page'))||1));ledger.append(...items.slice((n-1)*8,n*8).map((b,i)=>card(b,(n-1)*8+i)),el('div',{class:'pagination'},button('← Previous',()=>changeParams({page:String(n-1)}),{disabled:n===1}),el('span',{},`Page ${n} of ${Math.ceil(items.length/8)}`),button('Next →',()=>changeParams({page:String(n+1)}),{disabled:n*8>=items.length})));}else ledger.append(empty('Nothing on this page yet','Try another search or clear your filters.'),button('Clear filters',()=>location.hash='/'));
 if(cursor)ledger.append(button('Load more public bounties',async e=>{e.currentTarget.disabled=true;try{const d=await api.get('/competitions?status=open&activity=times&limit=50&cursor='+encodeURIComponent(cursor));board.push(...array(d.items));cursor=text(d.next_cursor)||null;renderBoard();}catch(err){notify(err.message);e.currentTarget.disabled=false;}}));
 const agenda=el('aside',{class:'agenda'},el('div',{class:'section-title'},el('h2',{},'On the clock'),el('span',{class:'accent'},'↗')),el('p',{class:'muted'},'Upcoming entry deadlines · UTC'),...open.sort((a,b)=>Date.parse(a.deadline)-Date.parse(b.deadline)).slice(0,6).map((b,i)=>el('article',{class:'agenda-item'},label(date(b.deadline)),el('h3',{},bountyLink(b)),el('div',{class:'row-top'},el('strong',{class:i===0?'accent':''},remaining(b.deadline)),el('span',{},money(b.potUsd??b.rewardAmount))))),el('div',{class:'desk-note'},label('A small reminder'),el('p',{},'Find your next good problem. Save a few, compare the details, then make something worth shipping.')));
 content.replaceChildren(intro('THE PUBLIC BUILDING DESK','Good problems. Real rewards.','Explore live bounties, keep an eye on the clock, and find your next thing to build.'),el('div',{class:'overview'},stat('Taking entries',String(open.length).padStart(2,'0')),stat('Live pots · in this loaded set',money(total)),stat('Your shortlist',String(saved.size).padStart(2,'0')),syncNote()),el('div',{class:'workbench'},ledger,agenda),el('div',{id:'compare-panel'},comparePanel()));
}
function detail(b){
 const rewards=array(b.rewardsNow).length?array(b.rewardsNow):Object.entries(b.rewards&&typeof b.rewards==='object'?b.rewards:{}).map(([place,amountUsd])=>({place,amountUsd}));
 const rewardTable=el('table',{},el('caption',{},'Rewards · current allocation'),el('thead',{},el('tr',{},...['Place','Base','Fee share','Reward'].map(t=>el('th',{scope:'col'},t)))),el('tbody',{},...rewards.map(r=>el('tr',{},el('th',{scope:'row'},text(r.place)),el('td',{},money(r.baseUsd??r.amountUsd)),el('td',{},money(r.feeShareUsd??0)),el('td',{},money(r.amountUsd))))));
 const summary=el('section',{class:'detail-hero'},label(b.category||'Bounty'),el('h1',{},text(b.title)||'Untitled bounty'),el('p',{class:'lead'},text(b.summary)),el('div',{class:'actions'},status(b),saveButton(b),link('View leaderboard →','#/leaderboard/'+b.slug,{class:'primary'})));
 const facts=el('aside',{class:'facts'},label('The opportunity'),el('strong',{class:'hero-pot'},money(b.potUsd??b.rewardAmount)),el('p',{class:'muted'},'Live pot · USDC'),el('dl',{},...Object.entries({'Base rewards':money(b.rewardAmount),'Entry fees added':money(b.entryFeesUsd),'Entry fee':Number(b.entryFeeUsd)>0?money(b.entryFeeUsd)+' per account':'Free','Entries':String(Number(b.submissionCount)||0),'Opens':date(b.opensAt||b.publishedAt),'Deadline':date(b.deadline),'Time left':remaining(b.deadline),'API status':text(b.status)||'Unknown'}).flatMap(([k,v])=>[el('dt',{},k),el('dd',{},v)])),link('Official bounty ↗','https://make.fun/bounty/'+b.slug,{class:'official'}));
 const tabs=el('nav',{class:'tabs','aria-label':'Bounty sections'},link('Overview','#/bounty/'+b.slug),link('Leaderboard ↗','#/leaderboard/'+b.slug));
 const description=el('section',{class:'document'},el('h2',{},'The brief'),markdown(b.description),el('details',{},el('summary',{},'Full competition rules'),text(b.rules)?markdown(b.rules):el('p',{},'See the official bounty for the published rules.')),el('details',{},el('summary',{},'Resolution & scoring'),markdown(b.resolution?.summary),el('ul',{},...(Array.isArray(b.resolution?.criteria)?b.resolution.criteria:[]).map(x=>el('li',{},text(x))))));
 return [crumb([text(b.category),text(b.title)]),syncNote(),el('div',{class:'detail-grid'},el('div',{},summary,tabs,description),el('div',{},facts,el('section',{class:'reward-table',tabindex:'0','aria-label':'Current reward allocation'},rewardTable)))];
}
function leaderboard(d){
 const rows=leaderboardRows(d),columns=array(d.columns).filter(c=>!c.hidden&&segment(c.key)),primary=columns.find(c=>c.key===d.rank_key)||columns[0];
 const shell=el('section',{class:'leader-shell'}),head=el('div',{class:'section-title'},el('h2',{},'Standings'),el('span',{class:'muted'},`${rows.length} returned rows · ${text(d.phase?.title)||'Public phase'}`));
 const chooser=el('select',{'aria-label':'Leaderboard view'},...(Array.isArray(d.views)?d.views:['performance']).filter(x=>['overall','performance','cost','efficiency'].includes(x)).map(v=>el('option',{value:v,selected:d.view===v},v)));
 chooser.onchange=()=>{location.hash='/leaderboard/'+currentRoute.id+'?view='+chooser.value;};head.append(chooser);
 const renderRow=r=>el('article',{class:'leader-row'},el('strong',{class:'rank'},r.rank==null?'—':String(r.rank).padStart(2,'0')),el('div',{class:'entrant'},segment(r.handle)?link('@'+r.handle,'#/profile/'+r.handle):el('span',{},text(r.handle)||'Anonymous'),el('p',{},text(r.title)||'Untitled entry'),el('span',{class:'muted'},r.house?'House entry':r.compact?'Compact public row':text(r.status))),el('div',{class:'score'},label(text(primary?.title)||'Score'),el('strong',{},metric(r,primary)),r.interval?el('small',{},`${r.interval.level?Number(r.interval.level)*100:90}% interval: ${metric({values:{[primary?.key]:r.interval.low}},primary)} – ${metric({values:{[primary?.key]:r.interval.high}},primary)}`):null),el('details',{class:'row-metrics'},el('summary',{},'Metrics'),el('dl',{},...columns.flatMap(c=>[el('dt',{},text(c.title)),el('dd',{},metric(r,c))]))));
 shell.append(head,el('p',{class:'metric-note'},`${text(primary?.title)||'Score'} · ${primary?.sorting==='asc'?'Lower':'Higher'} is better. ${d.phase?.scores==='live'?'Live development standings are provisional.':''} ${d.metrics_withheld?'Some metrics are withheld by the API.':''}`),rows.length?pageList(rows,renderRow):empty('No public standings yet','Entries may still be running or scores may be withheld.'));
 return [crumb([link(text(d.competition?.title)||currentRoute.id,'#/bounty/'+currentRoute.id),'Leaderboard']),intro('THE FIELD',text(d.competition?.title)||'Leaderboard','Follow the builders, compare the metrics, and inspect the public standings.'),syncNote(),shell];
}
function profile(p){
 const record=p.record&&typeof p.record==='object'?p.record:{};
 const links=[];
 if(segment(p.github_login))links.push(link('GitHub ↗','https://github.com/'+p.github_login));
 for(const [name,value]of [['X',p.x?.url],['Discord',p.discord?.url],['Public wallet',p.wallet?.explorer_url]]){const url=safeURL(value);if(value&&url)links.push(link(name+' ↗',url,{rel:'noopener noreferrer'}));}
 const solutions=array(p.solutions);
 return [crumb(['Builders','@'+text(p.handle)]),intro('PUBLIC BUILDER',text(p.display_name)||'@'+text(p.handle),'Joined '+date(p.joined_at)),markdown(p.bio||'No public bio provided.'),el('div',{class:'profile-links'},links),el('div',{class:'overview'},stat('Bounties entered',text(record.competitions_entered)||'0'),stat('Wins',text(record.competitions_won)||'0'),stat('Placements',text(record.competitions_placed)||'0'),stat('Prizes paid',money(record.prize_usd))),syncNote(),el('section',{class:'solutions'},el('div',{class:'section-title'},el('h2',{},'Public work'),el('span',{},`${solutions.length} loaded solutions`)),solutions.length?pageList(solutions,s=>el('article',{class:'solution'},label(s.competition?.category||'Bounty'),el('h3',{},text(s.title)||'Untitled solution'),bountyLink(s.competition),el('div',{class:'row-bottom'},el('span',{},date(s.entered_at)),el('span',{},s.placement?'Place '+s.placement:'No final place'),el('strong',{},s.score?text(s.score.column?.title)+': '+metric({values:{[s.score.column?.key]:s.score.value},display:{[s.score.column?.key]:s.score.display}},s.score.column):'Score not public')))):empty('No public work yet','This builder has no public solutions in this response.'))];
}
async function navigate(force=false){
 const token=++generation;window.__shotReady=false;currentRoute=route(location.hash);document.title='make.fun Workbench';
 document.querySelector('#board-nav').setAttribute('aria-current',currentRoute.kind==='board'?'page':'false');
 if(currentRoute.kind==='invalid'){content.replaceChildren(empty('Page not found','That route is not a valid public workbench address.'),link('Back to board','#/'));window.__shotReady=true;return;}
 content.setAttribute('aria-busy','true');content.replaceChildren(el('div',{class:'loading',role:'status'},label('PUBLIC DATA'),el('h1',{},'Setting out the workbench…'),el('p',{},'Fetching the latest from make.fun.')));
 try{
  const r=currentRoute;let data;
  if(r.kind==='board'){data=await api.get('/competitions?status=open&activity=times&limit=50',{force});if(token!==generation)return;board=array(data.items);cursor=text(data.next_cursor)||null;renderBoard();}
  else{
   const path=r.kind==='profile'?'/profiles/'+r.id:r.kind==='leaderboard'?'/competitions/'+r.id+'/leaderboard?rows=first&ties=runs'+(['overall','performance','cost','efficiency'].includes(r.params.get('view'))?'&view='+r.params.get('view'):''):'/competitions/'+r.id+'?submissions=summary';
   data=await api.get(path,{force});if(token!==generation)return;
   if(r.kind==='bounty'&&!segment(data.slug))throw new Error('The bounty response is missing its public identifier.');
   if(r.kind==='profile'&&!segment(data.handle))throw new Error('The profile response is missing its public handle.');
   content.replaceChildren(...(r.kind==='bounty'?detail(data):r.kind==='leaderboard'?leaderboard(data):profile(data)));document.title=(text(data.title)||text(data.competition?.title)||text(data.handle))+' · Workbench';
  }
 }catch(error){if(token!==generation)return;content.replaceChildren(crumb(),empty('The desk is temporarily offline',error.message||'The public API could not be reached.'),button('Retry public data',()=>navigate(true),{class:'primary'}));}
 finally{if(token===generation){content.removeAttribute('aria-busy');window.__shotReady=true;}}
}
window.addEventListener('hashchange',()=>{navigate();});
window.addEventListener('online',()=>navigate(true));
navigate();
