import test from 'node:test';
import assert from 'node:assert/strict';

test('expired open bounty never accepts entries', async () => {
  const { accepting } = await import('../app/core.js');
  assert.equal(accepting({status:'open',deadline:'2020-01-01'}), false);
  assert.equal(accepting({status:'open',deadline:'2099-01-01'}), true);
  assert.equal(accepting({status:'open',deadline:null}), false);
});
