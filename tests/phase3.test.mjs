import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMockTest, mockTestWords, skillName, validateReply } from '../src/public/portal-utils.js';

const good = {
  date: '2026-10-28',
  result: 'fail',
  minors: '5',
  serious: '1',
  dangerous: '',
  faults: [
    { category: 'junctions', note: ' late observation at the give-way ' },
    { category: 'mirrors-signals-anticipation', note: 'no mirror before the signal' },
    { category: '', note: '' }
  ],
  feedback: 'Good control, work on observation.'
};

test('validateMockTest cleans a complete test', () => {
  const r = validateMockTest(good);
  assert.equal(r.ok, true);
  assert.equal(r.data.minors, 5);
  assert.equal(r.data.serious, 1);
  assert.equal(r.data.dangerous, 0, 'an empty count is zero');
  assert.equal(r.data.faults.length, 2, 'blank rows are dropped');
  assert.equal(r.data.faults[0].note, 'late observation at the give-way');
});

test('validateMockTest names what is wrong', () => {
  const r = validateMockTest({ date: 'soon', result: 'maybe', minors: '-1', serious: '100', dangerous: 'x', faults: [{ category: 'nope', note: 'a' }] });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['dangerous', 'date', 'faults', 'minors', 'result', 'serious']);
});

test('mockTestWords and skillName read naturally', () => {
  assert.equal(mockTestWords({ minors: 5, serious: 1, dangerous: 0 }), '5 minors, 1 serious, 0 dangerous');
  assert.equal(mockTestWords({ minors: 1 }), '1 minor, 0 serious, 0 dangerous');
  assert.equal(skillName('junctions'), 'Junctions');
  assert.equal(skillName('unknown'), 'unknown');
});

test('validateReply trims and refuses empty replies', () => {
  assert.equal(validateReply('  Yes, Wednesday afternoon works. ').reply, 'Yes, Wednesday afternoon works.');
  assert.equal(validateReply(' ').ok, false);
});
