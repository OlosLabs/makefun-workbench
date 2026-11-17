export const text = value => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
export const array = value => Array.isArray(value) ? value.filter(x => x && typeof x === 'object') : [];
export const segment = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
export function accepting(b, now = Date.now()) {
  const end = Date.parse(b?.deadline), start = Date.parse(b?.opensAt || b?.publishedAt);
  return b?.status === 'open' && Number.isFinite(end) && end > now && (!Number.isFinite(start) || start <= now);
}
export const money = value => value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value));
export function exactMoney(value) {
  if (value == null || value === '') return '—';
  const raw = text(value).trim();
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return money(Number(raw));
  return money(value);
}
export const date = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(value)) + ' UTC' : 'Not announced';
export const numeric = value => { const n = Number(value); return Number.isFinite(n) ? n : null; };
export const count = value => { const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0; };
export function remaining(value, now = Date.now()) {
  const ms = Date.parse(value)-now;
  if (!Number.isFinite(ms)) return 'No deadline';
  if (ms <= 0) return 'Entries closed';
  const h = Math.ceil(ms/3600000);
  return h >= 24 ? `${Math.floor(h/24)}d ${h%24}h left` : `${h}h left`;
}
export function relativeAge(at, now = Date.now(), max = 'about a day') {
  const a = Number(at), n = Number(now);
  if (!Number.isFinite(a) || !Number.isFinite(n)) return '';
  const sec = Math.max(0, Math.floor((n - a) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h ago`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}d ago`;
  return max;
}
export function relativeCooldown(ms, now = Date.now()) {
  const target = Number(ms), n = Number(now);
  if (!Number.isFinite(target)) return 'a moment';
  const sec = Math.max(0, Math.ceil((target - n) / 1000));
  if (sec < 1) return 'a moment';
  if (sec < 60) return `${sec} second${sec === 1 ? '' : 's'}`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m left`;
  const hour = Math.floor(min / 60);
  const left = min % 60;
  if (hour < 24) return `${hour}h${left ? ' ' + left + 'm' : ''} left`;
  const day = Math.floor(hour / 24);
  return `${day < 400 ? day + 'd' : '400d+'} left`;
}
export const clockOffset = (serverAt, localAt) => {
  const s = Number(serverAt), l = Number(localAt);
  return Number.isFinite(s) && Number.isFinite(l) ? s - l : 0;
};
// A Retry-After date is measured against the response's own Date header, never the client clock.
export function retryAfterMs(retry, responseDate, fallback = 30000) {
  const raw = text(retry).trim();
  if (!raw) return fallback;
  let delay = null;
  if (/^\d+(?:\.\d+)?$/.test(raw)) delay = Math.max(1000, Number(raw) * 1000);
  else {
    const target = Date.parse(raw), base = Date.parse(responseDate);
    if (Number.isFinite(target) && Number.isFinite(base)) delay = Math.max(1000, target - base);
  }
  return Number.isFinite(delay) ? delay : fallback;
}
export function safeURL(value) {
  if(!text(value).trim())return null;
  try { const u = new URL(text(value),'https://make.fun'); return ['https:','http:','mailto:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function route(hash) {
  const [path, query=''] = (hash || '#/').slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  if (!parts.length || (parts.length===1 && parts[0]==='board')) return {kind:'board',params:new URLSearchParams(query)};
  if (parts.length===2 && ['bounty','leaderboard','profile'].includes(parts[0]) && segment(parts[1])) return {kind:parts[0],id:parts[1],params:new URLSearchParams(query)};
  return {kind:'invalid',params:new URLSearchParams()};
}
export function leaderboardRows(data) {
  const key = text(data?.rank_key);
  return [...array(data?.entries), ...array(data?.rest).map(r=>({...r,values:{[key]:r.value},display:{[key]:r.display},compact:true}))];
}
export function metric(row,column) {
  const value = row?.values?.[column?.key];
  if (value == null) return '—';
  if (text(column?.source).endsWith('_micro') && /win_rate|interval/.test(text(column?.source))) return (Number(value)/10000).toFixed(2)+'%';
  return text(row?.display?.[column?.key]) || text(value) || '—';
}
export function columnList(data) {
  return array(data?.columns).filter(c => !c.hidden && segment(c?.key));
}
export function primaryColumn(data) {
  const columns = columnList(data);
  return columns.find(c => c.key === data?.rank_key) || columns[0] || null;
}
export function potOf(b) { const n = Number(b?.potUsd ?? b?.rewardAmount); return Number.isFinite(n) ? n : null; }
export function entryFeeOf(b) { const n = Number(b?.entryFeeUsd ?? 0); return Number.isFinite(n) ? n : 0; }
export const exactAmount = value => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
export function groupRewards(rewards) {
  const rows = array(rewards).map(r => ({
    place: text(r?.place),
    base: exactAmount(r?.baseUsd),
    feeShare: exactAmount(r?.feeShareUsd ?? 0),
    amount: exactAmount(r?.amountUsd),
    raw: r || {}
  })).filter(r => r.amount !== null || r.base !== null);
  const groups = [];
  let current = null;
  for (const row of rows) {
    const key = `${row.base}|${row.feeShare}|${row.amount}`;
    if (!current || current.key !== key) {
      current = {key, base: row.base, feeShare: row.feeShare, amount: row.amount, raw: row.raw, places: []};
      groups.push(current);
    }
    current.places.push(row.place);
  }
  return groups.map(g => ({...g, first: g.places[0], last: g.places[g.places.length-1], count: g.places.length}));
}
export function topFive(rows, limit = 5) {
  return [...array(rows)].sort((a,b)=>Number(a?.rank ?? Infinity)-Number(b?.rank ?? Infinity)).slice(0, limit);
}
export function mergeBoard(board, bounty, stamp = Date.now()) {
  const list = array(board), slug = text(bounty?.slug);
  if (!segment(slug)) return list;
  const index = list.findIndex(b => b.slug === slug);
  const stampValue = Number.isFinite(Number(stamp)) ? Number(stamp) : Date.now();
  const previous = index >= 0 ? list[index] : null;
  const merged = {...(previous || {}), ...bounty, slug, _updatedAt: stampValue};
  if (index < 0) return [...list, merged];
  const next = list.slice();
  next[index] = merged;
  return next;
}

export function filterBoard(board, params, saved = new Set()) {
  const get = key => (params?.get ? params.get(key) : '') || '';
  const q = get('q').toLowerCase();
  const category = get('category'), fee = get('fee'), deadline = get('deadline');
  const sort = get('sort') || 'deadline', dir = get('dir');
  const now = Date.now();
  let items = array(board).filter(b => segment(b?.slug));
  items = items.filter(b =>
    (!q || [b.title, b.summary, b.category, ...(Array.isArray(b.skills) ? b.skills : [])].join(' ').toLowerCase().includes(q)) &&
    (!category || b.category === category) &&
    (!get('saved') || saved.has(b.slug)) &&
    (!fee || (fee === 'free' ? !(entryFeeOf(b) > 0) : entryFeeOf(b) > 0)) &&
    (!deadline || (deadline === 'open' ? accepting(b, now) : accepting(b, now) && Date.parse(b.deadline) - now <= 86400000)));
  const compare = sort === 'pot'
    ? (a, b) => (potOf(b) ?? -Infinity) - (potOf(a) ?? -Infinity)
    : sort === 'entries'
      ? (a, b) => (Number(b.submissionCount) || 0) - (Number(a.submissionCount) || 0)
      : sort === 'newest'
        ? (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
        : (a, b) => (Number(!accepting(a, now)) - Number(!accepting(b, now)) || Date.parse(a.deadline) - Date.parse(b.deadline));
  items.sort(compare);
  if (dir === 'desc') items.reverse();
  else if (dir === 'asc' && (sort === 'pot' || sort === 'entries' || sort === 'newest')) items.reverse();
  return items;
}

export function slicePage(items, page, size = 8) {
  const list = array(items);
  const n = Math.max(1, Math.min(Math.ceil(list.length / size) || 1, Number(page) || 1));
  return list.slice((n - 1) * size, n * size);
}

