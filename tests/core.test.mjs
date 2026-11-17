import test from 'node:test';
import assert from 'node:assert/strict';

test('expired open bounty never accepts entries', async () => {
  const { accepting } = await import('../app/core.js');
  assert.equal(accepting({status:'open',deadline:'2020-01-01'}), false);
  assert.equal(accepting({status:'open',deadline:'2099-01-01'}), true);
  assert.equal(accepting({status:'open',deadline:null}), false);
});

test('groupRewards merges only rows with identical base, fee share and total', async () => {
  const { groupRewards } = await import('../app/core.js');
  const groups = groupRewards([
    {place:1,baseUsd:'50.00',feeShareUsd:'0.00',amountUsd:'50.00'},
    {place:2,baseUsd:'35.00',feeShareUsd:'0.00',amountUsd:'35.00'},
    {place:3,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:4,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:5,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:6,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:7,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:8,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:9,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:10,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:11,baseUsd:'7.00',feeShareUsd:'0.00',amountUsd:'7.00'},
    {place:12,baseUsd:'7.00',feeShareUsd:'0.00',amountUsd:'7.00'}
  ]);
  assert.equal(groups.length, 4, 'four exact runs');
  assert.deepEqual(groups[2].places, ['3','4','5','6','7','8','9','10']);
  assert.equal(groups[2].first, '3');
  assert.equal(groups[2].last, '10');
  assert.equal(groups[2].count, 8);
  assert.deepEqual(groups[3].places, ['11','12']);
});

test('groupRewards never merges rows whose fee share or total differs', async () => {
  const { groupRewards } = await import('../app/core.js');
  const groups = groupRewards([
    {place:1,baseUsd:'10.00',feeShareUsd:'0.50',amountUsd:'10.50'},
    {place:2,baseUsd:'10.00',feeShareUsd:'0.75',amountUsd:'10.75'},
    {place:3,baseUsd:'10.00',feeShareUsd:'0.75',amountUsd:'10.75'}
  ]);
  assert.equal(groups.length, 2, 'different fee shares stay apart');
  assert.deepEqual(groups[1].places, ['2','3']);
  const totals = groupRewards([
    {place:1,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'10.00'},
    {place:2,baseUsd:'10.00',feeShareUsd:'0.00',amountUsd:'11.00'}
  ]);
  assert.equal(totals.length, 2, 'different totals stay apart');
});

test('groupRewards keeps single-place runs ungrouped and tolerates the rewards map', async () => {
  const { groupRewards } = await import('../app/core.js');
  const groups = groupRewards([{place:1,amountUsd:'100.50'}]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 1);
  assert.equal(groups[0].base, null, 'missing base stays null, not inferred');
  assert.equal(groups[0].feeShare, 0);
  assert.equal(groups[0].amount, 100.5);
});

test('groupRewards preserves supplied numeric values without rounding', async () => {
  const { groupRewards } = await import('../app/core.js');
  const groups = groupRewards([
    {place:1,baseUsd:'0.125',feeShareUsd:'0.005',amountUsd:'0.13'},
    {place:2,baseUsd:'0.125',feeShareUsd:'0.005',amountUsd:'0.13'}
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].base, 0.125);
  assert.equal(groups[0].feeShare, 0.005);
});

test('exactMoney keeps exact API amounts and never invents one', async () => {
  const { exactMoney, money } = await import('../app/core.js');
  assert.equal(exactMoney('725.50'), '$725.50');
  assert.equal(exactMoney('725.5'), '$725.50');
  assert.equal(exactMoney(725.5), '$725.50');
  assert.equal(exactMoney(null), '—');
  assert.equal(exactMoney(''), '—');
  assert.equal(money('725.50'), money(725.5), 'formatting agrees for the same amount');
});

test('topFive limits to the first five ranked rows in rank order', async () => {
  const { topFive, leaderboardRows } = await import('../app/core.js');
  const board = {rank_key:'judge',entries:[
    {rank:3,handle:'c',values:{judge:3}},
    {rank:1,handle:'a',values:{judge:1}},
    {rank:2,handle:'b',values:{judge:2}}
  ],rest:[{rank:5,handle:'e',value:5},{rank:4,handle:'d',value:4},{rank:6,handle:'f',value:6}]};
  const five = topFive(leaderboardRows(board), 5);
  assert.equal(five.length, 5);
  assert.deepEqual(five.map(r=>r.rank), [1,2,3,4,5]);
  assert.equal(topFive(leaderboardRows(board), 3).length, 3);
  assert.equal(topFive([], 5).length, 0);
});

test('potOf and entryFeeOf read the pot and fee without inventing values', async () => {
  const { potOf, entryFeeOf } = await import('../app/core.js');
  assert.equal(potOf({potUsd:'725.50'}), 725.5);
  assert.equal(potOf({rewardAmount:250}), 250);
  assert.equal(potOf({}), null);
  assert.equal(entryFeeOf({entryFeeUsd:null}), 0);
  assert.equal(entryFeeOf({entryFeeUsd:'0.50'}), 0.5);
  assert.equal(entryFeeOf({}), 0);
});

test('mergeBoard patches the cached board with fresh detail values', async () => {
  const { mergeBoard } = await import('../app/core.js');
  const cached = [{slug:'one',title:'One',potUsd:'725.50',submissionCount:4},{slug:'two',title:'Two',potUsd:'100'}];
  const merged = mergeBoard(cached, {slug:'one',potUsd:'725.50',entryFeeUsd:'0.50',submissionCount:9}, 1234);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].potUsd, '725.50');
  assert.equal(merged[0].entryFeeUsd, '0.50');
  assert.equal(merged[0].submissionCount, 9);
  assert.equal(merged[0]._updatedAt, 1234);
  assert.equal(merged[1].potUsd, '100', 'other rows untouched');
  assert.equal(cached[0].submissionCount, 4, 'input never mutated');
});

test('mergeBoard appends an unseen bounty and ignores malformed slugs', async () => {
  const { mergeBoard } = await import('../app/core.js');
  const next = mergeBoard([{slug:'one'}], {slug:'two',potUsd:'5'}, 1);
  assert.equal(next.length, 2);
  assert.equal(next[1].potUsd, '5');
  const same = mergeBoard([{slug:'one'}], {slug:'<script>',potUsd:'9'}, 2);
  assert.equal(same.length, 1);
});

test('filterBoard applies category, fee and deadline filters identically to the board', async () => {
  const { filterBoard } = await import('../app/core.js');
  const now = Date.now();
  const soon = new Date(now + 3600_000).toISOString(), far = new Date(now + 40 * 86400_000).toISOString();
  const board = [
    {slug:'a',title:'Alpha',category:'Code',status:'open',potUsd:'10',entryFeeUsd:null,deadline:soon,submissionCount:1},
    {slug:'b',title:'Beta',category:'Games',status:'open',potUsd:'20',entryFeeUsd:'0.50',deadline:far,submissionCount:2}
  ];
  const get = values => new URLSearchParams(values);
  assert.equal(filterBoard(board, get({})).length, 2);
  assert.deepEqual(filterBoard(board, get({category:'Code'})).map(b=>b.slug), ['a']);
  assert.deepEqual(filterBoard(board, get({fee:'free'})).map(b=>b.slug), ['a']);
  assert.deepEqual(filterBoard(board, get({fee:'paid'})).map(b=>b.slug), ['b']);
  assert.equal(filterBoard(board, new URLSearchParams('deadline=24h')).length, 1, 'next 24 hours only');
});

test('filterBoard sorts by pot, entries and honours explicit direction', async () => {
  const { filterBoard } = await import('../app/core.js');
  const board = [
    {slug:'a',potUsd:'10',submissionCount:5,deadline:'2099-01-01'},
    {slug:'b',potUsd:'90',submissionCount:1,deadline:'2099-02-01'},
    {slug:'c',potUsd:'50',submissionCount:9,deadline:'2099-03-01'}
  ];
  const slugs = values => filterBoard(board, new URLSearchParams(values)).map(b=>b.slug);
  assert.deepEqual(slugs('sort=pot'), ['b','c','a']);
  assert.deepEqual(slugs('sort=pot&dir=asc'), ['a','c','b']);
  assert.deepEqual(slugs('sort=entries'), ['c','a','b']);
  assert.deepEqual(slugs('sort=entries&dir=asc'), ['b','a','c']);
});

test('filterBoard keeps the shortlist filter URL-backed and stable', async () => {
  const { filterBoard } = await import('../app/core.js');
  const board = [{slug:'a'},{slug:'b'}];
  const saved = new Set(['b']);
  assert.deepEqual(filterBoard(board, new URLSearchParams('saved=1'), saved).map(x=>x.slug), ['b']);
});

test('slicePage returns eight rows and clamps out-of-range pages', async () => {
  const { slicePage } = await import('../app/core.js');
  const items = Array.from({length:20},(_,i)=>({slug:'s'+i}));
  assert.equal(slicePage(items,1).length, 8);
  assert.equal(slicePage(items,3).length, 4);
  assert.equal(slicePage(items,99).length, 4, 'past the last page clamps');
  assert.equal(slicePage(items,0).length, 8, 'page zero clamps to one');
  assert.equal(slicePage([],1).length, 0);
});
