import {api} from './api.js';
import {text,array,segment,accepting,money,date,remaining,route,leaderboardRows,metric,safeURL,potOf,entryFeeOf,groupRewards,topFive,mergeBoard,filterBoard,slicePage} from './core.js';
import {el,link,button,markdown} from './dom.js';

const content=document.querySelector('#content');
let generation=0,board=[],cursor=null,compare=new Set(),currentRoute;
const readLocal=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
let saved=new Set(Array.isArray(readLocal('workbench-saved',[]))?readLocal('workbench-saved',[]).filter(segment):[]);
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('Local storage is unavailable in this browser.');}};
const expandedRewards=new Set();
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
function saveButton(b){return button(saved.has(b.slug)?'★ Saved':'☆ Save',e=>{saved.has(b.slug)?saved.delete(b.slug):saved.add(b.slug);store('workbench-saved',[...saved]);updateSaved();e.currentTarget.textContent=saved.has(b.slug)?'★ Saved':'☆ Save';e.currentTarget.setAttribute('aria-pressed',String(saved.has(b.slug)));notify(saved.has(b.slug)?'Added to your shortlist':'Removed from your shortlist');},{class:'quiet','aria-label':'Save '+text(b.title),'aria-pressed':saved.has(b.slug)});}
function syncNote(){return el('div',{class:'sync '+(api.state.stale?'stale':''),role:'status'},el('span',{class:'dot'}),api.state.message,button('Refresh',()=>navigate(true),{class:'quiet'}));}
function crumb(items=[]){return el('nav',{'aria-label':'Breadcrumb',class:'crumb'},link('Board','#/'),...items.flatMap((x)=>[' / ',x]));}
function empty(title,detail){return el('div',{class:'empty'},el('h2',{},title),el('p',{},detail));}
function pageList(items,render,size=20){
 const box=el('div'),rows=el('div'),controls=el('div',{class:'pagination'});let page=0;
 function draw(){rows.replaceChildren(...items.slice(page*size,(page+1)*size).map(render));controls.replaceChildren(button('← Previous',()=>{page--;draw();},{disabled:page===0}),el('span',{},`${items.length? page*size+1:0}–${Math.min(items.length,(page+1)*size)} of ${items.length}`),button('Next →',()=>{page++;draw();},{disabled:(page+1)*size>=items.length}));}
 draw();box.append(rows,controls);return box;
}
const boardKeys=['q','category','fee','deadline','sort','dir','saved'];
function boardQuery(){const p=new URLSearchParams();for(const k of boardKeys){const v=currentRoute.params.get(k);if(v)p.set(k,v);}return p.toString();}
function boardHref(slug){const q=boardQuery();return '#/'+(slug?'bounty/'+slug:'')+(q?'?'+q:'');}
function changeParams(values){const p=new URLSearchParams(currentRoute.params);for(const [k,v]of Object.entries(values))v?p.set(k,v):p.delete(k);p.delete('tab');location.hash='/?'+p.toString();}
function changeDetailParams(values){const p=new URLSearchParams(currentRoute.params);for(const [k,v]of Object.entries(values))v?p.set(k,v):p.delete(k);location.hash='/bounty/'+currentRoute.id+'?'+p.toString();}
function selectFilter(name,key,options,apply=changeParams){const select=el('select',{'aria-label':name,name:key},...options.map(([v,t])=>el('option',{value:v,selected:(currentRoute.params.get(key)||'')===v},t)));select.onchange=()=>apply({[key]:select.value,page:''});return el('label',{class:'filter'},label(name),select);}
function filterControls(apply){
 return el('div',{class:'filters'},
  selectFilter('Category','category',[['','All categories'],...['Code','Games','Growth','Trading','Forecasting','Security','Automation'].map(c=>[c,c])],apply),
  selectFilter('Entry fee','fee',[['','Any fee'],['free','Free entry'],['paid','Paid entry']],apply),
  selectFilter('Deadline','deadline',[['','All deadlines'],['open','Taking entries'],['24h','Next 24 hours']],apply),
  selectFilter('Sort by','sort',[['','Closing soon'],['pot','Largest pot'],['entries','Most entries'],['newest','Newest first']],apply),
  selectFilter('Order','dir',[['','Default'],['asc','Ascending'],['desc','Descending']],apply));
}
function comparePanel(){
 const selected=board.filter(b=>compare.has(b.slug));const panel=el('section',{class:'comparison','aria-label':'Bounty comparison'});
 panel.append(el('div',{class:'section-title'},el('h2',{},'Side by side'),button('Clear',()=>{compare.clear();renderBoard();},{class:'quiet'})));
 if(selected.length<2)panel.append(el('p',{},'Choose 2–3 bounties to compare their pot, fee and deadline.'));
 else panel.append(el('div',{class:'compare-grid'},...selected.map(b=>el('article',{},label(b.category),el('h3',{},bountyLink(b)),stat('Live pot',money(potOf(b))),stat('Entry fee',entryFeeOf(b)>0?money(entryFeeOf(b)):'Free'),stat('Deadline',date(b.deadline)+' · '+remaining(b.deadline)),status(b)))));
 return panel;
}
function tableRow(b,index){
 const check=el('input',{type:'checkbox',checked:compare.has(b.slug),'aria-label':'Compare '+text(b.title)});
 check.onchange=()=>{if(check.checked&&compare.size>=3){check.checked=false;notify('Compare up to three bounties.');return;}check.checked?compare.add(b.slug):compare.delete(b.slug);document.querySelector('#compare-panel').replaceChildren(comparePanel());};
 const brief=text(b.summary)||text(b.description).split('\n')[0];
 return el('tr',{class:'bounty-row'},
  el('th',{scope:'row',class:'bounty-main'},el('span',{class:'row-index'},String(index+1).padStart(2,'0')),el('h2',{},bountyLink(b)),el('p',{class:'brief'},brief||'No summary supplied')),
  el('td',{class:'num pot','data-label':'Pot'},money(potOf(b))),
  el('td',{class:'fee','data-label':'Fee'},entryFeeOf(b)>0?money(entryFeeOf(b)):'Free entry'),
  el('td',{class:'deadline','data-label':'Deadline'},el('span',{class:'utc'},date(b.deadline)),el('span',{class:accepting(b)?'time':'muted'},remaining(b.deadline))),
  el('td',{class:'num entries','data-label':'Entries'},String(Number(b.submissionCount)||0)),
  el('td',{class:'row-actions','data-label':'Save'},saveButton(b),el('label',{class:'check'},check,'Compare')));
}
function boardTable(items,pageIndex,size){
 return el('div',{class:'board-table',tabindex:'0',role:'region','aria-label':'Bounty table'},
  el('table',{},
   el('caption',{class:'sr-only'},'Open bounties with pot, entry fee, deadline, entries and save controls'),
   el('thead',{},el('tr',{},el('th',{scope:'col'},'Bounty'),el('th',{scope:'col',class:'num'},'Pot'),el('th',{scope:'col'},'Fee'),el('th',{scope:'col'},'Deadline · UTC'),el('th',{scope:'col',class:'num'},'Entries'),el('th',{scope:'col'},'Save · compare'))),
   el('tbody',{},...items.map((b,i)=>tableRow(b,pageIndex+i)))));
}
function renderBoard(){
 const p=currentRoute.params,size=8;
 const items=filterBoard(board,p,saved);
 const open=board.filter(b=>accepting(b)),total=open.reduce((s,b)=>s+(potOf(b)||0),0);
 const search=el('input',{type:'search',placeholder:'Search bounties, skills, ideas…',value:p.get('q')||'','aria-label':'Search bounties',name:'q'});
 const form=el('form',{class:'search',onsubmit:e=>{e.preventDefault();changeParams({q:search.value,page:''});}},el('span',{'aria-hidden':'true'},'⌕'),search,button('Search',()=>changeParams({q:search.value,page:''}),{class:'quiet'}));
 const ledger=el('section',{class:'ledger','aria-label':'Bounty board'},form,filterControls(changeParams),el('div',{class:'section-title'},el('h2',{},p.get('saved')?'Your shortlist':'The bounty board'),el('span',{class:'muted'},`${items.length} in view`)));
 if(items.length){const n=Math.max(1,Math.min(Math.ceil(items.length/size),Number(p.get('page'))||1));ledger.append(boardTable(slicePage(items,n,size),(n-1)*size),el('div',{class:'pagination'},button('← Previous',()=>changeParams({page:String(n-1)}),{disabled:n===1}),el('span',{},`Page ${n} of ${Math.ceil(items.length/size)} · ${size} rows`),button('Next →',()=>changeParams({page:String(n+1)}),{disabled:n*size>=items.length})));}
 else ledger.append(empty('Nothing on this page yet','Try another search or clear your filters.'),button('Clear filters',()=>location.hash='/'));
 if(cursor)ledger.append(button('Load more public bounties',async e=>{e.currentTarget.disabled=true;try{const d=await api.get('/competitions?status=open&activity=times&limit=50&cursor='+encodeURIComponent(cursor));board.push(...array(d.items));cursor=text(d.next_cursor)||null;renderBoard();}catch(err){notify(err.message);e.currentTarget.disabled=false;}}));
 const agenda=el('aside',{class:'agenda'},el('div',{class:'section-title'},el('h2',{},'On the clock'),el('span',{class:'accent'},'↗')),el('p',{class:'muted'},'Upcoming entry deadlines · UTC'),...open.sort((a,b)=>Date.parse(a.deadline)-Date.parse(b.deadline)).slice(0,6).map((b,i)=>el('article',{class:'agenda-item'},label(date(b.deadline)),el('h3',{},bountyLink(b)),el('div',{class:'row-top'},el('strong',{class:i===0?'accent':''},remaining(b.deadline)),el('span',{},money(potOf(b)))))),el('div',{class:'desk-note'},label('A small reminder'),el('p',{},'Find your next good problem. Save a few, compare the details, then make something worth shipping.')));
 content.replaceChildren(el('div',{class:'board-head'},el('h1',{},'Bounties'),el('p',{class:'muted'},`${open.length} taking entries · ${money(total)} live pots · ${saved.size} saved`),syncNote()),el('div',{class:'overview-strip'},el('span',{},`${items.length} in view`),el('span',{},'Public, read-only · UTC deadlines')),el('div',{class:'workbench'},ledger,agenda),el('div',{id:'compare-panel'},comparePanel()));
}
let boardURL='#/',activeBounty=null;
function publicImage(value,alt,className='artifact'){
 const url=safeURL(value);if(!url)return null;
 const u=new URL(url);if(u.origin!=='https://make.fun'||!/^\/api\/(avatars|submissions)\//.test(u.pathname))return null;
 return el('img',{crossorigin:'anonymous',loading:'lazy',decoding:'async',width:className==='avatar'?64:360,height:className==='avatar'?64:180,alt,class:className,referrerpolicy:'no-referrer',onerror:e=>e.currentTarget.remove(),src:url});
}
function artifacts(a){return el('div',{},...array(a?.images).slice(0,3).map((x,i)=>publicImage(x.preview_url||x.url,'Public artifact '+(i+1))),!array(a?.images).length?publicImage(a?.preview_url||a?.url,'Public artifact'):null);}
function sidebarPane(){
 const pane=el('aside',{class:'master','aria-label':'Persistent bounty board'},el('div',{class:'section-title'},el('h2',{},'Bounty board'),link('All ↗',boardURL)));
 const search=el('input',{type:'search','aria-label':'Find in persistent board',placeholder:'Find a bounty…'});
 pane.append(el('div',{class:'search'},search));
 const items=filterBoard(board,currentRoute.params,saved);
 const list=el('ol',{class:'master-list'});
 const draw=()=>{const q=search.value.toLowerCase();const rows=items.filter(b=>text(b.title).toLowerCase().includes(q));list.replaceChildren(...rows.map(b=>el('li',{},link([el('span',{class:'master-title'},text(b.title)||b.slug),el('span',{class:'master-meta'},`${money(potOf(b))} · ${entryFeeOf(b)>0?money(entryFeeOf(b)):'Free'} · ${Number(b.submissionCount)||0} entries`),el('span',{class:'master-meta'},date(b.deadline)+' · '+remaining(b.deadline))],boardHref(b.slug),{'aria-current':currentRoute.id===b.slug?'page':'false',class:'master-link'}))));if(!rows.length)list.replaceChildren(el('li',{class:'muted'},'No bounty matches this filter.'));};
 search.oninput=draw;draw();
 pane.append(el('div',{class:'master-filters'},filterControls(changeDetailParams)),el('p',{class:'muted master-count'},`${items.length} after filters · sorted ${currentRoute.params.get('sort')||'closing soon'}${currentRoute.params.get('dir')?' '+currentRoute.params.get('dir'):''}`),list);
 return pane;
}
function showDetail(nodes){content.replaceChildren(el('div',{class:'master-detail'},sidebarPane(),el('section',{class:'detail-pane','aria-label':'Selected public view'},link('← Back to board',boardURL,{class:'back-board'}),...nodes)));}
function moneyFacts(b){
 const fee=entryFeeOf(b);
 return el('section',{class:'money-facts','aria-label':'Key figures'},
  el('div',{class:'hero-figure'},label('Live pot · USDC'),el('strong',{class:'hero-pot'},money(potOf(b))),status(b)),
  el('dl',{},
   ...Object.entries({'Base rewards':money(b.rewardAmount),'Entry fees added':money(b.entryFeesUsd??0),'Entry fee':fee>0?money(fee)+' per account':'Free','Entries':String(Number(b.submissionCount)||0),'Deadline':date(b.deadline),'Time left':remaining(b.deadline)}).flatMap(([k,v])=>[el('dt',{},k),el('dd',{},v)])));
}
function rewardTable(b,{compact=false}={}){
 const rewards=array(b.rewardsNow).length?array(b.rewardsNow):Object.entries(b.rewards&&typeof b.rewards==='object'?b.rewards:{}).map(([place,amountUsd])=>({place,amountUsd}));
 const groups=groupRewards(rewards);
 const all=[...groups].sort((x,y)=>Number(x.first)-Number(y.first));
 const expanded=expandedRewards.has(b.slug)||!compact||all.length<=3;
 const body=el('tbody');
 for(const g of all){
  if(!expanded&&g.count>1){
   body.append(el('tr',{class:'group'},el('th',{scope:'row'},`Places ${g.first}–${g.last}`),el('td',{},exactOrDash(g.base)),el('td',{},exactOrDash(g.feeShare)),el('td',{},exactOrDash(g.amount)),el('td',{class:'muted'},`${g.count} places`)));
  }else{
   for(const place of g.places)body.append(el('tr',{},el('th',{scope:'row'},place),el('td',{},exactOrDash(g.base)),el('td',{},exactOrDash(g.feeShare)),el('td',{},exactOrDash(g.amount)),el('td',{class:'muted'},g.count>1?'grouped':'')));
  }
 }
 const table=el('div',{class:'reward-table',tabindex:'0','aria-label':'Current reward allocation'},el('table',{},el('caption',{},compact?'Rewards · grouped by exact amount':'Rewards · current allocation'),el('thead',{},el('tr',{},...['Place','Base','Fee share','Reward','Note'].map(t=>el('th',{scope:'col'},t)))),body));
 if(!compact)return table;
 const toggle=button(expanded?'Collapse to groups':'Expand all '+rewards.length,()=>{expandedRewards.has(b.slug)?expandedRewards.delete(b.slug):expandedRewards.add(b.slug);navigate(false);},{class:'quiet','aria-expanded':String(expanded),'aria-controls':'reward-groups'});
 table.id='reward-groups';
 return el('section',{class:'rewards-compact'},el('div',{class:'section-title'},el('h2',{},'Rewards'),toggle),table,el('p',{class:'metric-note'},'Exact API values · consecutive rows grouped only when base, fee share and total all match.'));
}
const exactOrDash=value=>value==null?'—':money(value);
function topFivePanel(rows,b){
 const data=rows||{};
 const list=topFive(leaderboardRows(data),5);
 const columns=array(data.columns).filter(c=>!c.hidden&&segment(c.key));
 const primary=columns.find(c=>c.key===data.rank_key)||columns[0];
 const section=el('section',{class:'top-five','aria-label':'Live top five'},el('div',{class:'section-title'},el('h2',{},'Live top five'),link('Standings →','#/leaderboard/'+b.slug)));
 if(!list.length){section.append(el('p',{class:'muted pad'},'No public standings yet. Entries may still be running or scores may be withheld.'));return section;}
 section.append(el('ol',{class:'top-list'},...list.map(r=>{
  const prize=array(b.rewardsNow).find(a=>Number(a.place)===Number(r.prize_rank))?.amountUsd;
  return el('li',{},el('span',{class:'top-rank'},String(r.rank??'—').padStart(2,'0')),(segment(r.handle)?link('@'+r.handle,'#/profile/'+r.handle):el('span',{},text(r.handle)||'Anonymous')),el('span',{class:'top-metric'},label(text(primary?.title)||'Score'),el('strong',{},metric(r,primary))),el('span',{class:'top-prize'},label('Projected prize'),el('strong',{},money(prize))));
 })));
 section.append(el('p',{class:'metric-note'},`Top 5 of ${Number(data.total??leaderboardRows(data).length)||list.length} public rows · ${text(primary?.title)||'Score'} · ${primary?.sorting==='asc'?'Lower':'Higher'} is better.`));
 return section;
}
function detail(b,standings,liveTop){
 activeBounty=b;
 const rewards=array(b.rewardsNow).length?array(b.rewardsNow):Object.entries(b.rewards&&typeof b.rewards==='object'?b.rewards:{}).map(([place,amountUsd])=>({place,amountUsd}));
 const summary=el('section',{class:'detail-hero'},label(b.category||'Bounty'),el('h1',{},text(b.title)||'Untitled bounty'),el('p',{class:'lead'},text(b.summary)),el('div',{class:'actions'},status(b),saveButton(b),link('View leaderboard →','#/leaderboard/'+b.slug,{class:'primary'}),safeURL(b.url)?link('Official bounty ↗','https://make.fun/bounty/'+b.slug,{class:'official'}):null));
 const tab=['overview','rules','rewards','entries','standings'].includes(currentRoute.params.get('tab'))?currentRoute.params.get('tab'):'overview';
 const tabs=el('nav',{class:'tabs','aria-label':'Bounty sections'},...['Overview','Rules','Rewards','Entries','Standings'].map((name,i)=>link(['◉ ','☷ ','◇ ','▤ ','▥ '][i]+name,'#/bounty/'+b.slug+'?tab='+name.toLowerCase(),{'aria-current':tab===name.toLowerCase()?'page':'false'})));
 const description=el('section',{class:'document','aria-label':tab+' content'});
 if(tab==='overview')description.append(el('h2',{},'About this bounty'),markdown(b.description),el('div',{class:'tags'},...(Array.isArray(b.skills)?b.skills:[]).map(s=>el('span',{class:'tag'},text(s)))),el('h2',{},'Resolution & scoring'),markdown(b.resolution?.summary));
 if(tab==='rules')description.append(el('h2',{},'Competition rules'),text(b.rules)?markdown(b.rules):el('p',{},'The API provides these resolution criteria.'),el('ol',{},...(Array.isArray(b.resolution?.criteria)?b.resolution.criteria:[]).map(x=>el('li',{},markdown(x)))),...['source','verifier','announce','tieBreak'].filter(k=>text(b.resolution?.[k])).map(k=>el('section',{},el('h3',{},({source:'Source',verifier:'Verification',announce:'Announcement',tieBreak:'Tie break'})[k]),markdown(b.resolution[k]))));
 if(tab==='rewards'){const table=rewardTable({...b},{});description.append(el('h2',{},'Projected reward allocation'),el('p',{},'Current allocations can change before final resolution. These amounts are not paid prizes.'),table,el('p',{},'Base rewards plus the current fee share, exactly as returned by make.fun.'));}
 if(tab==='entries'){const rows=leaderboardRows(standings);description.append(el('h2',{},'Public entries'),el('p',{class:'muted'},`${rows.length} returned public rows. Previews appear only when supplied by the API.`),rows.length?pageList(rows,r=>el('article',{class:'solution'},segment(r.handle)?link('@'+r.handle,'#/profile/'+r.handle):text(r.handle),el('h3',{},text(r.title)),el('p',{class:'muted'},[text(r.status),r.received_at?date(r.received_at):'',r.source_withheld?'Source withheld':''].filter(Boolean).join(' · ')),artifacts(r.judge?.artifact))):empty('No public entries returned','Public entry metadata may not be available yet.'));}
 if(tab==='standings')description.append(...leaderboard(standings,b).slice(-1));
 const facts=el('aside',{class:'facts'},label('The opportunity'),el('dl',{},...Object.entries({'Live pot':money(potOf(b)),'Base rewards':money(b.rewardAmount),'Entry fees added':money(b.entryFeesUsd??0),'Entry fee':entryFeeOf(b)>0?money(entryFeeOf(b))+' per account':'Free','Entries':String(Number(b.submissionCount)||0),'Opens':date(b.opensAt||b.publishedAt),'Deadline':date(b.deadline),'Time left':remaining(b.deadline),'API status':text(b.status)||'Unknown'}).flatMap(([k,v])=>[el('dt',{},k),el('dd',{},v)])),link('Official bounty ↗','https://make.fun/bounty/'+b.slug,{class:'official'}));
 facts.prepend(el('h2',{},'About'),el('p',{},text(b.sponsor?.name)||'Sponsor not provided'),el('div',{class:'tags'},...(Array.isArray(b.skills)?b.skills:[]).map(s=>el('span',{class:'tag'},text(s)))));
 facts.append(el('h3',{},'Requirements'),el('p',{class:'muted'},text(b.prerequisites?.label)||'Not provided'),el('p',{class:'muted'},text(b.prerequisites?.summary)),el('h3',{},'Public escrow'),el('p',{class:'muted'},text(b.escrowLifecycle?.state)||'Not provided'),el('p',{class:'muted'},b.escrowLock?`${money(b.escrowLock.amount_usd)} locked · ${text(b.escrowLock.cluster)}`:''),safeURL(b.escrowLock?.explorer?.escrow)?link('Inspect escrow ↗',safeURL(b.escrowLock.explorer.escrow),{rel:'noopener noreferrer'}):null);
 const overview=tab==='overview'?el('div',{class:'overview-grid'},el('div',{},moneyFacts(b),rewardTable(b,{compact:true})),topFivePanel(liveTop,b)):null;
 return [crumb([text(b.category),text(b.title)]),syncNote(),el('div',{class:'detail-grid'},el('div',{},summary,overview,tabs,description),tab==='rewards'?null:el('div',{class:'detail-aside'},facts))];
}
function leaderboard(d,b=activeBounty){
 d=d||{};
 const rows=leaderboardRows(d),columns=array(d.columns).filter(c=>!c.hidden&&segment(c.key)),primary=columns.find(c=>c.key===d.rank_key)||columns[0];
 const shell=el('section',{class:'leader-shell'}),head=el('div',{class:'section-title'},el('h2',{},'Standings'),el('span',{class:'muted'},`${rows.length} returned rows · ${text(d.phase?.title)||'Public phase'}`));
 const chooser=el('select',{'aria-label':'Leaderboard view'},...(Array.isArray(d.views)?d.views:['performance']).filter(x=>['overall','performance','cost','efficiency'].includes(x)).map(v=>el('option',{value:v,selected:d.view===v},v)));
 chooser.onchange=()=>{location.hash='/leaderboard/'+currentRoute.id+'?view='+chooser.value;};head.append(chooser);
 const renderRow=r=>el('article',{class:'leader-row'},el('strong',{class:'rank'},r.rank==null?'—':String(r.rank).padStart(2,'0')),el('div',{class:'entrant'},segment(r.handle)?link('@'+r.handle,'#/profile/'+r.handle):el('span',{},text(r.handle)||'Anonymous'),el('p',{},text(r.title)||'Untitled entry'),el('span',{class:'muted'},r.house?'House entry':r.compact?'Compact public row':text(r.status))),el('div',{class:'score'},label(text(primary?.title)||'Score'),el('strong',{},metric(r,primary)),r.interval?el('small',{},`${r.interval.level?Number(r.interval.level)*100:90}% interval: ${metric({values:{[primary?.key]:r.interval.low}},primary)} – ${metric({values:{[primary?.key]:r.interval.high}},primary)}`):null),el('div',{class:'row-metrics'},el('span',{class:'pill'},r.compliant===true?'Valid':r.compliant===false?'Invalid':'Validity not provided'),el('span',{class:'muted'},r.judge?` · ${text(r.judge.wins)||'—'}W / ${text(r.judge.draws)||'—'}D / ${text(r.judge.losses)||'—'}L${r.judge.provisional?' · Provisional':''}`:''),el('p',{},'Projected award: ',money(array(b?.rewardsNow).find(a=>Number(a.place)===Number(r.prize_rank))?.amountUsd)),r.rank_range?el('p',{class:'muted'},`Statistical rank range ${text(r.rank_range.best)}–${text(r.rank_range.worst)}; ordinal place remains ${text(r.rank)}.`):null,el('details',{},el('summary',{},'Metrics'),el('dl',{},...columns.flatMap(c=>[el('dt',{},text(c.title)),el('dd',{},metric(r,c))])))));
 shell.append(head,el('p',{class:'metric-note'},`${text(primary?.title)||'Score'} · ${primary?.sorting==='asc'?'Lower':'Higher'} is better. ${d.phase?.scores==='live'?'Live development standings are provisional.':''} ${d.metrics_withheld?'Some metrics are withheld by the API.':''}`),rows.length?pageList(rows,renderRow):empty('No public standings yet','Entries may still be running or scores may be withheld.'));
 return [crumb([link(text(d.competition?.title)||currentRoute.id,'#/bounty/'+currentRoute.id),'Leaderboard']),el('h1',{},'Leaderboard · '+(text(d.competition?.title)||'Public phase')),syncNote(),shell];
}
function profile(p){
 const record=p.record&&typeof p.record==='object'?p.record:{};
 const links=[];
 if(segment(p.github_login))links.push(link('GitHub ↗','https://github.com/'+p.github_login));
 for(const [name,value]of [['X',p.x?.url],['Discord',p.discord?.url],['Public wallet',p.wallet?.explorer_url]]){const url=safeURL(value);if(value&&url)links.push(link(name+' ↗',url,{rel:'noopener noreferrer'}));}
 const solutions=array(p.solutions);
 return [crumb(['Builders','@'+text(p.handle)]),el('div',{class:'profile-identity'},publicImage(p.avatar||p.image,'Avatar for @'+text(p.handle),'avatar'),el('div',{},label('@'+text(p.handle)),el('h1',{},text(p.display_name)||'@'+text(p.handle)),el('p',{class:'muted'},'Joined '+date(p.joined_at)))),markdown(p.bio||'No public bio provided.'),el('div',{class:'profile-links'},links),el('div',{class:'overview'},stat('Bounties entered',text(record.competitions_entered)||'—'),stat('Wins',text(record.competitions_won)||'—'),stat('Placements',text(record.competitions_placed)||'—'),stat('Prizes paid',money(record.prize_usd))),syncNote(),el('section',{class:'solutions'},el('div',{class:'section-title'},el('h2',{},'Public work'),el('span',{},`${solutions.length} loaded solutions`)),solutions.length?pageList(solutions,s=>el('article',{class:'solution'},label(s.competition?.category||'Bounty'),el('h3',{},text(s.title)||'Untitled solution'),bountyLink(s.competition),el('div',{class:'row-bottom'},el('span',{},date(s.entered_at)),el('span',{},s.placement?'Place '+s.placement:'No final place'),el('strong',{},s.score?text(s.score.column?.title)+': '+metric({values:{[s.score.column?.key]:s.score.value},display:{[s.score.column?.key]:s.score.display}},s.score.column):'Score not public')),artifacts(s.artifact))):empty('No public work yet','This builder has no public solutions in this response.'))];
}
async function navigate(force=false){
 const token=++generation;window.__shotReady=false;currentRoute=route(location.hash);document.title='make.fun Workbench';
 boardURL=boardHref('');
 document.querySelector('#board-nav').setAttribute('aria-current',currentRoute.kind==='board'?'page':'false');
 if(currentRoute.kind==='invalid'){content.replaceChildren(empty('Page not found','That route is not a valid public workbench address.'),link('Back to board','#/'));window.__renderedHash=location.hash;window.__shotReady=true;return;}
 content.setAttribute('aria-busy','true');if(currentRoute.kind==='board'||!content.querySelector('.master-detail'))content.replaceChildren(el('div',{class:'loading',role:'status'},label('PUBLIC DATA'),el('h1',{},'Setting out the workbench…'),el('p',{},'Fetching the latest from make.fun.')));
 try{
  const r=currentRoute;let data;
  if(r.kind==='board'){const result=await api.getWithMeta('/competitions?status=open&activity=times&limit=50',{force});if(token!==generation)return;board=array(result.data.items);cursor=text(result.data.next_cursor)||null;renderBoard();}
  else{
   const path=r.kind==='profile'?'/profiles/'+r.id:r.kind==='leaderboard'?'/competitions/'+r.id+'/leaderboard?rows=first&ties=runs'+(['overall','performance','cost','efficiency'].includes(r.params.get('view'))?'&view='+r.params.get('view'):''):'/competitions/'+r.id+'?submissions=summary';
   const [result,list]=await Promise.all([api.getWithMeta(path,{force}),board.length?Promise.resolve(null):api.getWithMeta('/competitions?status=open&activity=times&limit=50',{force}).catch(()=>null)]);
   data=result.data;if(token!==generation)return;
   if(list)board=array(list.data.items);
   let standings=null,bounty=null,liveTop=null;
   if(r.kind==='leaderboard'){bounty=await api.get('/competitions/'+r.id+'?submissions=summary',{force}).catch(()=>null);activeBounty=bounty;}
   if(r.kind==='bounty'){
    if(r.params.get('tab')==='overview'||!r.params.get('tab'))liveTop=await api.get('/competitions/'+r.id+'/leaderboard?rows=first&ties=runs&limit=5',{force}).catch(()=>null);
    if(['entries','standings'].includes(r.params.get('tab')))standings=await api.get('/competitions/'+r.id+'/leaderboard?rows=first&ties=runs',{force});
   }
   if(token!==generation)return;
   if(r.kind==='bounty'&&!segment(data.slug))throw new Error('The bounty response is missing its public identifier.');
   if(r.kind==='profile'&&!segment(data.handle))throw new Error('The profile response is missing its public handle.');
   if(r.kind==='bounty')board=mergeBoard(board,data,result.at);
   const focusLabel=document.activeElement?.closest('.tabs a')?.textContent;
   showDetail(r.kind==='bounty'?detail(data,standings,liveTop):r.kind==='leaderboard'?leaderboard(data,bounty):profile(data));
   if(focusLabel)[...content.querySelectorAll('.tabs a')].find(a=>a.textContent===focusLabel)?.focus();
   document.title=(text(data.title)||text(data.competition?.title)||text(data.handle))+' · Workbench';
  }
 }catch(error){if(token!==generation)return;content.replaceChildren(crumb(),empty('The desk is temporarily offline',error.message||'The public API could not be reached.'),button('Retry public data',()=>navigate(true),{class:'primary'}));}
 finally{if(token===generation){content.removeAttribute('aria-busy');window.__renderedHash=location.hash;window.__shotReady=true;}}
}
window.addEventListener('hashchange',()=>{navigate();});
window.addEventListener('online',()=>navigate(true));
navigate();
