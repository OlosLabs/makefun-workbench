export const text = value => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
export const array = value => Array.isArray(value) ? value.filter(x => x && typeof x === 'object') : [];
export const segment = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
export function accepting(b, now = Date.now()) {
  const end = Date.parse(b?.deadline), start = Date.parse(b?.opensAt || b?.publishedAt);
  return b?.status === 'open' && Number.isFinite(end) && end > now && (!Number.isFinite(start) || start <= now);
}
export const money = value => value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value));
export const date = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(value)) + ' UTC' : 'Not announced';
export function remaining(value, now = Date.now()) {
  const ms = Date.parse(value)-now;
  if (!Number.isFinite(ms)) return 'No deadline';
  if (ms <= 0) return 'Entries closed';
  const h = Math.ceil(ms/3600000);
  return h >= 24 ? `${Math.floor(h/24)}d ${h%24}h left` : `${h}h left`;
}
export function safeURL(value) {
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
  if (text(column?.source).endsWith('_micro') && /win_rate|interval/.test(text(column?.source))) return `${(Number(value)/10000).toFixed(2)}%`;
  return text(row?.display?.[column?.key]) || text(value) || '—';
}
